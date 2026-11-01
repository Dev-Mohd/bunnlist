import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { listEntries, type CollectionListItem } from "./collection";
import { ApiError } from "./errors";
import { pulse, type PulseItem } from "./home";
import { activityLevel, avatarUrl, normalizeUsername } from "./profile";
import { canSee } from "./social";

// Finding people: search by name or @username, suggestions (people who drink the
// same coffees, and the week's most active), the feed of people one follows, and a
// person's coffee shelves. Private accounts can be found by search but are never
// suggested, and their shelves are for followers.

const DAY = 24 * 60 * 60 * 1000;

export interface PersonCard {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  isPrivate: boolean;
  isFollowing: boolean;
  requested: boolean;
  /** Why they're suggested, in Arabic ("جربتوا ٤ قهاوي نفسها"); null in search. */
  reasonAr: string | null;
  /** For taste twins: the share of the viewer's coffees they have too (0–100). */
  sharedPercent?: number | null;
}

type ProfileRow = { accountId: string; username: string | null; displayName: string | null; avatarPath: string | null; isPrivate: boolean };

async function cards(
  prisma: PrismaClient, viewerId: string | null, rows: ProfileRow[], reason: (accountId: string) => string | null = () => null,
): Promise<PersonCard[]> {
  const ids = rows.map((r) => r.accountId);
  const [follows, requests] = viewerId && ids.length
    ? await Promise.all([
        prisma.mobileFollow.findMany({ where: { followerId: viewerId, followeeId: { in: ids } }, select: { followeeId: true } }),
        prisma.mobileFollowRequest.findMany({ where: { requesterId: viewerId, targetId: { in: ids } }, select: { targetId: true } }),
      ])
    : [[], []];
  const following = new Set(follows.map((f) => f.followeeId));
  const asked = new Set(requests.map((r) => r.targetId));
  return rows.flatMap((r) => (r.username ? [{
    username: r.username, displayName: r.displayName, avatarUrl: avatarUrl(r.avatarPath), isPrivate: r.isPrivate,
    isFollowing: following.has(r.accountId), requested: asked.has(r.accountId), reasonAr: reason(r.accountId),
  }] : []));
}

const PROFILE_SELECT = { accountId: true, username: true, displayName: true, avatarPath: true, isPrivate: true } as const;

/** People whose @username starts with, or whose name contains, the query. */
export async function searchPeople(prisma: PrismaClient, viewerId: string | null, q: string): Promise<PersonCard[]> {
  const query = q.trim().replace(/^@+/, "");
  if (query.length < 2) return [];
  const rows = await prisma.mobileProfile.findMany({
    where: {
      username: { not: null },
      ...(viewerId ? { accountId: { not: viewerId } } : {}),
      OR: [
        { username: { startsWith: normalizeUsername(query) } },
        { displayName: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { username: "asc" }, take: 20, select: PROFILE_SELECT,
  });
  return cards(prisma, viewerId, rows);
}

function arabicCount(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  return `${n.toLocaleString("ar-SA")} ${n <= 10 ? few : many}`;
}

export interface SuggestedPeople { similar: PersonCard[]; active: PersonCard[] }

/** How much of the viewer's collection someone shares, kept under 100 and shy with few coffees. */
export function sharedPercent(shared: number, mine: number): number {
  if (mine <= 0 || shared <= 0) return 0;
  return Math.min(99, Math.round((100 * shared) / Math.max(mine, 5)));
}

/**
 * People to follow: those with the most coffees in common with the viewer, and the
 * week's most active. Never the viewer, people they follow or asked, or private accounts.
 */
export async function suggestedPeople(prisma: PrismaClient, viewerId: string, now = new Date()): Promise<SuggestedPeople> {
  const [mine, follows, requests] = await Promise.all([
    prisma.mobileCollectionEntry.findMany({
      where: { accountId: viewerId, OR: [{ owned: true }, { favorite: true }, { tried: true }] }, select: { lotId: true },
    }),
    prisma.mobileFollow.findMany({ where: { followerId: viewerId }, select: { followeeId: true } }),
    prisma.mobileFollowRequest.findMany({ where: { requesterId: viewerId }, select: { targetId: true } }),
  ]);
  const skip = new Set([viewerId, ...follows.map((f) => f.followeeId), ...requests.map((r) => r.targetId)]);
  const since = new Date(now.getTime() - 7 * DAY);
  const [shared, brews, recipes] = await Promise.all([
    mine.length
      ? prisma.mobileCollectionEntry.groupBy({
          by: ["accountId"],
          where: { lotId: { in: mine.map((m) => m.lotId) }, accountId: { notIn: [...skip] }, OR: [{ owned: true }, { favorite: true }, { tried: true }] },
          _count: { lotId: true }, orderBy: { _count: { lotId: "desc" } }, take: 30,
        })
      : Promise.resolve([]),
    prisma.mobileBrewExperience.groupBy({
      by: ["accountId"], where: { createdAt: { gte: since }, state: { not: "deleted" }, accountId: { notIn: [...skip] } },
      _count: { _all: true }, orderBy: { _count: { accountId: "desc" } }, take: 30,
    }),
    prisma.mobileRecipe.groupBy({
      by: ["accountId"], where: { publishedAt: { gte: since }, state: "published", accountId: { notIn: [...skip] } },
      _count: { _all: true },
    }),
  ]);
  const sharedBy = new Map(shared.map((s) => [s.accountId, s._count.lotId]));
  const brewsBy = new Map(brews.map((b) => [b.accountId, b._count._all]));
  const recipesBy = new Map(recipes.map((r) => [r.accountId, r._count._all]));
  const activeIds = [...new Set([...brewsBy.keys(), ...recipesBy.keys()])]
    .sort((a, b) => (brewsBy.get(b) ?? 0) + 2 * (recipesBy.get(b) ?? 0) - (brewsBy.get(a) ?? 0) - 2 * (recipesBy.get(a) ?? 0));

  const profiles = await prisma.mobileProfile.findMany({
    where: { accountId: { in: [...sharedBy.keys(), ...activeIds] }, username: { not: null }, isPrivate: false },
    select: { ...PROFILE_SELECT, activityVisibility: true },
  });
  // Only people whose activity is open to everyone are suggested for it.
  const open = new Map(profiles.filter((p) => canSee(activityLevel(p), false, false)).map((p) => [p.accountId, p]));
  const pick = (ids: string[]) => ids.flatMap((id) => (open.has(id) ? [open.get(id)!] : [])).slice(0, 10);

  const similar = (await cards(prisma, viewerId, pick([...sharedBy.keys()]), (id) => {
    const n = sharedBy.get(id) ?? 0;
    return `جربتوا ${arabicCount(n, "قهوة وحدة", "قهوتين", "قهاوي", "قهوة")} نفسها`;
  })).map((card) => {
    const id = [...open.values()].find((p) => p.username === card.username)?.accountId;
    return { ...card, sharedPercent: id ? sharedPercent(sharedBy.get(id) ?? 0, mine.length) : null };
  });
  const shownSimilar = new Set(similar.map((s) => s.username));
  const active = (await cards(prisma, viewerId, pick(activeIds), (id) => {
    const parts = [];
    const b = brewsBy.get(id) ?? 0, r = recipesBy.get(id) ?? 0;
    if (b) parts.push(arabicCount(b, "تحضيرة", "تحضيرتين", "تحضيرات", "تحضيرة"));
    if (r) parts.push(arabicCount(r, "وصفة", "وصفتين", "وصفات", "وصفة"));
    return parts.length ? `هالأسبوع: ${parts.join(" · ")}` : null;
  })).filter((p) => !shownSimilar.has(p.username));
  return { similar, active };
}

/** What the people the viewer follows brewed, wrote and discovered lately. */
export async function followingFeed(prisma: PrismaClient, viewerId: string, now = new Date()): Promise<PulseItem[]> {
  const follows = await prisma.mobileFollow.findMany({ where: { followerId: viewerId }, select: { followeeId: true } });
  if (follows.length === 0) return [];
  return pulse(prisma, viewerId, now, 40, follows.map((f) => f.followeeId));
}

export const SHELVES = ["owned", "tried", "favorite", "wantsToTry"] as const;
export const Shelf = z.enum(SHELVES);
export type Shelf = z.infer<typeof Shelf>;

export interface PersonCoffees { counts: Record<Shelf, number>; coffees: CollectionListItem[] }

/** A person's coffees on one shelf, with the count of every shelf; for those allowed to see their activity. */
export async function personCoffees(
  prisma: PrismaClient, viewerId: string | null, username: string, shelf: Shelf,
): Promise<PersonCoffees> {
  const owner = await prisma.mobileProfile.findUnique({
    where: { username: normalizeUsername(username) }, select: { accountId: true, activityVisibility: true, isPrivate: true },
  });
  if (!owner) throw ApiError.unprocessable("user_not_found");
  const isMe = viewerId === owner.accountId;
  const follows = viewerId && !isMe
    ? !!(await prisma.mobileFollow.findUnique({ where: { followerId_followeeId: { followerId: viewerId, followeeId: owner.accountId } } }))
    : false;
  if (!canSee(activityLevel(owner), isMe, follows)) throw new ApiError("forbidden", "hidden_by_owner");
  const all = await listEntries(prisma, owner.accountId);
  const counts = Object.fromEntries(SHELVES.map((s) => [s, all.filter((c) => c[s]).length])) as Record<Shelf, number>;
  return { counts, coffees: all.filter((c) => c[shelf]) };
}
