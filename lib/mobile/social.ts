import type { PrismaClient } from "@prisma/client";
import { mapLot, LOT_LIST_SELECT, type CoffeeLotRow, type MobileLot } from "./catalog";
import { ApiError } from "./errors";
import { avatarUrl, normalizeUsername } from "./profile";

// Public profiles and following. A profile is reachable only by @username (no raw
// account ids leave the server) and shows what the person already made public:
// name, bio, picture, points, approved discoveries and published recipes.

async function accountIdFor(prisma: PrismaClient, username: string): Promise<string> {
  const profile = await prisma.mobileProfile.findUnique({
    where: { username: normalizeUsername(username) }, select: { accountId: true },
  });
  if (!profile) throw ApiError.unprocessable("user_not_found");
  return profile.accountId;
}

export interface PublicRecipe { id: string; title: string; methodCode: string; lotNameAr: string | null }

export interface PublicProfile {
  username: string;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  points: number;
  followers: number;
  following: number;
  isFollowing: boolean;
  isMe: boolean;
  discoveries: MobileLot[];
  recipes: PublicRecipe[];
}

export async function publicProfile(prisma: PrismaClient, username: string, viewerId: string | null): Promise<PublicProfile> {
  const accountId = await accountIdFor(prisma, username);
  const [profile, user, points, followers, following, followRow, approved, recipes] = await Promise.all([
    prisma.mobileProfile.findUnique({ where: { accountId } }),
    prisma.user.findUnique({ where: { id: accountId }, select: { name: true } }),
    prisma.mobilePointEvent.aggregate({ where: { accountId }, _sum: { points: true } }),
    prisma.mobileFollow.count({ where: { followeeId: accountId } }),
    prisma.mobileFollow.count({ where: { followerId: accountId } }),
    viewerId ? prisma.mobileFollow.findUnique({ where: { followerId_followeeId: { followerId: viewerId, followeeId: accountId } } }) : null,
    prisma.mobileCoffeeSubmission.findMany({
      where: { accountId, status: "APPROVED", approvedLotId: { not: null } },
      orderBy: { reviewedAt: "desc" }, take: 10, select: { approvedLotId: true },
    }),
    prisma.mobileRecipe.findMany({
      where: { accountId, state: "published" }, orderBy: { publishedAt: "desc" }, take: 10,
      select: { id: true, title: true, methodCode: true, lotId: true },
    }),
  ]);

  const lotIds = [...approved.map((a) => a.approvedLotId as string), ...recipes.map((r) => r.lotId).filter((id): id is string => !!id)];
  const lots = lotIds.length
    ? await prisma.coffeeLot.findMany({ where: { id: { in: lotIds }, publishedAt: { not: null } }, select: LOT_LIST_SELECT })
    : [];
  const lotById = new Map(lots.map((l) => [l.id, l]));

  return {
    username: profile?.username ?? normalizeUsername(username),
    displayName: profile?.displayName ?? (user?.name?.trim() || null),
    bio: profile?.bio ?? null,
    avatarUrl: avatarUrl(profile?.avatarPath ?? null),
    points: points._sum.points ?? 0,
    followers,
    following,
    isFollowing: !!followRow,
    isMe: viewerId === accountId,
    discoveries: approved.flatMap((a) => {
      const lot = lotById.get(a.approvedLotId as string);
      return lot ? [mapLot(lot as unknown as CoffeeLotRow)] : [];
    }),
    recipes: recipes.map((r) => ({
      id: r.id, title: r.title, methodCode: r.methodCode, lotNameAr: r.lotId ? lotById.get(r.lotId)?.nameAr ?? null : null,
    })),
  };
}

export async function follow(prisma: PrismaClient, viewerId: string, username: string): Promise<{ following: true }> {
  const accountId = await accountIdFor(prisma, username);
  if (accountId === viewerId) throw ApiError.unprocessable("cannot_follow_self");
  await prisma.mobileFollow.upsert({
    where: { followerId_followeeId: { followerId: viewerId, followeeId: accountId } },
    update: {}, create: { followerId: viewerId, followeeId: accountId },
  });
  return { following: true };
}

export async function unfollow(prisma: PrismaClient, viewerId: string, username: string): Promise<{ following: false }> {
  const accountId = await accountIdFor(prisma, username);
  await prisma.mobileFollow.deleteMany({ where: { followerId: viewerId, followeeId: accountId } });
  return { following: false };
}

export interface PersonRow { username: string; displayName: string | null; avatarUrl: string | null }

/** Who follows this person ("followers") or whom they follow ("following"); people without a username are skipped. */
export async function followList(
  prisma: PrismaClient, username: string, which: "followers" | "following",
): Promise<PersonRow[]> {
  const accountId = await accountIdFor(prisma, username);
  const rows = await prisma.mobileFollow.findMany({
    where: which === "followers" ? { followeeId: accountId } : { followerId: accountId },
    orderBy: { createdAt: "desc" }, take: 200,
  });
  const ids = rows.map((r) => (which === "followers" ? r.followerId : r.followeeId));
  if (ids.length === 0) return [];
  const profiles = await prisma.mobileProfile.findMany({
    where: { accountId: { in: ids }, username: { not: null } },
    select: { accountId: true, username: true, displayName: true, avatarPath: true },
  });
  const byId = new Map(profiles.map((p) => [p.accountId, p]));
  return ids.flatMap((id) => {
    const p = byId.get(id);
    return p?.username ? [{ username: p.username, displayName: p.displayName, avatarUrl: avatarUrl(p.avatarPath) }] : [];
  });
}
