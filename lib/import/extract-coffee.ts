// lib/import/extract-coffee.ts
// ============================================================
//  تحويل محتوى الصفحة إلى بيانات قهوة منظَّمة + درجة ثقة لكل حقل.
//
//  استراتيجية هجينة (مناسبة للـ MVP):
//   1) Gemini multimodal: يقرأ النص المرئي وصور المنتج المرشّحة إن توفر المفتاح
//   2) fallback محلي: يقرأ JSON-LD من نوع Product ويستخدم العنوان عند النقص
//
//  ملاحظة: خطوة الذكاء الاصطناعي معزولة خلف دالة واحدة
//  (callAiExtraction) حتى يسهل استبدالها أو تعطيلها.
// ============================================================

import type { ExtractedPage } from "./extract-text";
import { extractProductImages } from "./extract-images";
import { extractCoffeeWithGemini, type GeminiCoffeeExtraction } from "./gemini-extract-coffee";

export interface NormalizedCoffee {
  coffeeName: string | null;
  roasteryName: string | null;
  originCountry: string | null;
  region: string | null;
  farmName: string | null;
  producerName: string | null;
  process: string | null;
  variety: string | null;
  tastingNotes: string[];
  roastLevel: string | null;
  brewMethods: string[];
  price: number | null;
  currency: string | null;
  weightGrams: number | null;
  productUrl: string | null;
  imageUrl: string | null;
  availability: string | null;
  descriptionSummary: string | null;
}

// خريطة الثقة: اسم الحقل -> رقم بين 0 و 1
export type ConfidenceMap = Partial<Record<keyof NormalizedCoffee, number>>;

export interface ExtractionOutput {
  data: NormalizedCoffee;
  confidence: ConfidenceMap;
  usedAi: boolean;
}

const EMPTY: NormalizedCoffee = {
  coffeeName: null, roasteryName: null, originCountry: null, region: null,
  farmName: null, producerName: null, process: null, variety: null,
  tastingNotes: [], roastLevel: null, brewMethods: [], price: null,
  currency: null, weightGrams: null, productUrl: null, imageUrl: null,
  availability: null, descriptionSummary: null,
};

// ---- 1) المحلّل المهيكل: JSON-LD Product ----
function parseStructured(page: ExtractedPage, sourceUrl: string): ExtractionOutput {
  const data: NormalizedCoffee = { ...EMPTY, productUrl: sourceUrl, imageUrl: page.metaImage };
  const confidence: ConfidenceMap = {};
  if (page.metaImage) confidence.imageUrl = 0.7;
  confidence.productUrl = 1.0;

  // ابحث عن كائن من نوع Product داخل كتل JSON-LD
  const flatten = (node: unknown): Record<string, unknown>[] => {
    if (Array.isArray(node)) return node.flatMap(flatten);
    if (node && typeof node === "object") {
      const obj = node as Record<string, unknown>;
      const graph = obj["@graph"];
      if (Array.isArray(graph)) return graph.flatMap(flatten);
      return [obj];
    }
    return [];
  };
  const nodes = page.jsonLd.flatMap(flatten);
  const product = nodes.find((n) => {
    const t = n["@type"];
    return t === "Product" || (Array.isArray(t) && t.includes("Product"));
  });

  if (product) {
    if (typeof product.name === "string") {
      data.coffeeName = product.name.trim();
      confidence.coffeeName = 0.9;
    }
    if (typeof product.description === "string") {
      data.descriptionSummary = product.description.trim().slice(0, 600);
      confidence.descriptionSummary = 0.85;
    }
    const img = product.image;
    if (typeof img === "string") {
      data.imageUrl = img;
      confidence.imageUrl = 0.9;
    } else if (Array.isArray(img) && typeof img[0] === "string") {
      data.imageUrl = img[0];
      confidence.imageUrl = 0.9;
    }
    const brand = product.brand;
    if (typeof brand === "string") {
      data.roasteryName = brand;
      confidence.roasteryName = 0.8;
    } else if (brand && typeof brand === "object" && typeof (brand as Record<string, unknown>).name === "string") {
      data.roasteryName = (brand as Record<string, unknown>).name as string;
      confidence.roasteryName = 0.85;
    }
    // العروض: السعر + العملة + التوفّر
    const offers = Array.isArray(product.offers) ? product.offers[0] : product.offers;
    if (offers && typeof offers === "object") {
      const o = offers as Record<string, unknown>;
      const price = Number(o.price);
      if (!Number.isNaN(price) && price > 0) {
        data.price = price;
        confidence.price = 0.9;
      }
      if (typeof o.priceCurrency === "string") {
        data.currency = o.priceCurrency;
        confidence.currency = 0.9;
      }
      if (typeof o.availability === "string") {
        const av = o.availability.toLowerCase();
        data.availability = av.includes("instock") ? "in_stock"
          : av.includes("outofstock") ? "out_of_stock" : "unknown";
        confidence.availability = 0.85;
      }
    }
  }

  return { data, confidence, usedAi: false };
}

function hasValue(value: string | string[] | number | null) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== null && value !== "";
}

function confidenceForGemini(data: GeminiCoffeeExtraction): ConfidenceMap {
  const score = data.confidence || 0.5;
  const confidence: ConfidenceMap = {};

  const fields: [keyof NormalizedCoffee, string | string[] | number | null][] = [
    ["coffeeName", data.coffeeName],
    ["roasteryName", data.roasteryName],
    ["originCountry", data.originCountry],
    ["region", data.region],
    ["farmName", data.farm],
    ["producerName", data.producer],
    ["process", data.process],
    ["variety", data.variety],
    ["tastingNotes", data.flavorNotes],
    ["roastLevel", data.roastLevel],
    ["brewMethods", data.recommendedBrewMethods],
    ["price", data.price],
    ["currency", data.currency],
    ["weightGrams", data.weightGrams],
    ["imageUrl", data.imageUrl],
    ["availability", data.availability],
    ["descriptionSummary", data.descriptionAr ?? data.description],
  ];

  for (const [field, value] of fields) {
    if (hasValue(value)) confidence[field] = score;
  }

  confidence.productUrl = 1;
  return confidence;
}

function fromGemini(data: GeminiCoffeeExtraction, imageUrls: string[]): ExtractionOutput {
  const normalized: NormalizedCoffee = {
    coffeeName: data.coffeeName,
    roasteryName: data.roasteryName,
    originCountry: data.originCountry,
    region: data.region,
    farmName: data.farm,
    producerName: data.producer,
    process: data.process,
    variety: data.variety.length ? data.variety.join("، ") : null,
    tastingNotes: data.flavorNotes,
    roastLevel: data.roastLevel,
    brewMethods: data.recommendedBrewMethods,
    price: data.price,
    currency: data.currency,
    weightGrams: data.weightGrams,
    productUrl: data.sourceUrl,
    imageUrl: data.imageUrl ?? imageUrls[0] ?? null,
    availability: data.availability,
    descriptionSummary: data.descriptionAr ?? data.description,
  };

  return {
    data: normalized,
    confidence: confidenceForGemini(data),
    usedAi: true,
  };
}

// ---- الدالة الرئيسية: تجمع المحلّل المهيكل + الذكاء الاصطناعي ----
export async function extractCoffee(
  page: ExtractedPage,
  sourceUrl: string
): Promise<ExtractionOutput> {
  const imageUrls = page.rawHtml ? extractProductImages(page.rawHtml, sourceUrl) : [];
  const gemini = await extractCoffeeWithGemini({
    pageUrl: sourceUrl,
    pageTitle: page.title,
    visibleText: page.text,
    imageUrls,
  });

  if (gemini && gemini.confidence >= 0.45) {
    return fromGemini(gemini, imageUrls);
  }

  // fallback: البيانات المهيكلة المحلية من الصفحة، بدون حفظ تلقائي.
  const structured = parseStructured(page, sourceUrl);
  const data: NormalizedCoffee = { ...structured.data };
  const confidence: ConfidenceMap = { ...structured.confidence };

  if (!data.imageUrl && imageUrls.length > 0) {
    data.imageUrl = imageUrls[0];
    confidence.imageUrl = 0.55;
  }

  // احتياطي: لو ما فيه اسم قهوة، استخدم عنوان الصفحة بثقة منخفضة
  if (!data.coffeeName && page.title) {
    data.coffeeName = page.title.slice(0, 120);
    confidence.coffeeName = 0.3;
  }

  return { data, confidence, usedAi: false };
}
