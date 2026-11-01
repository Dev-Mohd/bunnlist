import type { PrismaClient } from "@prisma/client";
import { LOT_LIST_SELECT, mapLot, type CoffeeLotRow, type MobileLot } from "./catalog";
import { flavorFamily } from "./flavorFamilies";

// «قهاوي تشبهها» under a coffee: others that share its flavour families most, then
// its process and origin; and «من نفس المحمصة». Plain overlap, no model.

export interface SimilarLot { lot: MobileLot; reason: string }
export interface SimilarLots { similar: SimilarLot[]; sameRoaster: MobileLot[] }

type Features = { id: string; roasterId: string; notes: string[]; process: string; origin: string | null; rating: number; reviews: number };

const FAMILY_SHORT: Record<string, string> = {
  berry: "توت", citrus: "حمضيات", stoneFruit: "خوخ ومشمش", tropical: "استوائي", driedFruit: "فواكه مجففة",
  floral: "زهري", chocolate: "شوكولاتة", caramel: "كراميل", nutty: "مكسرات", spice: "بهارات", tea: "شاي", honey: "عسل",
};

const families = (notes: string[]) => new Set(notes.map(flavorFamily).filter((f) => f !== "other"));

/** How alike two coffees are, and why in a few words; 0 when nothing in common. */
export function similarity(a: Features, b: Features): { score: number; reason: string } {
  const fa = families(a.notes), fb = families(b.notes);
  const shared = [...fa].filter((f) => fb.has(f));
  const union = new Set([...fa, ...fb]).size;
  let score = union ? (shared.length / union) * 3 : 0;
  const sameProcess = a.process === b.process && !["OTHER", "MIXED"].includes(a.process);
  const sameOrigin = !!a.origin && a.origin === b.origin && a.origin !== "XB";
  if (sameProcess) score += 0.6;
  if (sameOrigin) score += 0.5;
  if (score === 0) return { score: 0, reason: "" };
  // A little lift for coffees people liked, never enough to beat a closer match.
  score += Math.min(b.reviews, 10) * 0.01 + (b.reviews ? b.rating * 0.02 : 0);
  const reason = shared.length
    ? `نفس النكهات: ${shared.slice(0, 2).map((f) => FAMILY_SHORT[f]).join("، ")}`
    : sameOrigin && sameProcess ? "نفس المنشأ والمعالجة" : sameOrigin ? "نفس المنشأ" : "نفس المعالجة";
  return { score: Math.round(score * 1000) / 1000, reason };
}

/** The closest coffees from other roasters, at most `limit`, with a reason each. */
export function rankSimilar(target: Features, others: Features[], limit = 8): { id: string; reason: string }[] {
  return others
    .filter((o) => o.id !== target.id && o.roasterId !== target.roasterId)
    .map((o) => ({ id: o.id, ...similarity(target, o) }))
    .filter((o) => o.score >= 1)
    .sort((x, y) => y.score - x.score || x.id.localeCompare(y.id))
    .slice(0, limit)
    .map(({ id, reason }) => ({ id, reason }));
}

export async function similarLots(prisma: PrismaClient, slug: string): Promise<SimilarLots> {
  const target = await prisma.coffeeLot.findFirst({
    where: { slug, publishedAt: { not: null } },
    select: { id: true, roasterId: true, flavorNotes: true, process: true, averageRating: true, reviewCount: true, originCountry: { select: { isoCode: true } } },
  });
  if (!target) return { similar: [], sameRoaster: [] };
  const rows = await prisma.coffeeLot.findMany({
    where: { publishedAt: { not: null }, id: { not: target.id } },
    select: { ...LOT_LIST_SELECT, roasterId: true },
  });
  const feat = (r: { id: string; roasterId: string; flavorNotes: string[]; process: string; averageRating: unknown; reviewCount: number; originCountry: { isoCode: string } | null }): Features => ({
    id: r.id, roasterId: r.roasterId, notes: r.flavorNotes, process: r.process,
    origin: r.originCountry?.isoCode ?? null, rating: Number(r.averageRating ?? 0), reviews: r.reviewCount,
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const ranked = rankSimilar(feat(target), rows.map(feat));
  const similar = ranked.map(({ id, reason }) => ({ lot: mapLot(byId.get(id) as unknown as CoffeeLotRow), reason }));
  const sameRoaster = rows
    .filter((r) => r.roasterId === target.roasterId)
    .sort((a, b) => b.reviewCount - a.reviewCount || Number(b.averageRating ?? 0) - Number(a.averageRating ?? 0) || a.nameAr.localeCompare(b.nameAr, "ar"))
    .slice(0, 8)
    .map((r) => mapLot(r as unknown as CoffeeLotRow));
  return { similar, sameRoaster };
}
