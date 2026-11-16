import type { PrismaClient } from "@prisma/client";
import { FLAVOR_FAMILIES, flavorFamily } from "./flavorFamilies";

// Everything the profile tab shows in one call: collection counts, contributions,
// a few bag pictures for the collection card, and the taste analysis. The taste
// card unlocks after TASTE_UNLOCK ratings and is derived from the user's own
// ratings only (never anyone else's).

export const TASTE_UNLOCK = 5;

export interface RatedCoffee {
  rating: number;
  method: string;
  originNameAr: string | null;
  /** ISO code of the origin, for opening a search on it. */
  originCode?: string | null;
  process: string;
  flavorNotes: string[];
}

export interface TasteGroup { name: string; count: number; average: number; code?: string | null }

/** One flavour family's share of what the drinker liked (shares add up to 1). */
export interface TasteFamily { code: string; nameAr: string; share: number }
/** A liked note and the family it belongs to ("other" when none). */
export interface TasteFlavor { name: string; family: string }

/** Short names for the one-line summary («تحب نكهات التوت والزهور»). */
const FAMILY_SHORT_AR: Record<(typeof FLAVOR_FAMILIES)[number], string> = {
  berry: "التوت", citrus: "الحمضيات", stoneFruit: "الخوخ والمشمش", tropical: "الفواكه الاستوائية", driedFruit: "الفواكه المجففة",
  floral: "الزهور", chocolate: "الشوكولاتة", caramel: "الكراميل", nutty: "المكسرات", spice: "البهارات", tea: "الشاي والأعشاب", honey: "العسل",
};

/** «تحب نكهات التوت والزهور، وأقرب منشأ لذوقك إثيوبيا.» from the top families and origin; null with nothing to say. */
export function tasteHeadline(families: TasteFamily[], topOrigin: string | null): string | null {
  const names = families.slice(0, 2).map((f) => f.nameAr);
  const flavors = names.length ? `تحب نكهات ${names.join(" و")}` : null;
  if (flavors && topOrigin) return `${flavors}، وأقرب منشأ لذوقك ${topOrigin}.`;
  if (flavors) return `${flavors}.`;
  return topOrigin ? `أقرب منشأ لذوقك ${topOrigin}.` : null;
}

export interface TasteProfile {
  unlocked: boolean;
  progress: number;
  required: number;
  averageRating: number | null;
  topOrigins: TasteGroup[];
  topProcesses: TasteGroup[];
  topFlavors: string[];
  favoriteMethod: string | null;
  /** How many ratings the card is built on. */
  ratedCount: number;
  /** The liked flavour families, biggest first, for the ring. */
  families: TasteFamily[];
  /** `topFlavors` with each note's family, for colouring and searching. */
  flavors: TasteFlavor[];
  /** One sentence that sums it up. */
  headline: string | null;
}

function groups(items: { key: string | null; rating: number }[], limit: number): TasteGroup[] {
  const map = new Map<string, { total: number; count: number }>();
  for (const { key, rating } of items) {
    if (!key) continue;
    const g = map.get(key) ?? { total: 0, count: 0 };
    g.total += rating;
    g.count += 1;
    map.set(key, g);
  }
  return [...map.entries()]
    .map(([name, g]) => ({ name, count: g.count, average: Math.round((g.total / g.count) * 10) / 10 }))
    .sort((a, b) => b.average - a.average || b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit);
}

/** Pure: what the ratings say about the drinker. */
export function tasteProfile(rated: RatedCoffee[]): TasteProfile {
  const progress = Math.min(rated.length, TASTE_UNLOCK);
  if (rated.length < TASTE_UNLOCK) {
    return {
      unlocked: false, progress, required: TASTE_UNLOCK, averageRating: null,
      topOrigins: [], topProcesses: [], topFlavors: [], favoriteMethod: null,
      ratedCount: rated.length, families: [], flavors: [], headline: null,
    };
  }
  const liked = rated.filter((r) => r.rating >= 4);
  const flavorCount = new Map<string, number>();
  for (const r of liked) for (const f of new Set(r.flavorNotes)) flavorCount.set(f, (flavorCount.get(f) ?? 0) + 1);
  const methodCount = new Map<string, number>();
  for (const r of liked.length ? liked : rated) methodCount.set(r.method, (methodCount.get(r.method) ?? 0) + 1);
  const favoriteMethod = [...methodCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null;
  // Each liked coffee counts once per family it carries.
  const familyCount = new Map<string, number>();
  for (const r of liked) for (const f of new Set(r.flavorNotes.map(flavorFamily))) if (f !== "other") familyCount.set(f, (familyCount.get(f) ?? 0) + 1);
  const familyTotal = [...familyCount.values()].reduce((a, b) => a + b, 0);
  const families: TasteFamily[] = [...familyCount.entries()]
    .sort((a, b) => b[1] - a[1] || FLAVOR_FAMILIES.indexOf(a[0] as never) - FLAVOR_FAMILIES.indexOf(b[0] as never))
    .slice(0, 6)
    .map(([code, n]) => ({ code, nameAr: FAMILY_SHORT_AR[code as (typeof FLAVOR_FAMILIES)[number]], share: Math.round((n / familyTotal) * 1000) / 1000 }));
  const codeByOrigin = new Map(rated.filter((r) => r.originNameAr && r.originCode).map((r) => [r.originNameAr as string, r.originCode as string]));
  const topOrigins = groups(rated.map((r) => ({ key: r.originNameAr, rating: r.rating })), 3).map((g) => (codeByOrigin.has(g.name) ? { ...g, code: codeByOrigin.get(g.name) } : g));
  const topFlavors = [...flavorCount.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 5).map(([f]) => f);
  return {
    unlocked: true,
    progress,
    required: TASTE_UNLOCK,
    averageRating: Math.round((rated.reduce((s, r) => s + r.rating, 0) / rated.length) * 10) / 10,
    topOrigins,
    topProcesses: groups(rated.map((r) => ({ key: r.process, rating: r.rating })), 2),
    topFlavors,
    favoriteMethod,
    ratedCount: rated.length,
    families,
    flavors: topFlavors.map((name) => ({ name, family: flavorFamily(name) })),
    headline: tasteHeadline(families, topOrigins[0]?.name ?? null),
  };
}

export interface ProfileSummary {
  collection: { owned: number; favorite: number; wantsToTry: number; tried: number };
  recentBags: string[];
  discoveries: number;
  submissions: number;
  recipes: number;
  experiences: number;
  ratings: number;
  followers: number;
  following: number;
  /** People waiting to follow a private account. */
  followRequests: number;
  taste: TasteProfile;
}

export async function profileSummary(prisma: PrismaClient, accountId: string): Promise<ProfileSummary> {
  const [entries, discoveries, submissions, recipes, experiences, reviews, followers, following, followRequests] = await Promise.all([
    prisma.mobileCollectionEntry.findMany({ where: { accountId }, orderBy: { updatedAt: "desc" } }),
    prisma.mobileCoffeeSubmission.count({ where: { accountId, status: "APPROVED" } }),
    prisma.mobileCoffeeSubmission.count({ where: { accountId } }),
    prisma.mobileRecipe.count({ where: { accountId, state: { not: "deleted" } } }),
    prisma.mobileBrewExperience.count({ where: { accountId, state: { not: "deleted" } } }),
    prisma.review.findMany({
      where: { userId: accountId, status: "PUBLISHED" },
      select: {
        rating: true, brewMethod: true,
        coffeeLot: { select: { process: true, flavorNotes: true, originCountry: { select: { nameAr: true, isoCode: true } } } },
      },
      take: 500,
    }),
    prisma.mobileFollow.count({ where: { followeeId: accountId } }),
    prisma.mobileFollow.count({ where: { followerId: accountId } }),
    prisma.mobileFollowRequest.count({ where: { targetId: accountId } }),
  ]);

  const ownedIds = entries.filter((e) => e.owned).slice(0, 3).map((e) => e.lotId);
  const bags = ownedIds.length
    ? await prisma.coffeeLot.findMany({ where: { id: { in: ownedIds }, publishedAt: { not: null } }, select: { id: true, imageUrl: true } })
    : [];
  const bagById = new Map(bags.map((b) => [b.id, b.imageUrl]));

  return {
    collection: {
      owned: entries.filter((e) => e.owned).length,
      favorite: entries.filter((e) => e.favorite).length,
      wantsToTry: entries.filter((e) => e.wantsToTry).length,
      tried: entries.filter((e) => e.tried).length,
    },
    recentBags: ownedIds.map((id) => bagById.get(id)).filter((u): u is string => !!u),
    discoveries, submissions, recipes, experiences,
    ratings: reviews.length,
    followers, following, followRequests,
    taste: tasteProfile(reviews.map((r) => ({
      rating: r.rating,
      method: r.brewMethod,
      originNameAr: r.coffeeLot.originCountry?.nameAr ?? null,
      originCode: r.coffeeLot.originCountry?.isoCode ?? null,
      process: r.coffeeLot.process,
      flavorNotes: r.coffeeLot.flavorNotes,
    }))),
  };
}
