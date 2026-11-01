import type { PrismaClient } from "@prisma/client";
import { flavorFamily } from "./flavorFamilies";
import { tally, weightedRating, type Share } from "./roasters";

// «خريطة المناطق»: each producing country with how many coffees we list, from how
// many roasters, how they're rated, what they taste like and the regions they come
// from; for a signed-in person, how many of them they've tried (collected or rated).

export interface OriginPoint {
  code: string;
  nameAr: string;
  nameEn: string | null;
  lots: number;
  roasters: number;
  averageRating: number;
  families: Share[];
  processes: Share[];
  /** Regions as the roasters write them, most common first. */
  regions: string[];
  /** Coffees from here they collected or rated; null when signed out. */
  tried: number | null;
}

export async function originsMap(prisma: PrismaClient, viewerId: string | null): Promise<{ origins: OriginPoint[]; triedCountries: number | null }> {
  const rows = await prisma.coffeeLot.findMany({
    where: { publishedAt: { not: null }, originCountry: { isoCode: { not: "XB" } } },
    select: {
      id: true, roasterId: true, process: true, flavorNotes: true, regionAr: true, region: true, averageRating: true, reviewCount: true,
      originCountry: { select: { isoCode: true, nameAr: true, nameEn: true } },
    },
    take: 5000,
  });
  let mine: Set<string> | null = null;
  if (viewerId) {
    const [entries, reviews] = await Promise.all([
      prisma.mobileCollectionEntry.findMany({ where: { accountId: viewerId }, select: { lotId: true } }),
      prisma.review.findMany({ where: { userId: viewerId, status: "PUBLISHED" }, select: { coffeeLotId: true } }),
    ]);
    mine = new Set([...entries.map((e) => e.lotId), ...reviews.map((r) => r.coffeeLotId)]);
  }
  const by = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!r.originCountry) continue;
    by.set(r.originCountry.isoCode, [...(by.get(r.originCountry.isoCode) ?? []), r]);
  }
  const origins = [...by].map(([code, lots]) => {
    const c = lots[0].originCountry!;
    return {
      code, nameAr: c.nameAr, nameEn: c.nameEn,
      lots: lots.length,
      roasters: new Set(lots.map((l) => l.roasterId)).size,
      averageRating: weightedRating(lots).rating,
      families: tally(lots.flatMap((l) => [...new Set(l.flavorNotes.map(flavorFamily))].filter((f) => f !== "other")), 4),
      processes: tally(lots.map((l) => l.process).filter((p) => p !== "OTHER"), 3),
      regions: tally(lots.flatMap((l) => {
        const name = (l.regionAr ?? l.region ?? "").trim();
        return name ? [name] : [];
      }), 6).map((s) => s.key),
      tried: mine ? lots.filter((l) => mine!.has(l.id)).length : null,
    };
  }).sort((a, b) => b.lots - a.lots || a.code.localeCompare(b.code));
  return { origins, triedCountries: mine ? origins.filter((o) => (o.tried ?? 0) > 0).length : null };
}
