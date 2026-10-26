import type { PrismaClient } from "@prisma/client";
import { ApiError } from "./errors";
import { FLAVOR_FAMILY_AR, flavorFamily } from "./flavorFamilies";

// "تناسبك ٨٧٪": how well a coffee fits someone's taste, learned from their own
// ratings. Each rated coffee pushes its flavor families, process and origin up
// (4–5 stars) or down (1–2 stars); a coffee scores by the features it shares
// with those. Few ratings make it unreliable, so it needs MIN_RATINGS first.

export const MIN_RATINGS = 3;

export interface RatedCoffee { rating: number; notes: string[]; process: string | null; origin: string | null }
export interface CoffeeFeatures { notes: string[]; process: string | null; origin: string | null }

export interface TasteMatch {
  /** 0–100, or null until enough ratings. */
  score: number | null;
  ratedCount: number;
  /** Ratings still needed before a score shows. */
  needed: number;
  /** Why: what in this coffee matches (positive) or doesn't (negative) their taste. */
  reasons: { positive: boolean; text: string }[];
  /** Their own stars on this coffee, if they rated it. */
  myRating: number | null;
}

const PROCESS_AR: Record<string, string> = {
  NATURAL: "المجففة", WASHED: "المغسولة", HONEY: "العسلية", ANAEROBIC: "اللاهوائية",
  WET_HULLED: "المقشورة رطبة", CARBONIC_MACERATION: "النقع الكربوني", EXPERIMENTAL: "التجريبية",
};

type Feature = { key: string; weight: number; text: string };

function features(c: CoffeeFeatures): Feature[] {
  const families = [...new Set(c.notes.map(flavorFamily))].filter((f) => f !== "other") as (keyof typeof FLAVOR_FAMILY_AR)[];
  const out: Feature[] = families.map((f) => ({ key: `f:${f}`, weight: 1, text: FLAVOR_FAMILY_AR[f] }));
  if (c.process && PROCESS_AR[c.process]) out.push({ key: `p:${c.process}`, weight: 0.7, text: `المعالجة ${PROCESS_AR[c.process]}` });
  if (c.origin && c.origin !== "XB") out.push({ key: `o:${c.origin}`, weight: 0.4, text: "" });
  return out;
}

/** Pure scoring, for tests and reuse. `originAr` names the target's origin for reasons. */
export function scoreMatch(rated: RatedCoffee[], target: CoffeeFeatures, originAr: string | null = null):
  Omit<TasteMatch, "myRating"> {
  const ratedCount = rated.length;
  if (ratedCount < MIN_RATINGS) return { score: null, ratedCount, needed: MIN_RATINGS - ratedCount, reasons: [] };

  // Preference per feature: mean of (stars − 3), shrunk toward 0 when seen rarely.
  const sums = new Map<string, { total: number; count: number }>();
  for (const r of rated) {
    for (const f of features(r)) {
      const s = sums.get(f.key) ?? { total: 0, count: 0 };
      s.total += r.rating - 3;
      s.count += 1;
      sums.set(f.key, s);
    }
  }
  const pref = (key: string) => {
    const s = sums.get(key);
    return s ? s.total / (s.count + 1) : null;
  };

  const mine = features(target);
  let weighted = 0, weights = 0;
  const reasons: TasteMatch["reasons"] = [];
  for (const f of mine) {
    const p = pref(f.key);
    if (p === null) continue;
    weighted += p * f.weight;
    weights += f.weight;
    const text = f.text || (originAr ? `قهوة ${originAr}` : "");
    if (!text) continue;
    if (p >= 0.5) reasons.push({ positive: true, text: `تحب ${text}` });
    else if (p <= -0.5) reasons.push({ positive: false, text: `عادة تقيّم ${text} أقل` });
  }
  // Nothing in common yet: lean on how generous their ratings are, close to the middle.
  const mean = rated.reduce((s, r) => s + r.rating - 3, 0) / ratedCount;
  const raw = weights > 0 ? weighted / weights : mean * 0.3;
  const score = Math.max(5, Math.min(98, Math.round(60 + raw * 22)));
  if (weights === 0) reasons.push({ positive: true, text: "نكهاتها جديدة عليك، جرّبها وقيّمها" });
  reasons.sort((a, b) => Number(b.positive) - Number(a.positive));
  return { score, ratedCount, needed: 0, reasons: reasons.slice(0, 3) };
}

export async function tasteMatch(prisma: PrismaClient, accountId: string, slug: string): Promise<TasteMatch> {
  const lot = await prisma.coffeeLot.findFirst({
    where: { slug, publishedAt: { not: null } },
    select: { id: true, flavorNotes: true, process: true, originCountry: { select: { isoCode: true, nameAr: true } } },
  });
  if (!lot) throw ApiError.unprocessable("lot_not_found");
  const reviews = await prisma.review.findMany({
    where: { userId: accountId, status: "PUBLISHED" },
    select: {
      rating: true, coffeeLotId: true,
      coffeeLot: { select: { flavorNotes: true, process: true, originCountry: { select: { isoCode: true } } } },
    },
    take: 500,
  });
  const myRating = reviews.find((r) => r.coffeeLotId === lot.id)?.rating ?? null;
  // Learn from everything else they rated, so a coffee doesn't vouch for itself.
  const rated = reviews.filter((r) => r.coffeeLotId !== lot.id).map((r) => ({
    rating: r.rating, notes: r.coffeeLot.flavorNotes, process: r.coffeeLot.process, origin: r.coffeeLot.originCountry?.isoCode ?? null,
  }));
  const result = scoreMatch(
    rated, { notes: lot.flavorNotes, process: lot.process, origin: lot.originCountry?.isoCode ?? null },
    lot.originCountry?.nameAr ?? null,
  );
  return { ...result, myRating };
}
