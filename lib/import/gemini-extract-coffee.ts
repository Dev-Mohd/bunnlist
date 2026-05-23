import { z } from "zod";

const GEMINI_MODEL = "gemini-2.0-flash";
const GEMINI_TIMEOUT_MS = 18_000;
const IMAGE_TIMEOUT_MS = 8_000;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const geminiCoffeeSchema = z.object({
  coffeeName: z.string().nullable().default(null),
  roasteryName: z.string().nullable().default(null),
  originCountry: z.string().nullable().default(null),
  region: z.string().nullable().default(null),
  farm: z.string().nullable().default(null),
  producer: z.string().nullable().default(null),
  process: z.string().nullable().default(null),
  variety: z.array(z.string()).default([]),
  roastLevel: z.string().nullable().default(null),
  flavorNotes: z.array(z.string()).default([]),
  recommendedBrewMethods: z.array(z.string()).default([]),
  price: z.number().nullable().default(null),
  currency: z.string().nullable().default(null),
  weightGrams: z.number().int().nullable().default(null),
  availability: z.string().nullable().default(null),
  description: z.string().nullable().default(null),
  descriptionAr: z.string().nullable().default(null),
  imageUrl: z.string().nullable().default(null),
  sourceUrl: z.string(),
  confidence: z.number().min(0).max(1).default(0),
});

export type GeminiCoffeeExtraction = z.infer<typeof geminiCoffeeSchema>;

type ExtractWithGeminiInput = {
  pageUrl: string;
  pageTitle: string | null;
  visibleText: string;
  imageUrls: string[];
};

type InlineImage = {
  url: string;
  mimeType: string;
  base64: string;
};

function createTimeoutSignal(ms: number) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, clear: () => clearTimeout(timer) };
}

function cleanString(value: string | null | undefined, maxLength = 180) {
  const clean = value?.replace(/\s+/g, " ").trim();
  if (!clean) return null;
  return clean.slice(0, maxLength);
}

function cleanStringArray(values: string[], maxItems = 12) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const clean = cleanString(value, 80);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(clean);
    if (result.length >= maxItems) break;
  }

  return result;
}

function sanitizeExtraction(data: GeminiCoffeeExtraction): GeminiCoffeeExtraction {
  return {
    coffeeName: cleanString(data.coffeeName),
    roasteryName: cleanString(data.roasteryName),
    originCountry: cleanString(data.originCountry),
    region: cleanString(data.region),
    farm: cleanString(data.farm),
    producer: cleanString(data.producer),
    process: cleanString(data.process),
    variety: cleanStringArray(data.variety, 8),
    roastLevel: cleanString(data.roastLevel),
    flavorNotes: cleanStringArray(data.flavorNotes, 16),
    recommendedBrewMethods: cleanStringArray(data.recommendedBrewMethods, 8),
    price: data.price && Number.isFinite(data.price) && data.price > 0 ? data.price : null,
    currency: cleanString(data.currency, 12),
    weightGrams:
      data.weightGrams && Number.isFinite(data.weightGrams) && data.weightGrams > 0
        ? Math.round(data.weightGrams)
        : null,
    availability: cleanString(data.availability, 60),
    description: cleanString(data.description, 600),
    descriptionAr: cleanString(data.descriptionAr, 600),
    imageUrl: cleanString(data.imageUrl, 1000),
    sourceUrl: data.sourceUrl,
    confidence: Math.min(1, Math.max(0, data.confidence)),
  };
}

function parseJson(text: string) {
  const cleaned = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Gemini returned invalid JSON.");
    return JSON.parse(match[0]);
  }
}

async function fetchInlineImage(url: string): Promise<InlineImage | null> {
  const timeout = createTimeoutSignal(IMAGE_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "image/avif,image/webp,image/png,image/jpeg;q=0.9,*/*;q=0.8",
        "User-Agent": "BunnListImporter/1.0 (+admin import tool; respects robots.txt)",
      },
      signal: timeout.signal,
    });

    if (!response.ok) return null;

    const mimeType = response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() ?? "";
    if (!SUPPORTED_IMAGE_TYPES.has(mimeType)) return null;

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_IMAGE_BYTES) return null;

    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_IMAGE_BYTES) return null;

    return {
      url,
      mimeType,
      base64: Buffer.from(arrayBuffer).toString("base64"),
    };
  } catch {
    return null;
  } finally {
    timeout.clear();
  }
}

async function fetchCandidateImages(imageUrls: string[]) {
  const images: InlineImage[] = [];

  for (const url of imageUrls.slice(0, 5)) {
    const image = await fetchInlineImage(url);
    if (image) images.push(image);
  }

  return images;
}

function buildPrompt(input: ExtractWithGeminiInput, imageUrls: string[]) {
  return [
    "You are extracting structured data from a specialty coffee product page for an internal admin review tool.",
    "Return strict JSON only. Do not use markdown, code fences, comments, or explanations.",
    "Do not invent missing data. If a field is not visible in the text or images, use null or an empty array.",
    "Use concise values. Keep descriptions short and suitable for admin review, not a long verbatim copy.",
    "If Arabic copy is visible, preserve it in descriptionAr when useful. Otherwise use null.",
    "The JSON shape must be exactly:",
    JSON.stringify({
      coffeeName: "string|null",
      roasteryName: "string|null",
      originCountry: "string|null",
      region: "string|null",
      farm: "string|null",
      producer: "string|null",
      process: "string|null",
      variety: ["string"],
      roastLevel: "string|null",
      flavorNotes: ["string"],
      recommendedBrewMethods: ["string"],
      price: "number|null",
      currency: "string|null",
      weightGrams: "number|null",
      availability: "string|null",
      description: "string|null",
      descriptionAr: "string|null",
      imageUrl: "string|null",
      sourceUrl: input.pageUrl,
      confidence: "number 0..1",
    }),
    "",
    `Source URL: ${input.pageUrl}`,
    `Page title: ${input.pageTitle ?? ""}`,
    `Candidate image URLs: ${imageUrls.join(" | ") || "none"}`,
    "",
    "Visible page text:",
    input.visibleText ? input.visibleText.slice(0, 10_000) : "[empty visible text]",
  ].join("\n");
}

function getGeminiText(response: unknown) {
  if (!response || typeof response !== "object") return "";

  const candidates = (response as { candidates?: unknown[] }).candidates;
  if (!Array.isArray(candidates)) return "";

  return candidates
    .flatMap((candidate) => {
      const parts = (candidate as { content?: { parts?: unknown[] } }).content?.parts;
      if (!Array.isArray(parts)) return [];
      return parts.map((part) => (part as { text?: string }).text).filter(Boolean);
    })
    .join("\n");
}

export async function extractCoffeeWithGemini(
  input: ExtractWithGeminiInput,
): Promise<GeminiCoffeeExtraction | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const imageUrls = input.imageUrls.slice(0, 5);
  const images = await fetchCandidateImages(imageUrls);
  const prompt = buildPrompt(input, imageUrls);
  const timeout = createTimeoutSignal(GEMINI_TIMEOUT_MS);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: timeout.signal,
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: prompt },
                ...images.map((image) => ({
                  inlineData: {
                    mimeType: image.mimeType,
                    data: image.base64,
                  },
                })),
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json",
          },
        }),
      },
    );

    if (!response.ok) return null;

    const json = await response.json();
    const text = getGeminiText(json);
    if (!text) return null;

    const parsed = geminiCoffeeSchema.safeParse({
      ...parseJson(text),
      sourceUrl: input.pageUrl,
    });

    if (!parsed.success) return null;

    return sanitizeExtraction(parsed.data);
  } catch {
    return null;
  } finally {
    timeout.clear();
  }
}
