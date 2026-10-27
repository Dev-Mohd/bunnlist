import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { LOT_LIST_SELECT, mapLot, type CoffeeLotRow, type MobileLot } from "./catalog";
import { mapExperience, type MobileExperience } from "./experiences";
import { asVisibility, avatarUrl, displayNames } from "./profile";
import { canSee } from "./social";
import { UNCREDITED_ACCOUNTS } from "./submissions";

// The app's home: what's trending this week (coffees, roasters, recipes), the
// community's latest public activity, and the caller's last brew for «كمّل».
//
// Trending counts the last 7 days of activity on a coffee: a logged brew or a
// rating weighs 3, adding it to a collection or publishing a recipe for it 2.
// Each person counts once per coffee and kind, newer activity counts more (a week
// old counts half), and a coffee needs three different people to qualify, so no
// one can push a coffee up alone. Admins can pin or hide a coffee. While the app
// is young and few coffees qualify, the list is topped up with the coffees most
// added this month, marked as such.

const DAY = 24 * 60 * 60 * 1000;
export const TREND_DAYS = 7;
export const MIN_PEOPLE = 3;
export const TREND_SIZE = 10;
export const WEIGHTS = { brew: 3, review: 3, collect: 2, recipe: 2 } as const;
export type SignalKind = keyof typeof WEIGHTS;

export interface Signal { lotId: string; accountId: string; kind: SignalKind; at: Date }

export interface LotScore {
  lotId: string;
  score: number;
  people: number;
  counts: Record<SignalKind, number>;
}

/** Scores the signals inside [now - days, now]; one per person, coffee and kind. */
export function scoreSignals(signals: Signal[], now: Date, days = TREND_DAYS): LotScore[] {
  const from = now.getTime() - days * DAY;
  const latest = new Map<string, Signal>();
  for (const s of signals) {
    const t = s.at.getTime();
    if (t < from || t > now.getTime()) continue;
    const key = `${s.lotId}|${s.accountId}|${s.kind}`;
    const seen = latest.get(key);
    if (!seen || seen.at < s.at) latest.set(key, s);
  }
  const byLot = new Map<string, { score: number; people: Set<string>; counts: Record<SignalKind, number> }>();
  for (const s of latest.values()) {
    const age = (now.getTime() - s.at.getTime()) / (days * DAY);
    const entry = byLot.get(s.lotId) ?? { score: 0, people: new Set(), counts: { brew: 0, review: 0, collect: 0, recipe: 0 } };
    entry.score += WEIGHTS[s.kind] * (1 - 0.5 * age);
    entry.people.add(s.accountId);
    entry.counts[s.kind] += 1;
    byLot.set(s.lotId, entry);
  }
  return [...byLot].map(([lotId, e]) => ({ lotId, score: Math.round(e.score * 100) / 100, people: e.people.size, counts: e.counts }))
    .sort((a, b) => b.score - a.score || b.people - a.people || a.lotId.localeCompare(b.lotId));
}

export interface Ranked { lotId: string; rank: number; move: number | null; pinned: boolean }

/** Pins first (in pin order), hidden out, then qualified scores; `move` compares
 *  with last week's rank (positive = up), null when it wasn't ranked then. */
export function rank(
  current: LotScore[], previous: LotScore[], overrides: { lotId: string; mode: string }[], size = TREND_SIZE,
): Ranked[] {
  const hidden = new Set(overrides.filter((o) => o.mode === "hide").map((o) => o.lotId));
  const pins = overrides.filter((o) => o.mode === "pin" && !hidden.has(o.lotId)).map((o) => o.lotId);
  const qualified = (list: LotScore[]) => list.filter((s) => s.people >= MIN_PEOPLE && !hidden.has(s.lotId)).map((s) => s.lotId);
  const before = new Map(qualified(previous).map((id, i) => [id, i + 1]));
  const ids = [...new Set([...pins, ...qualified(current)])].slice(0, size);
  return ids.map((lotId, i) => ({
    lotId, rank: i + 1, pinned: pins.includes(lotId),
    move: before.has(lotId) ? before.get(lotId)! - (i + 1) : null,
  }));
}

export interface TrendingLot extends MobileLot {
  rank: number;
  /** Places up (+) or down (-) since last week; null = new this week. */
  move: number | null;
  pinned: boolean;
  /** "trend" = earned this week; "added" = topped up from the month's most added. */
  reason: "trend" | "added";
  brews: number;
  reviews: number;
  adds: number;
  recipes: number;
}

export interface TrendingRoaster { slug: string; nameAr: string; score: number; coffees: number; imageUrl: string | null }

export interface TrendingRecipe {
  id: string; title: string; methodCode: string; authorName: string; lotNameAr: string | null;
  likes: number; brews: number;
}

async function gatherSignals(prisma: PrismaClient, since: Date): Promise<Signal[]> {
  const [brews, reviews, adds, recipes] = await Promise.all([
    prisma.mobileBrewExperience.findMany({
      where: { createdAt: { gte: since }, state: { not: "deleted" } }, select: { lotId: true, accountId: true, createdAt: true },
    }),
    prisma.review.findMany({
      where: { createdAt: { gte: since }, status: "PUBLISHED" }, select: { coffeeLotId: true, userId: true, createdAt: true },
    }),
    prisma.mobileCollectionEntry.findMany({ where: { createdAt: { gte: since } }, select: { lotId: true, accountId: true, createdAt: true } }),
    prisma.mobileRecipe.findMany({
      where: { publishedAt: { gte: since }, state: "published", lotId: { not: null } },
      select: { lotId: true, accountId: true, publishedAt: true },
    }),
  ]);
  return [
    ...brews.map((b) => ({ lotId: b.lotId, accountId: b.accountId, kind: "brew" as const, at: b.createdAt })),
    ...reviews.map((r) => ({ lotId: r.coffeeLotId, accountId: r.userId, kind: "review" as const, at: r.createdAt })),
    ...adds.map((a) => ({ lotId: a.lotId, accountId: a.accountId, kind: "collect" as const, at: a.createdAt })),
    ...recipes.map((r) => ({ lotId: r.lotId!, accountId: r.accountId, kind: "recipe" as const, at: r.publishedAt! })),
  ];
}

export async function trendingLots(prisma: PrismaClient, now = new Date()): Promise<{ lots: TrendingLot[]; scores: LotScore[] }> {
  const [signals, overrides] = await Promise.all([
    gatherSignals(prisma, new Date(now.getTime() - 2 * TREND_DAYS * DAY)),
    prisma.mobileTrendingOverride.findMany({ orderBy: { createdAt: "asc" }, select: { lotId: true, mode: true } }),
  ]);
  const current = scoreSignals(signals, now);
  const previous = scoreSignals(signals, new Date(now.getTime() - TREND_DAYS * DAY));
  const ranked = rank(current, previous, overrides);

  const rows = await prisma.coffeeLot.findMany({
    where: { id: { in: ranked.map((r) => r.lotId) }, publishedAt: { not: null } }, select: LOT_LIST_SELECT,
  });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const scoreOf = new Map(current.map((s) => [s.lotId, s]));
  const lots: TrendingLot[] = ranked.filter((r) => byId.has(r.lotId)).map((r, i) => {
    const c = scoreOf.get(r.lotId)?.counts ?? { brew: 0, review: 0, collect: 0, recipe: 0 };
    return {
      ...mapLot(byId.get(r.lotId) as unknown as CoffeeLotRow), rank: i + 1, move: r.move, pinned: r.pinned, reason: "trend",
      brews: c.brew, reviews: c.review, adds: c.collect, recipes: c.recipe,
    };
  });

  // Young app: top up to five with the month's most added coffees.
  if (lots.length < 5) {
    const hidden = overrides.filter((o) => o.mode === "hide").map((o) => o.lotId);
    const taken = lots.map((l) => l.id);
    const month = await prisma.mobileCollectionEntry.groupBy({
      by: ["lotId"], where: { createdAt: { gte: new Date(now.getTime() - 30 * DAY) }, lotId: { notIn: [...taken, ...hidden] } },
      _count: { _all: true }, orderBy: { _count: { lotId: "desc" } }, take: 10,
    });
    const extra = await prisma.coffeeLot.findMany({
      where: { id: { in: month.map((m) => m.lotId) }, publishedAt: { not: null } }, select: LOT_LIST_SELECT,
    });
    const extraById = new Map(extra.map((r) => [r.id, r]));
    for (const m of month) {
      if (lots.length >= 5) break;
      const row = extraById.get(m.lotId);
      if (!row) continue;
      lots.push({
        ...mapLot(row as unknown as CoffeeLotRow), rank: lots.length + 1, move: null, pinned: false, reason: "added",
        brews: 0, reviews: 0, adds: m._count._all, recipes: 0,
      });
    }
  }
  return { lots, scores: current };
}

/** Roasters by the summed scores of their coffees this week (three people at least). */
export async function trendingRoasters(prisma: PrismaClient, scores: LotScore[]): Promise<TrendingRoaster[]> {
  if (scores.length === 0) return [];
  const lots = await prisma.coffeeLot.findMany({
    where: { id: { in: scores.map((s) => s.lotId) }, publishedAt: { not: null } },
    select: { id: true, imageUrl: true, roaster: { select: { slug: true, nameAr: true } } },
  });
  const lotById = new Map(lots.map((l) => [l.id, l]));
  const byRoaster = new Map<string, TrendingRoaster & { people: number; best: number }>();
  for (const s of scores) {
    const lot = lotById.get(s.lotId);
    if (!lot?.roaster) continue;
    const r = byRoaster.get(lot.roaster.slug)
      ?? { slug: lot.roaster.slug, nameAr: lot.roaster.nameAr, score: 0, coffees: 0, imageUrl: null, people: 0, best: -1 };
    r.score += s.score; r.coffees += 1; r.people += s.people;
    if (s.score > r.best && lot.imageUrl) { r.best = s.score; r.imageUrl = lot.imageUrl; }
    byRoaster.set(lot.roaster.slug, r);
  }
  return [...byRoaster.values()].filter((r) => r.people >= MIN_PEOPLE)
    .sort((a, b) => b.score - a.score).slice(0, TREND_SIZE)
    .map(({ slug, nameAr, score, coffees, imageUrl }) => ({ slug, nameAr, score: Math.round(score * 10) / 10, coffees, imageUrl }));
}

/** Published recipes by this week's likes (1) and brews logged from them in «حضّر» (3). */
export async function trendingRecipes(prisma: PrismaClient, now = new Date()): Promise<TrendingRecipe[]> {
  const since = new Date(now.getTime() - TREND_DAYS * DAY);
  const [likes, brews] = await Promise.all([
    prisma.mobileLike.groupBy({ by: ["targetId"], where: { targetType: "recipe", createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.mobileBrewExperience.groupBy({
      by: ["recipeId"], where: { createdAt: { gte: since }, recipeId: { startsWith: "recipe:" }, state: { not: "deleted" } },
      _count: { _all: true },
    }),
  ]);
  const score = new Map<string, { likes: number; brews: number }>();
  likes.forEach((l) => score.set(l.targetId, { likes: l._count._all, brews: 0 }));
  brews.forEach((b) => {
    const id = b.recipeId!.slice("recipe:".length);
    score.set(id, { likes: score.get(id)?.likes ?? 0, brews: b._count._all });
  });
  if (score.size === 0) return [];
  const rows = await prisma.mobileRecipe.findMany({
    where: { id: { in: [...score.keys()] }, state: "published" },
    select: { id: true, title: true, methodCode: true, accountId: true, lotId: true },
  });
  const [names, lots] = await Promise.all([
    displayNames(prisma, rows.map((r) => r.accountId)),
    prisma.coffeeLot.findMany({ where: { id: { in: rows.flatMap((r) => (r.lotId ? [r.lotId] : [])) } }, select: { id: true, nameAr: true } }),
  ]);
  const lotName = new Map(lots.map((l) => [l.id, l.nameAr]));
  return rows.map((r) => ({
    id: r.id, title: r.title, methodCode: r.methodCode, authorName: names.get(r.accountId) ?? "مستخدم",
    lotNameAr: r.lotId ? lotName.get(r.lotId) ?? null : null,
    likes: score.get(r.id)?.likes ?? 0, brews: score.get(r.id)?.brews ?? 0,
  }))
    .sort((a, b) => (b.likes + 3 * b.brews) - (a.likes + 3 * a.brews))
    .slice(0, TREND_SIZE);
}

// MARK: Community pulse

export interface PulseItem {
  kind: "brew" | "recipe" | "discovery";
  at: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  lotSlug: string | null;
  lotNameAr: string | null;
  recipeId: string | null;
  recipeTitle: string | null;
  methodCode: string | null;
  stars: number | null;
  note: string | null;
}

/** The latest public activity: published brews, published recipes and discoveries.
 *  People the caller follows come first; each person's activity setting is honored. */
export async function pulse(prisma: PrismaClient, viewerId: string | null, now = new Date(), limit = 8): Promise<PulseItem[]> {
  const since = new Date(now.getTime() - 30 * DAY);
  const [brews, recipes, discoveries, follows] = await Promise.all([
    prisma.mobileBrewExperience.findMany({
      where: { state: "published", createdAt: { gte: since } }, orderBy: { createdAt: "desc" }, take: 40,
      select: { accountId: true, lotId: true, methodCode: true, stars: true, note: true, createdAt: true },
    }),
    prisma.mobileRecipe.findMany({
      where: { state: "published", publishedAt: { gte: since } }, orderBy: { publishedAt: "desc" }, take: 20,
      select: { id: true, accountId: true, title: true, methodCode: true, lotId: true, publishedAt: true },
    }),
    prisma.mobileCoffeeSubmission.findMany({
      where: { status: "APPROVED", approvedLotId: { not: null }, reviewedAt: { gte: since }, accountId: { notIn: UNCREDITED_ACCOUNTS } },
      orderBy: { reviewedAt: "desc" }, take: 20, select: { accountId: true, approvedLotId: true, reviewedAt: true },
    }),
    viewerId ? prisma.mobileFollow.findMany({ where: { followerId: viewerId }, select: { followeeId: true } }) : [],
  ]);
  type Raw = Omit<PulseItem, "name" | "username" | "avatarUrl" | "lotSlug" | "lotNameAr"> & { accountId: string; lotId: string | null };
  const raw: Raw[] = [
    ...brews.map((b) => ({ kind: "brew" as const, accountId: b.accountId, lotId: b.lotId, at: b.createdAt.toISOString(),
      recipeId: null, recipeTitle: null, methodCode: b.methodCode, stars: b.stars, note: b.note.slice(0, 80) || null })),
    ...recipes.map((r) => ({ kind: "recipe" as const, accountId: r.accountId, lotId: r.lotId, at: r.publishedAt!.toISOString(),
      recipeId: r.id, recipeTitle: r.title, methodCode: r.methodCode, stars: null, note: null })),
    ...discoveries.map((d) => ({ kind: "discovery" as const, accountId: d.accountId, lotId: d.approvedLotId, at: d.reviewedAt!.toISOString(),
      recipeId: null, recipeTitle: null, methodCode: null, stars: null, note: null })),
  ];
  const ids = [...new Set(raw.map((r) => r.accountId))];
  const following = new Set(follows.map((f) => f.followeeId));
  const profiles = await prisma.mobileProfile.findMany({
    where: { accountId: { in: ids } }, select: { accountId: true, username: true, avatarPath: true, activityVisibility: true },
  });
  const profile = new Map(profiles.map((p) => [p.accountId, p]));
  const visible = raw.filter((r) => {
    const p = profile.get(r.accountId);
    return !!p && canSee(asVisibility(p.activityVisibility), r.accountId === viewerId, following.has(r.accountId));
  });
  // One line per person and coffee, followed people first, then newest.
  const seen = new Set<string>();
  const picked = visible
    .sort((a, b) => Number(following.has(b.accountId)) - Number(following.has(a.accountId)) || b.at.localeCompare(a.at))
    .filter((r) => { const k = `${r.accountId}|${r.kind}|${r.lotId ?? r.recipeId}`; if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, limit);
  const [names, lots] = await Promise.all([
    displayNames(prisma, picked.map((p) => p.accountId)),
    prisma.coffeeLot.findMany({
      where: { id: { in: picked.flatMap((p) => (p.lotId ? [p.lotId] : [])) } }, select: { id: true, slug: true, nameAr: true },
    }),
  ]);
  const lot = new Map(lots.map((l) => [l.id, l]));
  return picked.map(({ accountId, lotId, ...item }) => ({
    ...item,
    name: names.get(accountId) ?? "مستخدم",
    username: profile.get(accountId)?.username ?? null,
    avatarUrl: avatarUrl(profile.get(accountId)?.avatarPath ?? null),
    lotSlug: lotId ? lot.get(lotId)?.slug ?? null : null,
    lotNameAr: lotId ? lot.get(lotId)?.nameAr ?? null : null,
  }));
}

// MARK: «كمّل من وين وقفت»

export interface LastBrew {
  lot: MobileLot;
  experience: MobileExperience;
}

export async function lastBrew(prisma: PrismaClient, accountId: string): Promise<LastBrew | null> {
  const row = await prisma.mobileBrewExperience.findFirst({
    where: { accountId, state: { not: "deleted" } }, orderBy: [{ brewedAt: "desc" }, { createdAt: "desc" }],
  });
  if (!row) return null;
  const lot = await prisma.coffeeLot.findFirst({ where: { id: row.lotId, publishedAt: { not: null } }, select: LOT_LIST_SELECT });
  return lot ? { lot: mapLot(lot as unknown as CoffeeLotRow), experience: mapExperience(row) } : null;
}

export async function home(prisma: PrismaClient, viewerId: string | null, now = new Date()) {
  const [{ lots, scores }, recipes, feed, last] = await Promise.all([
    trendingLots(prisma, now),
    trendingRecipes(prisma, now),
    pulse(prisma, viewerId, now),
    viewerId ? lastBrew(prisma, viewerId) : Promise.resolve(null),
  ]);
  const roasters = await trendingRoasters(prisma, scores);
  return { trending: { lots, roasters, recipes }, pulse: feed, lastBrew: last };
}

// MARK: Admin

export const TrendingOverride = z.object({ mode: z.enum(["pin", "hide"]).nullable() });

export async function setTrendingOverride(
  prisma: PrismaClient, adminId: string, lotId: string, mode: "pin" | "hide" | null,
): Promise<{ mode: "pin" | "hide" | null }> {
  if (mode === null) {
    await prisma.mobileTrendingOverride.deleteMany({ where: { lotId } });
  } else {
    await prisma.mobileTrendingOverride.upsert({
      where: { lotId }, update: { mode, createdBy: adminId, createdAt: new Date() }, create: { lotId, mode, createdBy: adminId },
    });
  }
  return { mode };
}
