import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { readExtras } from "./admin";
import { BAG_SCAN_MODEL } from "./bagScan";
import { ApiError } from "./errors";
import { SUBMISSION_PROCESSES } from "./submissions";
import type { PhotoStore } from "./suggestionPhotos";

// The admin's work queue: what waits for review (suggestions) and published coffees
// missing details, counted, grouped by roaster, and served one card at a time.
// Suggestions for the missing details are read from the coffee's own description
// by Claude (text only; photos are never touched), and nothing is saved until the
// admin taps one.

/** photos: every published coffee, for going over the pictures roaster by roaster. */
export const QUEUE_KINDS = ["pending", "incomplete", "photos"] as const;
export type QueueKind = (typeof QUEUE_KINDS)[number];
export type Missing = "origin" | "process" | "notes" | "photo";

/** A blend's origin is stored as XB; a process nobody named is OTHER. */
const BLEND = "XB";

export interface QueueCounts {
  pending: number;
  incomplete: number;
  noOrigin: number;
  noProcess: number;
  noNotes: number;
  noPhoto: number;
  reports: number;
  /** Published coffees (the photo review covers all of them). */
  published: number;
}

/** Words that name a blend: its «مزيج» origin is right, not missing. */
const BLEND_WORDS = ["مزيج", "خلطة", "خليط", "بلند", "blend"];
const BLEND_NAME = new RegExp(BLEND_WORDS.join("|"), "i");

/** A coffee filed as a blend that really is one (by name, or a mixed process). */
export function isBlend(c: { name?: string | null; nameEn?: string | null; process?: string | null }): boolean {
  return c.process === "MIXED" || BLEND_NAME.test(`${c.name ?? ""} ${c.nameEn ?? ""}`);
}

/** «مزيج» as an origin is missing only on a coffee that isn't a blend. */
const UNKNOWN_ORIGIN: Prisma.CoffeeLotWhereInput = {
  originCountry: { isoCode: BLEND },
  NOT: {
    OR: [
      { process: "MIXED" },
      ...BLEND_WORDS.flatMap((w) => [
        { nameAr: { contains: w, mode: "insensitive" as const } }, { name: { contains: w, mode: "insensitive" as const } },
      ]),
    ],
  },
};

const INCOMPLETE_LOT: Prisma.CoffeeLotWhereInput = {
  publishedAt: { not: null },
  OR: [UNKNOWN_ORIGIN, { process: "OTHER" }, { flavorNotes: { isEmpty: true } }],
};

export async function queueCounts(prisma: PrismaClient): Promise<QueueCounts> {
  const published = { publishedAt: { not: null } };
  const [pending, incomplete, noOrigin, noProcess, noNotes, noPhoto, reports, publishedCount] = await Promise.all([
    prisma.mobileCoffeeSubmission.count({ where: { status: "PENDING" } }),
    prisma.coffeeLot.count({ where: INCOMPLETE_LOT }),
    prisma.coffeeLot.count({ where: { ...published, ...UNKNOWN_ORIGIN } }),
    prisma.coffeeLot.count({ where: { ...published, process: "OTHER" } }),
    prisma.coffeeLot.count({ where: { ...published, flavorNotes: { isEmpty: true } } }),
    prisma.coffeeLot.count({ where: { ...published, imageUrl: null } }),
    prisma.mobileReport.count({ where: { status: "open" } }),
    prisma.coffeeLot.count({ where: published }),
  ]);
  return { pending, incomplete, noOrigin, noProcess, noNotes, noPhoto, reports, published: publishedCount };
}

export interface QueueCard {
  kind: "submission" | "lot";
  id: string;
  name: string;
  nameEn: string | null;
  roasterName: string;
  roasterNameEn: string | null;
  imageUrl: string | null;
  /** A suggestion whose photo was edited or deleted, with its original kept to restore. */
  hasOriginalPhoto: boolean;
  originName: string | null;
  originCode: string | null;
  process: string | null;
  roastLevel: string | null;
  flavorNotes: string[];
  descriptionAr: string | null;
  sourceUrl: string | null;
  missing: Missing[];
}

export interface RoasterGroup {
  roaster: string;
  count: number;
  noOrigin: number;
  noProcess: number;
  noNotes: number;
  noPhoto: number;
  /** A bag from this roaster, for the row's picture. */
  imageUrl: string | null;
}

function missingOf(c: {
  originCode: string | null; originName: string | null; process: string | null; flavorNotes: string[]; hasPhoto: boolean; blend: boolean;
}): Missing[] {
  const out: Missing[] = [];
  const blendOrigin = c.originCode === BLEND || c.originName === "مزيج";
  if (!c.originName || (blendOrigin && !c.blend)) out.push("origin");
  if (!c.process || c.process === "OTHER") out.push("process");
  if (c.flavorNotes.length === 0) out.push("notes");
  if (!c.hasPhoto) out.push("photo");
  return out;
}

const LOT_SELECT = {
  id: true, nameAr: true, name: true, imageUrl: true, process: true, roastLevel: true, flavorNotes: true, descriptionAr: true,
  roaster: { select: { nameAr: true, name: true } }, originCountry: { select: { isoCode: true, nameAr: true } },
} as const;

type LotRow = {
  id: string; nameAr: string; name: string; imageUrl: string | null; process: string; roastLevel: string | null; flavorNotes: string[];
  descriptionAr: string | null; roaster: { nameAr: string; name: string } | null; originCountry: { isoCode: string; nameAr: string } | null;
};

function lotCard(l: LotRow): QueueCard {
  const card = {
    kind: "lot" as const, id: l.id, name: l.nameAr, nameEn: l.name, roasterName: l.roaster?.nameAr ?? "",
    roasterNameEn: l.roaster?.name || null, imageUrl: l.imageUrl, hasOriginalPhoto: false, originName: l.originCountry?.nameAr ?? null, originCode: l.originCountry?.isoCode ?? null,
    process: l.process, roastLevel: l.roastLevel, flavorNotes: l.flavorNotes, descriptionAr: l.descriptionAr, sourceUrl: null,
  };
  return { ...card, missing: missingOf({ ...card, hasPhoto: !!l.imageUrl, blend: isBlend({ name: l.nameAr, nameEn: l.name, process: l.process }) }) };
}

type SubmissionRow = {
  id: string; name: string; nameEn: string | null; roasterName: string; roasterNameEn: string | null; originName: string | null; process: string | null;
  roastLevel: string | null; flavorNotes: string[]; photoPath: string | null; sourceUrl: string | null; extras: unknown;
};

async function submissionCard(s: SubmissionRow, store: PhotoStore | null): Promise<QueueCard> {
  const extras = readExtras(s.extras);
  const card = {
    kind: "submission" as const, id: s.id, name: s.name, nameEn: s.nameEn, roasterName: s.roasterName, roasterNameEn: s.roasterNameEn,
    imageUrl: s.photoPath && store ? await store.signedUrl(s.photoPath).catch(() => null) : null,
    hasOriginalPhoto: typeof (s.extras as { originalPhotoPath?: unknown } | null)?.originalPhotoPath === "string",
    originName: s.originName, originCode: null, process: s.process, roastLevel: s.roastLevel, flavorNotes: s.flavorNotes,
    descriptionAr: extras.descriptionAr ?? null, sourceUrl: s.sourceUrl,
  };
  return { ...card, missing: missingOf({ ...card, hasPhoto: !!s.photoPath, blend: isBlend({ name: s.name, nameEn: s.nameEn, process: s.process }) }) };
}

function group(cards: { roaster: string; missing: Missing[]; imageUrl: string | null }[]): RoasterGroup[] {
  const by = new Map<string, RoasterGroup>();
  for (const c of cards) {
    const g = by.get(c.roaster) ?? { roaster: c.roaster, count: 0, noOrigin: 0, noProcess: 0, noNotes: 0, noPhoto: 0, imageUrl: null };
    g.count += 1;
    if (c.missing.includes("origin")) g.noOrigin += 1;
    if (c.missing.includes("process")) g.noProcess += 1;
    if (c.missing.includes("notes")) g.noNotes += 1;
    if (c.missing.includes("photo")) g.noPhoto += 1;
    g.imageUrl ??= c.imageUrl;
    by.set(c.roaster, g);
  }
  return [...by.values()].sort((a, b) => b.count - a.count || a.roaster.localeCompare(b.roaster, "ar"));
}

/** What waits, roaster by roaster; for suggestions, one photo signed per roaster (not hundreds). */
export async function queueRoasters(prisma: PrismaClient, kind: QueueKind, store: PhotoStore | null = null): Promise<RoasterGroup[]> {
  if (kind === "pending") {
    const rows = await prisma.mobileCoffeeSubmission.findMany({
      where: { status: "PENDING" },
      select: { roasterName: true, name: true, nameEn: true, originName: true, process: true, flavorNotes: true, photoPath: true },
    });
    const groups = group(rows.map((r) => ({
      roaster: r.roasterName, imageUrl: null,
      missing: missingOf({
        originCode: null, originName: r.originName, process: r.process, flavorNotes: r.flavorNotes, hasPhoto: !!r.photoPath,
        blend: isBlend({ name: r.name, nameEn: r.nameEn, process: r.process }),
      }),
    })));
    if (!store) return groups;
    const photoOf = new Map<string, string>();
    for (const r of rows) if (r.photoPath && !photoOf.has(r.roasterName)) photoOf.set(r.roasterName, r.photoPath);
    await Promise.all(groups.map(async (g) => {
      const path = photoOf.get(g.roaster);
      if (path) g.imageUrl = await store.signedUrl(path).catch(() => null);
    }));
    return groups;
  }
  const where = kind === "photos" ? { publishedAt: { not: null } } : INCOMPLETE_LOT;
  const lots = await prisma.coffeeLot.findMany({ where, select: LOT_SELECT });
  return group(lots.map((l) => {
    const c = lotCard(l as unknown as LotRow);
    return { roaster: c.roasterName, missing: c.missing, imageUrl: c.imageUrl };
  }));
}

/** The cards of one roaster (or every roaster when none is given), oldest first. */
export async function queueItems(
  prisma: PrismaClient, store: PhotoStore | null, kind: QueueKind, roaster: string | null,
): Promise<QueueCard[]> {
  if (kind === "pending") {
    const rows = await prisma.mobileCoffeeSubmission.findMany({
      where: { status: "PENDING", ...(roaster ? { roasterName: roaster } : {}) }, orderBy: { createdAt: "asc" }, take: 100,
    });
    return Promise.all(rows.map((r) => submissionCard(r as unknown as SubmissionRow, store)));
  }
  const photos = kind === "photos";
  const lots = await prisma.coffeeLot.findMany({
    where: { ...(photos ? { publishedAt: { not: null } } : INCOMPLETE_LOT), ...(roaster ? { roaster: { nameAr: roaster } } : {}) },
    orderBy: photos ? { nameAr: "asc" } : { createdAt: "asc" }, take: photos ? 300 : 100,
    select: LOT_SELECT,
  });
  // A published coffee's original photo is kept on the suggestion it came from.
  const originals = new Set((await prisma.mobileCoffeeSubmission.findMany({
    where: { approvedLotId: { in: lots.map((l) => l.id) } }, select: { approvedLotId: true, photoPath: true, extras: true },
  })).filter((s) => s.photoPath || typeof (s.extras as { originalPhotoPath?: unknown } | null)?.originalPhotoPath === "string")
    .map((s) => s.approvedLotId));
  return lots.map((l) => ({ ...lotCard(l as unknown as LotRow), hasOriginalPhoto: originals.has(l.id) }));
}

// MARK: Suggestions from the description

export interface DetailSuggestion {
  process: (typeof SUBMISSION_PROCESSES)[number] | null;
  originCode: string | null;
  originNameAr: string | null;
  flavorNotes: string[];
  roastLevel: "light" | "medium" | "dark" | null;
}

export interface DetailReader {
  /** `images`: JPEGs from the coffee's store page, whose printed text (a label, an info card) counts too. */
  read(text: string, images?: Buffer[]): Promise<DetailSuggestion>;
}

const SuggestionShape = z.object({
  process: z.enum(SUBMISSION_PROCESSES).nullable(),
  originCode: z.string().nullable(),
  originNameAr: z.string().nullable(),
  flavorNotes: z.array(z.string()),
  roastLevel: z.enum(["light", "medium", "dark"]).nullable(),
});

/** Claude reads the coffee's own words; it says null for anything they don't state. */
export function claudeDetailReader(apiKey: string): DetailReader {
  const client = new Anthropic({ apiKey });
  return {
    async read(text, images = []) {
      const response = await client.messages.parse({
        model: BAG_SCAN_MODEL,
        max_tokens: 1000,
        output_config: { effort: "low", format: zodOutputFormat(SuggestionShape) },
        system: `You read a specialty coffee's product text (Arabic, sometimes English) and pull out only what it states.
- process: NATURAL (مجففة/طبيعية), WASHED (مغسولة), HONEY (عسلية), ANAEROBIC (لاهوائية), CARBONIC_MACERATION (كربوني), WET_HULLED, EXPERIMENTAL (infused/co-ferment), MIXED (a blend of differently processed coffees, e.g. «مجفف ومغسول»), or null if the text doesn't say.
- originCode: the ISO 3166 two-letter code of the single growing country, originNameAr its Arabic name (e.g. ET / إثيوبيا). null for blends of several countries or when not stated. A Saudi-style roast is not a Saudi origin.
- flavorNotes: the tasting notes in Arabic, short (one to three words each), at most 6, in the text's order. Leave out body, acidity, sweetness levels and brewing advice.
- roastLevel: light, medium or dark only if the text says so (شقراء/فاتحة = light, متوسطة = medium, غامقة/داكنة = dark), else null.
Never guess from the coffee's name alone when the text is silent; null is the right answer then.
Photos from the coffee's store page may come with the text: read what is printed on them (an info card, the bag's label) and treat it like the text. They can also be unrelated (gift boxes, cups, certificates, brewing recipes, other coffees): ignore those. When the text and a photo disagree, prefer the photo of this coffee's own card or label.`,
        messages: [{
          role: "user",
          content: [
            ...images.map((b) => ({ type: "image" as const, source: { type: "base64" as const, media_type: "image/jpeg" as const, data: b.toString("base64") } })),
            { type: "text" as const, text: text.slice(0, 4000) },
          ],
        }],
      });
      const out = response.parsed_output;
      if (response.stop_reason === "refusal" || !out) throw new Error("suggest: no usable output");
      return out;
    },
  };
}

/** Cleans what the reader said: valid codes only, short notes, nothing invented for empty text. */
export function tidySuggestion(raw: DetailSuggestion): DetailSuggestion {
  const code = raw.originCode && /^[A-Za-z]{2}$/.test(raw.originCode) && raw.originCode.toUpperCase() !== BLEND ? raw.originCode.toUpperCase() : null;
  return {
    process: raw.process && (SUBMISSION_PROCESSES as readonly string[]).includes(raw.process) ? raw.process : null,
    originCode: code,
    originNameAr: code ? raw.originNameAr?.trim() || null : null,
    flavorNotes: [...new Set(raw.flavorNotes.map((n) => n.trim()).filter((n) => n.length > 1 && n.length <= 30))].slice(0, 6),
    roastLevel: raw.roastLevel,
  };
}

const EMPTY: DetailSuggestion = { process: null, originCode: null, originNameAr: null, flavorNotes: [], roastLevel: null };

/**
 * Suggestions for one card from its name, description and the photos on its store
 * page (where roasters often print the details); empty when there's nothing to read.
 */
export async function suggestDetails(
  prisma: PrismaClient, reader: DetailReader | null, kind: "submission" | "lot", id: string,
  images: (pageUrl: string) => Promise<Buffer[]> = async () => [],
): Promise<DetailSuggestion> {
  let name = "", description = "", sourceUrl: string | null = null;
  if (kind === "submission") {
    const s = await prisma.mobileCoffeeSubmission.findUnique({ where: { id }, select: { name: true, extras: true, note: true, sourceUrl: true } });
    if (!s) throw ApiError.unprocessable("submission_not_found");
    name = s.name;
    description = [readExtras(s.extras).descriptionAr, s.note].filter(Boolean).join("\n");
    sourceUrl = s.sourceUrl;
  } else {
    const l = await prisma.coffeeLot.findUnique({ where: { id }, select: { nameAr: true, descriptionAr: true } });
    if (!l) throw ApiError.unprocessable("lot_not_found");
    name = l.nameAr;
    description = l.descriptionAr ?? "";
    sourceUrl = (await prisma.mobileCoffeeSubmission.findFirst({ where: { approvedLotId: id }, select: { sourceUrl: true } }))?.sourceUrl ?? null;
  }
  if (!reader) return EMPTY;
  const photos = sourceUrl ? await images(sourceUrl).catch(() => []) : [];
  if (photos.length === 0 && description.trim().length < 15) return EMPTY;
  try {
    return tidySuggestion(await reader.read(`الاسم: ${name}\nالوصف: ${description || "(لا يوجد)"}`, photos));
  } catch {
    return EMPTY;
  }
}
