import type { PrismaClient } from "@prisma/client";
import { LOT_LIST_SELECT, mapLot, type CoffeeLotRow, type MobileLot } from "./catalog";
import { ApiError } from "./errors";
import { flavorFamily } from "./flavorFamilies";
import { roasterLogoUrl } from "./roasterLogos";

// Roaster pages: every roaster with published coffees, and one roaster's page with
// its coffees, how people rate them, what it leans to (origins, processes,
// flavours), and following it (its new coffees then show on the home).

export interface RoasterCard {
  slug: string;
  nameAr: string;
  name: string;
  cityAr: string | null;
  /** From the roaster's own site; null when we don't have one. */
  logoUrl: string | null;
  lots: number;
  /** Rating averaged over all reviews of its coffees; 0 without any. */
  averageRating: number;
  reviews: number;
  /** A few bag photos for the card. */
  images: string[];
  followers: number;
}

export interface Share { key: string; count: number }

export interface RoasterPage {
  roaster: RoasterCard;
  isFollowing: boolean;
  origins: Share[];
  processes: Share[];
  /** Flavour families by how many of its coffees carry one. */
  families: Share[];
  topRated: MobileLot[];
  newest: MobileLot[];
  /** All its coffees, best rated first. */
  lots: MobileLot[];
}

type Lot = {
  id: string; imageUrl: string | null; averageRating: unknown; reviewCount: number; publishedAt: Date | null;
};

/** Reviews-weighted rating, so one 5★ coffee doesn't outweigh a well-reviewed 4.5. */
export function weightedRating(lots: Pick<Lot, "averageRating" | "reviewCount">[]): { rating: number; reviews: number } {
  const reviews = lots.reduce((n, l) => n + l.reviewCount, 0);
  if (!reviews) return { rating: 0, reviews: 0 };
  const sum = lots.reduce((n, l) => n + Number(l.averageRating ?? 0) * l.reviewCount, 0);
  return { rating: Math.round((sum / reviews) * 10) / 10, reviews };
}

export function tally(values: string[], limit = 6): Share[] {
  const by = new Map<string, number>();
  for (const v of values) by.set(v, (by.get(v) ?? 0) + 1);
  return [...by].map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key)).slice(0, limit);
}

function card(
  r: { slug: string; nameAr: string; name: string; cityAr: string | null },
  lots: Lot[], followers: number, origin: string | null = null,
): RoasterCard {
  const { rating, reviews } = weightedRating(lots);
  const images = [...lots].sort((a, b) => b.reviewCount - a.reviewCount || a.id.localeCompare(b.id))
    .flatMap((l) => (l.imageUrl ? [l.imageUrl] : [])).slice(0, 3);
  return { slug: r.slug, nameAr: r.nameAr, name: r.name, cityAr: r.cityAr, logoUrl: roasterLogoUrl(r.slug, origin), lots: lots.length, averageRating: rating, reviews, images, followers };
}

async function followerCounts(prisma: PrismaClient, roasterIds: string[]): Promise<Map<string, number>> {
  if (!roasterIds.length) return new Map();
  const rows = await prisma.mobileRoasterFollow.groupBy({ by: ["roasterId"], where: { roasterId: { in: roasterIds } }, _count: { _all: true } });
  return new Map(rows.map((r) => [r.roasterId, r._count._all]));
}

/** Every roaster with published coffees, most coffees first. */
export async function listRoasters(prisma: PrismaClient, viewerId: string | null, origin: string | null = null): Promise<{ roasters: RoasterCard[]; following: string[] }> {
  const rows = await prisma.roaster.findMany({
    where: { coffeeLots: { some: { publishedAt: { not: null } } } },
    select: {
      id: true, slug: true, nameAr: true, name: true, cityAr: true,
      coffeeLots: { where: { publishedAt: { not: null } }, select: { id: true, imageUrl: true, averageRating: true, reviewCount: true, publishedAt: true } },
    },
  });
  const [followers, mine] = await Promise.all([
    followerCounts(prisma, rows.map((r) => r.id)),
    viewerId ? prisma.mobileRoasterFollow.findMany({ where: { accountId: viewerId }, select: { roasterId: true } }) : Promise.resolve([]),
  ]);
  const followed = new Set(mine.map((m) => m.roasterId));
  return {
    roasters: rows.map((r) => card(r, r.coffeeLots, followers.get(r.id) ?? 0, origin))
      .sort((a, b) => b.lots - a.lots || a.nameAr.localeCompare(b.nameAr, "ar")),
    following: rows.filter((r) => followed.has(r.id)).map((r) => r.slug),
  };
}

export async function roasterPage(prisma: PrismaClient, slug: string, viewerId: string | null, origin: string | null = null): Promise<RoasterPage> {
  const r = await prisma.roaster.findUnique({ where: { slug }, select: { id: true, slug: true, nameAr: true, name: true, cityAr: true } });
  if (!r) throw ApiError.unprocessable("roaster_not_found");
  const rows = await prisma.coffeeLot.findMany({
    where: { roasterId: r.id, publishedAt: { not: null } },
    select: { ...LOT_LIST_SELECT, publishedAt: true },
    orderBy: [{ averageRating: "desc" }, { reviewCount: "desc" }, { id: "asc" }],
    take: 400,
  });
  if (!rows.length) throw ApiError.unprocessable("roaster_not_found");
  const [followers, follow] = await Promise.all([
    prisma.mobileRoasterFollow.count({ where: { roasterId: r.id } }),
    viewerId ? prisma.mobileRoasterFollow.findUnique({ where: { accountId_roasterId: { accountId: viewerId, roasterId: r.id } } }) : Promise.resolve(null),
  ]);
  const lots = rows.map((row) => mapLot(row as unknown as CoffeeLotRow));
  const bySlug = new Map(lots.map((l) => [l.slug, l]));
  return {
    roaster: card(r, rows, followers, origin),
    isFollowing: !!follow,
    origins: tally(rows.flatMap((l) => (l.originCountry && l.originCountry.isoCode !== "XB" ? [l.originCountry.nameAr] : []))),
    processes: tally(rows.map((l) => l.process).filter((p) => p !== "OTHER")),
    families: tally(rows.flatMap((l) => [...new Set(l.flavorNotes.map(flavorFamily))].filter((f) => f !== "other")), 5),
    topRated: lots.filter((l) => l.reviewCount > 0).slice(0, 5),
    newest: [...rows].sort((a, b) => (b.publishedAt?.getTime() ?? 0) - (a.publishedAt?.getTime() ?? 0)).slice(0, 6)
      .flatMap((row) => bySlug.get(row.slug) ?? []),
    lots,
  };
}

export async function setRoasterFollow(prisma: PrismaClient, accountId: string, slug: string, follow: boolean): Promise<{ following: boolean; followers: number }> {
  const r = await prisma.roaster.findUnique({ where: { slug }, select: { id: true } });
  if (!r) throw ApiError.unprocessable("roaster_not_found");
  if (follow) {
    await prisma.mobileRoasterFollow.upsert({
      where: { accountId_roasterId: { accountId, roasterId: r.id } }, update: {}, create: { accountId, roasterId: r.id },
    });
  } else {
    await prisma.mobileRoasterFollow.deleteMany({ where: { accountId, roasterId: r.id } });
  }
  return { following: follow, followers: await prisma.mobileRoasterFollow.count({ where: { roasterId: r.id } }) };
}
