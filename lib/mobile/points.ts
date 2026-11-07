import type { PrismaClient } from "@prisma/client";
import { staffIds } from "./admin";
import { avatarUrl } from "./profile";
import { UNCREDITED_ACCOUNTS } from "./submissions";

// Points, streaks and the leaderboard. Every reward is a ledger row unique per
// (account, kind, thing), so repeating an action never pays twice and undoing it
// removes its row. Days are counted in Riyadh time. Rewards never fail the action
// that earned them.

export const POINTS = {
  collect: 5,      // a coffee added to the collection (once per coffee)
  rate: 5,         // a coffee rated (once per coffee)
  rateNote: 5,     // …with a written note of NOTE_MIN_CHARS or more (once per coffee)
  helpful: 2,      // someone marked your review «مفيد» (once per person per review)
  recipeBrewed: 3, // someone else brewed with your recipe (once per person per recipe)
  experience: 5,   // a brew logged (up to EXPERIENCE_DAILY_CAP per day)
  recipe: 20,      // a recipe published (once per recipe)
  discovery: 50,   // a suggestion approved into the catalog
  challenge: 50,   // a weekly challenge finished (the challenge sets its own points)
  streak7: 25,     // every seventh day in a row
  activity: 0,     // marks an active day for the streak
} as const;
export type PointKind = keyof typeof POINTS;

export const EXPERIENCE_DAILY_CAP = 3;

/** How many of each reward pay per Riyadh day; past it the action still counts, for 0 points. */
export const DAILY_CAPS: Partial<Record<PointKind, number>> = {
  collect: 5, rate: 5, rateNote: 5, experience: EXPERIENCE_DAILY_CAP, helpful: 5, recipeBrewed: 5,
};

/** A note this long earns the rating bonus. */
export const NOTE_MIN_CHARS = 20;

/** Levels by all-time points, shown on the points card, the profile and the leaderboard. */
export const LEVELS = [
  { min: 0, nameAr: "مبتدئ", emoji: "🌱" },
  { min: 100, nameAr: "متذوّق", emoji: "☕" },
  { min: 300, nameAr: "ذوّاق", emoji: "🫘" },
  { min: 700, nameAr: "خبير", emoji: "🏅" },
  { min: 1500, nameAr: "محمّص فخري", emoji: "👑" },
] as const;

export interface Level { nameAr: string; emoji: string; min: number; next: number | null; nextNameAr: string | null; progress: number }

export function levelFor(total: number): Level {
  let i = 0;
  while (i + 1 < LEVELS.length && total >= LEVELS[i + 1].min) i += 1;
  const cur = LEVELS[i], nxt = LEVELS[i + 1] ?? null;
  const progress = nxt ? Math.max(0, Math.min(1, (total - cur.min) / (nxt.min - cur.min))) : 1;
  return { nameAr: cur.nameAr, emoji: cur.emoji, min: cur.min, next: nxt?.min ?? null, nextNameAr: nxt?.nameAr ?? null, progress };
}

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

/**
 * Consecutive active days ending today, or yesterday when today has no activity yet.
 * One missed day per 7 is forgiven («يوم سماح»): the streak carries over it, without counting it.
 */
export function currentStreak(activeDays: Iterable<string>, today: string): number {
  const days = new Set(activeDays);
  let cursor = days.has(today) ? today : previousDay(today);
  let count = 0;
  let sinceGrace = Infinity; // active days counted since the last forgiven gap
  while (true) {
    if (days.has(cursor)) {
      count += 1; sinceGrace += 1;
      cursor = previousDay(cursor);
      continue;
    }
    // A single missing day, with activity before it, and no other forgiven day in the last 7.
    const before = previousDay(cursor);
    if (count > 0 && sinceGrace >= 7 && days.has(before)) {
      sinceGrace = 0;
      cursor = before;
      continue;
    }
    break;
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
  pointsOverride?: number,
  /** Earned from someone else's action (a «مفيد», a brew of your recipe): pays, but isn't an active day for the streak. */
  passive = false,
): Promise<void> {
  if (!accountId || accountId === "deleted") return;
  try {
    const day = riyadhDay(now);
    let points: number = pointsOverride ?? POINTS[kind];
    const cap = DAILY_CAPS[kind];
    if (cap !== undefined) {
      const today = await prisma.mobilePointEvent.count({ where: { accountId, kind, day, points: { gt: 0 } } });
      if (today >= cap) points = 0;
    }
    await insert(prisma, accountId, kind, refId, points, day);
    if (passive) return;
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
  level: Level;
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
    level: levelFor(total._sum.points ?? 0),
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
  /** All-time level, e.g. «ذوّاق». */
  levelAr: string;
  levelEmoji: string;
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
  const [hidden, staff] = await Promise.all([
    prisma.mobileProfile.findMany({ where: { hideFromLeaderboard: true }, select: { accountId: true } }),
    staffIds(prisma),
  ]);
  const hiddenIds = new Set([...hidden.map((h) => h.accountId), ...staff]);
  const ranked = (await scores(prisma, kind, period, now))
    .filter((s) => s.points > 0 && !hiddenIds.has(s.accountId) && !UNCREDITED_ACCOUNTS.includes(s.accountId))
    .sort((a, b) => b.points - a.points || a.accountId.localeCompare(b.accountId));

  const top = ranked.slice(0, limit);
  const ids = top.map((t) => t.accountId);
  const [profiles, users] = await Promise.all([
    prisma.mobileProfile.findMany({ where: { accountId: { in: ids } }, select: { accountId: true, username: true, displayName: true, avatarPath: true } }),
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
  ]);
  const totals = await prisma.mobilePointEvent.groupBy({ by: ["accountId"], where: { accountId: { in: ids } }, _sum: { points: true } });
  const totalById = new Map(totals.map((t) => [t.accountId, t._sum.points ?? 0]));
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
      levelAr: levelFor(totalById.get(t.accountId) ?? 0).nameAr,
      levelEmoji: levelFor(totalById.get(t.accountId) ?? 0).emoji,
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
