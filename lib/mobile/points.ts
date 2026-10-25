import type { PrismaClient } from "@prisma/client";
import { avatarUrl } from "./profile";
import { DELETED_ACCOUNT } from "./submissions";

// Points, streaks and the leaderboard. Every reward is a ledger row unique per
// (account, kind, thing), so repeating an action never pays twice and undoing it
// removes its row. Days are counted in Riyadh time. Rewards never fail the action
// that earned them.

export const POINTS = {
  collect: 5,      // a coffee added to the collection (once per coffee)
  rate: 10,        // a coffee rated (once per coffee)
  experience: 5,   // a brew logged (up to EXPERIENCE_DAILY_CAP per day)
  recipe: 20,      // a recipe published (once per recipe)
  discovery: 50,   // a suggestion approved into the catalog
  streak7: 25,     // every seventh day in a row
  activity: 0,     // marks an active day for the streak
} as const;
export type PointKind = keyof typeof POINTS;

export const EXPERIENCE_DAILY_CAP = 3;

/** "YYYY-MM-DD" of the date in Riyadh. */
export function riyadhDay(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh", year: "numeric", month: "2-digit", day: "2-digit" })
    .format(date);
}

function previousDay(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Consecutive active days ending today, or yesterday when today has no activity yet. */
export function currentStreak(activeDays: Iterable<string>, today: string): number {
  const days = new Set(activeDays);
  let cursor = days.has(today) ? today : previousDay(today);
  let count = 0;
  while (days.has(cursor)) {
    count += 1;
    cursor = previousDay(cursor);
  }
  return count;
}

async function insert(prisma: PrismaClient, accountId: string, kind: PointKind, refId: string, points: number, day: string) {
  try {
    await prisma.mobilePointEvent.create({ data: { accountId, kind, refId, points, day } });
    return true;
  } catch {
    return false; // already rewarded (unique), which is the point
  }
}

/** Rewards an action and records the active day; a seventh day in a row adds the streak bonus. */
export async function award(
  prisma: PrismaClient, accountId: string, kind: Exclude<PointKind, "activity" | "streak7">, refId: string, now = new Date(),
): Promise<void> {
  if (!accountId || accountId === "deleted") return;
  try {
    const day = riyadhDay(now);
    let points: number = POINTS[kind];
    if (kind === "experience") {
      const today = await prisma.mobilePointEvent.count({ where: { accountId, kind: "experience", day, points: { gt: 0 } } });
      if (today >= EXPERIENCE_DAILY_CAP) points = 0;
    }
    await insert(prisma, accountId, kind, refId, points, day);
    const firstToday = await insert(prisma, accountId, "activity", day, 0, day);
    if (firstToday) {
      const days = await prisma.mobilePointEvent.findMany({
        where: { accountId, kind: "activity" }, select: { day: true }, orderBy: { day: "desc" }, take: 400,
      });
      const streak = currentStreak(days.map((d) => d.day), day);
      if (streak > 0 && streak % 7 === 0) await insert(prisma, accountId, "streak7", day, POINTS.streak7, day);
    }
  } catch (err) {
    console.error("points award failed", err);
  }
}

/** Takes back the reward for something undone (deleted, unmarked). */
export async function revoke(prisma: PrismaClient, accountId: string, kind: PointKind, refId: string): Promise<void> {
  try {
    await prisma.mobilePointEvent.deleteMany({ where: { accountId, kind, refId } });
  } catch (err) {
    console.error("points revoke failed", err);
  }
}

export interface PointsSummary {
  total: number;
  week: number;
  streak: number;
  recent: { kind: string; points: number; createdAt: string }[];
}

export async function pointsSummary(prisma: PrismaClient, accountId: string, now = new Date()): Promise<PointsSummary> {
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const [total, week, days, recent] = await Promise.all([
    prisma.mobilePointEvent.aggregate({ where: { accountId }, _sum: { points: true } }),
    prisma.mobilePointEvent.aggregate({ where: { accountId, createdAt: { gte: weekAgo } }, _sum: { points: true } }),
    prisma.mobilePointEvent.findMany({ where: { accountId, kind: "activity" }, select: { day: true }, orderBy: { day: "desc" }, take: 400 }),
    prisma.mobilePointEvent.findMany({
      where: { accountId, points: { gt: 0 } }, orderBy: { createdAt: "desc" }, take: 15,
      select: { kind: true, points: true, createdAt: true },
    }),
  ]);
  return {
    total: total._sum.points ?? 0,
    week: week._sum.points ?? 0,
    streak: currentStreak(days.map((d) => d.day), riyadhDay(now)),
    recent: recent.map((r) => ({ kind: r.kind, points: r.points, createdAt: r.createdAt.toISOString() })),
  };
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  points: number;
  isMe: boolean;
}

export const LEADERBOARD_KINDS = ["points", "discoverers", "raters", "helpful"] as const;
export type LeaderboardKind = (typeof LEADERBOARD_KINDS)[number];

/**
 * Rankings, with hidden accounts left out and ties sharing a rank. `points` is the
 * score of the kind: points earned (this week or all time), approved discoveries,
 * or coffees rated. `period` applies to points only.
 */
export async function leaderboard(
  prisma: PrismaClient, period: "week" | "all", viewerId: string | null, now = new Date(), limit = 50,
  kind: LeaderboardKind = "points",
): Promise<{ entries: LeaderboardEntry[]; me: { rank: number; points: number } | null }> {
  const hidden = await prisma.mobileProfile.findMany({ where: { hideFromLeaderboard: true }, select: { accountId: true } });
  const hiddenIds = new Set(hidden.map((h) => h.accountId));
  const ranked = (await scores(prisma, kind, period, now))
    .filter((s) => s.points > 0 && !hiddenIds.has(s.accountId) && s.accountId !== DELETED_ACCOUNT)
    .sort((a, b) => b.points - a.points || a.accountId.localeCompare(b.accountId));

  const top = ranked.slice(0, limit);
  const ids = top.map((t) => t.accountId);
  const [profiles, users] = await Promise.all([
    prisma.mobileProfile.findMany({ where: { accountId: { in: ids } }, select: { accountId: true, username: true, displayName: true, avatarPath: true } }),
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
  ]);
  const profileById = new Map(profiles.map((p) => [p.accountId, p]));
  const userName = new Map(users.map((u) => [u.id, u.name?.trim() || null]));

  // Ties share a rank.
  let lastPoints = -1;
  let lastRank = 0;
  const entries = top.map((t, i) => {
    const rank = t.points === lastPoints ? lastRank : i + 1;
    lastPoints = t.points;
    lastRank = rank;
    const p = profileById.get(t.accountId);
    return {
      rank,
      name: p?.displayName?.trim() || userName.get(t.accountId) || (p?.username ? `@${p.username}` : "مستخدم"),
      username: p?.username ?? null,
      avatarUrl: avatarUrl(p?.avatarPath ?? null),
      points: t.points,
      isMe: t.accountId === viewerId,
    };
  });

  let me: { rank: number; points: number } | null = null;
  if (viewerId) {
    const index = ranked.findIndex((r) => r.accountId === viewerId);
    if (index >= 0) {
      const points = ranked[index].points;
      me = { rank: ranked.findIndex((r) => r.points === points) + 1, points };
    }
  }
  return { entries, me };
}

async function scores(
  prisma: PrismaClient, kind: LeaderboardKind, period: "week" | "all", now: Date,
): Promise<{ accountId: string; points: number }[]> {
  if (kind === "discoverers") {
    const rows = await prisma.mobileCoffeeSubmission.groupBy({
      by: ["accountId"], where: { status: "APPROVED" }, _count: { _all: true },
    });
    return rows.map((r) => ({ accountId: r.accountId, points: r._count._all }));
  }
  if (kind === "helpful") {
    // "أفضل تعليق": the most "مفيد" votes received on one's reviews.
    const rows = await prisma.mobileLike.groupBy({
      by: ["ownerId"], where: { targetType: "review" }, _count: { _all: true },
    });
    return rows.map((r) => ({ accountId: r.ownerId, points: r._count._all }));
  }
  if (kind === "raters") {
    const rows = await prisma.mobilePointEvent.groupBy({
      by: ["accountId"], where: { kind: "rate" }, _count: { _all: true },
    });
    return rows.map((r) => ({ accountId: r.accountId, points: r._count._all }));
  }
  const since = period === "week" ? new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) : undefined;
  const sums = await prisma.mobilePointEvent.groupBy({
    by: ["accountId"],
    where: { points: { gt: 0 }, ...(since ? { createdAt: { gte: since } } : {}) },
    _sum: { points: true },
  });
  return sums.map((s) => ({ accountId: s.accountId, points: s._sum.points ?? 0 }));
}
