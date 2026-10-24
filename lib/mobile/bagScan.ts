import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { searchLots, type MobileLot } from "./catalog";
import { ApiError } from "./errors";

// AI bag scan: the app sends one photo of a coffee bag; Claude reads it and returns
// structured fields; we match them against published lots. The photo is never
// stored. Each account gets a daily limit, since every scan is a paid model call.

export const DAILY_SCAN_LIMIT = 30;
const MAX_IMAGE_BASE64 = 6_000_000; // ≈ 4.5 MB decoded; the app sends ~1600px JPEGs

export const BagScanRequest = z.object({
  imageBase64: z.string().min(100).max(MAX_IMAGE_BASE64),
  mediaType: z.enum(["image/jpeg", "image/png", "image/webp"]).default("image/jpeg"),
});
export type BagScanRequest = z.infer<typeof BagScanRequest>;

const PROCESS_CODES = [
  "NATURAL", "WASHED", "HONEY", "ANAEROBIC", "WET_HULLED", "CARBONIC_MACERATION", "EXPERIMENTAL", "OTHER",
] as const;
const BREW_CODES = ["ESPRESSO", "V60", "CHEMEX", "AEROPRESS", "FRENCH_PRESS", "COLD_BREW", "OTHER"] as const;

/** What Claude returns. Every field is nullable: only what is printed on the bag. */
export const BagExtraction = z.object({
  isCoffeeBag: z.boolean(),
  name: z.string().nullable(),
  nameAr: z.string().nullable(),
  roaster: z.string().nullable(),
  originCountry: z.string().nullable(),
  originCountryAr: z.string().nullable(),
  originCountryCode: z.string().nullable(),
  region: z.string().nullable(),
  farm: z.string().nullable(),
  producer: z.string().nullable(),
  varieties: z.array(z.string()),
  process: z.enum(PROCESS_CODES).nullable(),
  processLabel: z.string().nullable(),
  roastLevel: z.enum(["light", "medium", "dark"]).nullable(),
  roastDate: z.string().nullable(),
  altitudeMeters: z.number().nullable(),
  flavorNotesAr: z.array(z.string()),
  weightGrams: z.number().nullable(),
  recommendedBrewMethods: z.array(z.enum(BREW_CODES)),
  confidence: z.enum(["low", "medium", "high"]),
});
export type BagExtraction = z.infer<typeof BagExtraction>;

const SYSTEM_PROMPT = `You read photos of specialty coffee bags for BunnList, an Arabic coffee app.
Extract only what is printed or clearly shown on the bag; use null (or an empty list) for anything not visible. Do not guess from general coffee knowledge.
- name: the coffee's name as printed (often Latin script); nameAr: an Arabic name only if one is printed.
- roaster: the roastery's name as printed.
- originCountry in English, originCountryAr in Arabic, originCountryCode as ISO 3166-1 alpha-2.
- process: map the printed process to the closest code; keep the printed wording in processLabel.
- roastDate as YYYY-MM-DD only when a full date is printed.
- altitudeMeters: a single number; for a range, use its midpoint.
- flavorNotesAr: the printed tasting notes translated to short Arabic words (e.g. "Jasmine" -> "ياسمين").
- recommendedBrewMethods only when the bag names them.
- isCoffeeBag is false when the photo is not a coffee bag or label; then leave the rest empty.
- confidence: how legible and complete the label was.`;

/** Port for the model call, so the rest is testable without the network. */
export interface BagReader {
  read(image: BagScanRequest): Promise<BagExtraction>;
}

export function claudeBagReader(apiKey: string): BagReader {
  const client = new Anthropic({ apiKey });
  return {
    async read(image) {
      const response = await client.beta.messages.parse({
        model: "claude-opus-5-5",
        max_tokens: 4000,
        // Server-side fallback reruns the request on another model if this one declines.
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low", format: betaZodOutputFormat(BagExtraction) },
        system: SYSTEM_PROMPT,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.imageBase64 } },
            { type: "text", text: "Extract the fields from this coffee bag." },
          ],
        }],
      });
      if (response.stop_reason === "refusal" || !response.parsed_output) {
        throw ApiError.unprocessable("unreadable_image");
      }
      return response.parsed_output;
    },
  };
}

function clean(value: string | null): string | null {
  const v = value?.trim();
  return v ? v.slice(0, 120) : null;
}

/** Trims, de-duplicates and bounds the model's output before it reaches the app. */
export function normalizeExtraction(raw: BagExtraction): BagExtraction {
  const uniq = (xs: string[]) => [...new Set(xs.map((x) => x.trim()).filter(Boolean))].slice(0, 8);
  const altitude = raw.altitudeMeters && raw.altitudeMeters >= 300 && raw.altitudeMeters <= 3000
    ? Math.round(raw.altitudeMeters) : null;
  const weight = raw.weightGrams && raw.weightGrams > 0 && raw.weightGrams <= 5000 ? Math.round(raw.weightGrams) : null;
  const date = raw.roastDate && /^\d{4}-\d{2}-\d{2}$/.test(raw.roastDate) && !Number.isNaN(Date.parse(raw.roastDate))
    ? raw.roastDate : null;
  const code = raw.originCountryCode && /^[A-Za-z]{2}$/.test(raw.originCountryCode.trim())
    ? raw.originCountryCode.trim().toUpperCase() : null;
  return {
    ...raw,
    name: clean(raw.name),
    nameAr: clean(raw.nameAr),
    roaster: clean(raw.roaster),
    originCountry: clean(raw.originCountry),
    originCountryAr: clean(raw.originCountryAr),
    originCountryCode: code,
    region: clean(raw.region),
    farm: clean(raw.farm),
    producer: clean(raw.producer),
    varieties: uniq(raw.varieties),
    processLabel: clean(raw.processLabel),
    roastDate: date,
    altitudeMeters: altitude,
    flavorNotesAr: uniq(raw.flavorNotesAr),
    weightGrams: weight,
    recommendedBrewMethods: [...new Set(raw.recommendedBrewMethods)],
  };
}

/** Search terms to try, most specific first: the coffee's names, then the roaster. */
export function matchQueries(e: BagExtraction): string[] {
  const terms = [e.nameAr, e.name, e.roaster].filter((t): t is string => !!t && t.trim().length >= 2);
  return [...new Set(terms)];
}

/** Lots found by several terms rank first; a roaster-only hit ranks last. */
export function rankMatches(results: MobileLot[][], limit = 5): MobileLot[] {
  const score = new Map<string, { lot: MobileLot; hits: number; first: number }>();
  results.forEach((lots, termIndex) => {
    for (const lot of lots) {
      const entry = score.get(lot.id);
      if (entry) entry.hits += 1;
      else score.set(lot.id, { lot, hits: 1, first: termIndex });
    }
  });
  return [...score.values()]
    .sort((a, b) => b.hits - a.hits || a.first - b.first)
    .slice(0, limit)
    .map((e) => e.lot);
}

export interface BagScanResult {
  extraction: BagExtraction;
  matches: MobileLot[];
  remainingToday: number;
}

export async function scanBag(
  prisma: PrismaClient, reader: BagReader, accountId: string, image: BagScanRequest, now = new Date(),
): Promise<BagScanResult> {
  const since = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const used = await prisma.mobileAiScan.count({ where: { accountId, createdAt: { gte: since } } });
  if (used >= DAILY_SCAN_LIMIT) throw ApiError.rateLimited("daily_scan_limit");

  const extraction = normalizeExtraction(await reader.read(image));
  const matches = extraction.isCoffeeBag
    ? rankMatches(await Promise.all(matchQueries(extraction).map((q) => searchLots(prisma, q, 10))))
    : [];

  await prisma.mobileAiScan.create({
    data: { accountId, isCoffeeBag: extraction.isCoffeeBag, matchedCount: matches.length },
  });
  return { extraction, matches, remainingToday: Math.max(DAILY_SCAN_LIMIT - used - 1, 0) };
}
