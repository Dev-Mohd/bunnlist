import type { PrismaClient } from "@prisma/client";
import { LOT_LIST_SELECT, mapLot, type CoffeeLotRow, type MobileLot } from "./catalog";
import { activityLevel, displayNames } from "./profile";
import { canSee } from "./social";
import { MIN_RATINGS, scoreMatch, type RatedCoffee } from "./tasteMatch";

// The app's home, for one signed-in person: today's coffee picked for their taste,
// coffees they own but haven't rated, what's new from the roasters they collect,
// and what the people they follow are drinking this week.

const DAY = 24 * 60 * 60 * 1000;
export const NEWS_DAYS = 30;
export const FRIENDS_DAYS = 7;
const POOL = 12;

export interface DailyPick {
  lot: MobileLot;
  /** 0–100 once they rated enough coffees; null before. */
  score: number | null;
  /** Why it fits, in Arabic. */
  reason: string;
}

export interface ResumeItem { lot: MobileLot; since: string }
export interface RoasterNews {
  roasterNameAr: string;
  /** Newest first. */
  lots: { slug: string; nameAr: string; imageUrl: string | null; publishedAt: string }[];
}
export interface FriendsDrinking { lot: MobileLot; names: string[]; people: number }

export interface ForYou {
  dailyPick: DailyPick | null;
  resume: ResumeItem[];
  roasterNews: RoasterNews[];
  friendsDrinking: FriendsDrinking[];
}

/** The day in Riyadh (UTC+3), so the pick changes at local midnight. */
export function riyadhDay(now: Date): string {
  return new Date(now.getTime() + 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

/** A small stable hash, so each person gets their own pick for the day. */
export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** One of the best few, the same all day for this person, different tomorrow. */
export function pickOfTheDay<T extends { id: string; score: number }>(scored: T[], accountId: string, day: string): T | null {
  if (!scored.length) return null;
  const pool = [...scored].sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, POOL);
  return pool[hash(`${accountId}|${day}`) % pool.length];
}

/** Roasters' new coffees grouped by roaster, roasters with the newest first. */
export function groupNews(rows: { roasterNameAr: string; slug: string; nameAr: string; imageUrl: string | null; publishedAt: Date }[]): RoasterNews[] {
  const by = new Map<string, RoasterNews["lots"]>();
  for (const r of [...rows].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())) {
    const list = by.get(r.roasterNameAr) ?? [];
    if (list.length < 6) list.push({ slug: r.slug, nameAr: r.nameAr, imageUrl: r.imageUrl, publishedAt: r.publishedAt.toISOString() });
    by.set(r.roasterNameAr, list);
  }
  return [...by.entries()].map(([roasterNameAr, lots]) => ({ roasterNameAr, lots })).slice(0, 12);
}

/** The coffees most people brewed, one person counted once per coffee. */
export function topShared(rows: { lotId: string; accountId: string }[], limit = 3): { lotId: string; people: string[] }[] {
  const by = new Map<string, Set<string>>();
  for (const r of rows) by.set(r.lotId, (by.get(r.lotId) ?? new Set()).add(r.accountId));
  return [...by.entries()]
    .map(([lotId, people]) => ({ lotId, people: [...people] }))
    .sort((a, b) => b.people.length - a.people.length || a.lotId.localeCompare(b.lotId))
    .slice(0, limit);
}

async function dailyPick(prisma: PrismaClient, accountId: string, now: Date): Promise<DailyPick | null> {
  const [reviews, entries] = await Promise.all([
    prisma.review.findMany({
      where: { userId: accountId, status: "PUBLISHED" },
      select: { rating: true, coffeeLotId: true, coffeeLot: { select: { flavorNotes: true, process: true, originCountry: { select: { isoCode: true } } } } },
      take: 500,
    }),
    prisma.mobileCollectionEntry.findMany({ where: { accountId }, select: { lotId: true } }),
  ]);
  const seen = new Set([...reviews.map((r) => r.coffeeLotId), ...entries.map((e) => e.lotId)]);
  const candidates = await prisma.coffeeLot.findMany({
    where: { publishedAt: { not: null }, imageUrl: { not: null }, id: { notIn: [...seen] } },
    select: { ...LOT_LIST_SELECT },
    take: 1000,
  });
  if (!candidates.length) return null;
  const rated: RatedCoffee[] = reviews.map((r) => ({
    rating: r.rating, notes: r.coffeeLot.flavorNotes, process: r.coffeeLot.process, origin: r.coffeeLot.originCountry?.isoCode ?? null,
  }));
  const day = riyadhDay(now);
  if (rated.length < MIN_RATINGS) {
    // Not enough ratings yet: one of the best-rated coffees with notes.
    const scored = candidates.filter((c) => c.flavorNotes.length > 0)
      .map((c) => ({ id: c.id, row: c, score: Number(c.averageRating ?? 0) * 10 + Math.min(c.reviewCount, 20) }));
    const pick = pickOfTheDay(scored, accountId, day);
    return pick ? { lot: mapLot(pick.row as unknown as CoffeeLotRow), score: null, reason: "من الأعلى تقييمًا عند الناس، قيّم ٣ قهاوي ونختار لك على ذوقك" } : null;
  }
  const scored = candidates.map((c) => {
    const m = scoreMatch(rated, { notes: c.flavorNotes, process: c.process, origin: c.originCountry?.isoCode ?? null }, c.originCountry?.nameAr ?? null);
    return { id: c.id, row: c, score: m.score ?? 0, reasons: m.reasons };
  });
  const pick = pickOfTheDay(scored, accountId, day);
  if (!pick) return null;
  const why = pick.reasons.filter((r) => r.positive).map((r) => r.text).slice(0, 2).join("، ");
  return { lot: mapLot(pick.row as unknown as CoffeeLotRow), score: pick.score, reason: why || "قريبة من القهاوي اللي قيّمتها عالي" };
}

async function resume(prisma: PrismaClient, accountId: string): Promise<ResumeItem[]> {
  const owned = await prisma.mobileCollectionEntry.findMany({
    where: { accountId, owned: true }, orderBy: { updatedAt: "desc" }, take: 20, select: { lotId: true, updatedAt: true },
  });
  if (!owned.length) return [];
  const ids = owned.map((o) => o.lotId);
  const [reviewed, brewed] = await Promise.all([
    prisma.review.findMany({ where: { userId: accountId, coffeeLotId: { in: ids } }, select: { coffeeLotId: true } }),
    prisma.mobileBrewExperience.findMany({ where: { accountId, lotId: { in: ids }, state: { not: "deleted" } }, select: { lotId: true } }),
  ]);
  const done = new Set([...reviewed.map((r) => r.coffeeLotId), ...brewed.map((b) => b.lotId)]);
  const open = owned.filter((o) => !done.has(o.lotId)).slice(0, 3);
  if (!open.length) return [];
  const lots = await prisma.coffeeLot.findMany({
    where: { id: { in: open.map((o) => o.lotId) }, publishedAt: { not: null } }, select: LOT_LIST_SELECT,
  });
  const byId = new Map(lots.map((l) => [l.id, l]));
  return open.flatMap((o) => {
    const lot = byId.get(o.lotId);
    return lot ? [{ lot: mapLot(lot as unknown as CoffeeLotRow), since: o.updatedAt.toISOString() }] : [];
  });
}

async function roasterNews(prisma: PrismaClient, accountId: string, now: Date): Promise<RoasterNews[]> {
  const entries = await prisma.mobileCollectionEntry.findMany({ where: { accountId }, select: { lotId: true } });
  if (!entries.length) return [];
  const mine = entries.map((e) => e.lotId);
  const roasters = await prisma.coffeeLot.findMany({ where: { id: { in: mine } }, select: { roasterId: true }, distinct: ["roasterId"] });
  const rows = await prisma.coffeeLot.findMany({
    where: {
      roasterId: { in: roasters.map((r) => r.roasterId) }, id: { notIn: mine },
      publishedAt: { gte: new Date(now.getTime() - NEWS_DAYS * DAY) },
    },
    select: { slug: true, nameAr: true, imageUrl: true, publishedAt: true, roaster: { select: { nameAr: true } } },
    orderBy: { publishedAt: "desc" }, take: 80,
  });
  return groupNews(rows.map((r) => ({
    roasterNameAr: r.roaster.nameAr, slug: r.slug, nameAr: r.nameAr, imageUrl: r.imageUrl, publishedAt: r.publishedAt!,
  })));
}

async function friendsDrinking(prisma: PrismaClient, accountId: string, now: Date): Promise<FriendsDrinking[]> {
  const follows = await prisma.mobileFollow.findMany({ where: { followerId: accountId }, select: { followeeId: true } });
  if (!follows.length) return [];
  const ids = follows.map((f) => f.followeeId);
  const [brews, profiles] = await Promise.all([
    prisma.mobileBrewExperience.findMany({
      where: { accountId: { in: ids }, state: "published", createdAt: { gte: new Date(now.getTime() - FRIENDS_DAYS * DAY) } },
      select: { accountId: true, lotId: true }, take: 500,
    }),
    prisma.mobileProfile.findMany({ where: { accountId: { in: ids } }, select: { accountId: true, activityVisibility: true, isPrivate: true } }),
  ]);
  // They follow these people, so activity open to followers counts.
  const open = new Set(profiles.filter((p) => canSee(activityLevel(p), false, true)).map((p) => p.accountId));
  const top = topShared(brews.filter((b) => open.has(b.accountId)));
  if (!top.length) return [];
  const [lots, names] = await Promise.all([
    prisma.coffeeLot.findMany({ where: { id: { in: top.map((t) => t.lotId) }, publishedAt: { not: null } }, select: LOT_LIST_SELECT }),
    displayNames(prisma, top.flatMap((t) => t.people.slice(0, 3))),
  ]);
  const byId = new Map(lots.map((l) => [l.id, l]));
  return top.flatMap((t) => {
    const lot = byId.get(t.lotId);
    return lot ? [{
      lot: mapLot(lot as unknown as CoffeeLotRow),
      names: t.people.slice(0, 3).map((p) => names.get(p) ?? "مستخدم"),
      people: t.people.length,
    }] : [];
  });
}

export async function forYou(prisma: PrismaClient, accountId: string, now = new Date()): Promise<ForYou> {
  const [pick, open, news, friends] = await Promise.all([
    dailyPick(prisma, accountId, now),
    resume(prisma, accountId),
    roasterNews(prisma, accountId, now),
    friendsDrinking(prisma, accountId, now),
  ]);
  return { dailyPick: pick, resume: open, roasterNews: news, friendsDrinking: friends };
}
