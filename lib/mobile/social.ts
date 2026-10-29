import type { PrismaClient } from "@prisma/client";
import { mapLot, LOT_LIST_SELECT, type CoffeeLotRow, type MobileLot } from "./catalog";
import { ApiError } from "./errors";
import { activityLevel, asVisibility, avatarUrl, normalizeUsername, type Visibility } from "./profile";

// Public profiles and following. A profile is reachable only by @username (no raw
// account ids leave the server) and shows what the person already made public:
// name, bio, picture, points, approved discoveries and published recipes. Owners
// choose who sees their followers, whom they follow, and their activity. A private
// account approves each follower (a follow becomes a request), and its activity,
// coffees and follow lists are for followers only.

/** Whether `viewerId` may see something the owner set to `level`. */
export function canSee(level: Visibility, isOwner: boolean, viewerFollowsOwner: boolean): boolean {
  if (isOwner) return true;
  if (level === "everyone") return true;
  return level === "followers" && viewerFollowsOwner;
}

/**
 * Of these accounts, the ones whose activity `viewerId` may see (their own included),
 * by each owner's activity setting and whether the account is private.
 */
export async function activityVisibleTo(prisma: PrismaClient, viewerId: string | null, accountIds: string[]): Promise<Set<string>> {
  const ids = [...new Set(accountIds)];
  if (ids.length === 0) return new Set();
  const [profiles, follows] = await Promise.all([
    prisma.mobileProfile.findMany({ where: { accountId: { in: ids } }, select: { accountId: true, activityVisibility: true, isPrivate: true } }),
    viewerId ? prisma.mobileFollow.findMany({ where: { followerId: viewerId, followeeId: { in: ids } }, select: { followeeId: true } }) : [],
  ]);
  const following = new Set(follows.map((f) => f.followeeId));
  const profile = new Map(profiles.map((p) => [p.accountId, p]));
  return new Set(ids.filter((id) => canSee(activityLevel(profile.get(id)), id === viewerId, following.has(id))));
}

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
  /** null when the owner keeps it from this viewer. */
  followers: number | null;
  following: number | null;
  activityHidden: boolean;
  isFollowing: boolean;
  /** Followers need the owner's approval. */
  isPrivate: boolean;
  /** The viewer has asked to follow and is waiting. */
  requested: boolean;
  isMe: boolean;
  discoveries: MobileLot[];
  recipes: PublicRecipe[];
}

export async function publicProfile(prisma: PrismaClient, username: string, viewerId: string | null): Promise<PublicProfile> {
  const accountId = await accountIdFor(prisma, username);
  const [profile, user, points, followers, following, followRow, approved, recipes, requestRow] = await Promise.all([
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
    viewerId ? prisma.mobileFollowRequest.findUnique({ where: { requesterId_targetId: { requesterId: viewerId, targetId: accountId } } }) : null,
  ]);

  const isMe = viewerId === accountId;
  const follows = !!followRow;
  const showFollowers = canSee(asVisibility(profile?.followersVisibility), isMe, follows);
  const showFollowing = canSee(asVisibility(profile?.followingVisibility), isMe, follows);
  const showActivity = canSee(activityLevel(profile), isMe, follows);
  if (!showActivity) { approved.length = 0; recipes.length = 0; }

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
    followers: showFollowers ? followers : null,
    following: showFollowing ? following : null,
    activityHidden: !showActivity,
    isFollowing: follows,
    isPrivate: profile?.isPrivate ?? false,
    requested: !!requestRow,
    isMe,
    discoveries: approved.flatMap((a) => {
      const lot = lotById.get(a.approvedLotId as string);
      return lot ? [mapLot(lot as unknown as CoffeeLotRow)] : [];
    }),
    recipes: recipes.map((r) => ({
      id: r.id, title: r.title, methodCode: r.methodCode, lotNameAr: r.lotId ? lotById.get(r.lotId)?.nameAr ?? null : null,
    })),
  };
}

/** What following someone did: followed, or (a private account) asked. */
export interface FollowResult { following: boolean; requested: boolean }

/**
 * Follows someone, or asks to when their account is private. `onNew` runs only for a
 * new follow or a new request (not a repeat), e.g. to notify them.
 */
export async function follow(
  prisma: PrismaClient, viewerId: string, username: string,
  onNew?: (followeeId: string, kind: "follow" | "request") => Promise<unknown>,
): Promise<FollowResult> {
  const accountId = await accountIdFor(prisma, username);
  if (accountId === viewerId) throw ApiError.unprocessable("cannot_follow_self");
  const key = { followerId: viewerId, followeeId: accountId };
  const [existing, owner] = await Promise.all([
    prisma.mobileFollow.findUnique({ where: { followerId_followeeId: key } }),
    prisma.mobileProfile.findUnique({ where: { accountId }, select: { isPrivate: true } }),
  ]);
  if (existing) return { following: true, requested: false };
  if (owner?.isPrivate) {
    const request = { requesterId: viewerId, targetId: accountId };
    const asked = await prisma.mobileFollowRequest.findUnique({ where: { requesterId_targetId: request } });
    if (!asked) {
      await prisma.mobileFollowRequest.create({ data: request });
      await onNew?.(accountId, "request");
    }
    return { following: false, requested: true };
  }
  await prisma.mobileFollow.upsert({ where: { followerId_followeeId: key }, update: {}, create: key });
  await onNew?.(accountId, "follow");
  return { following: true, requested: false };
}

/** Unfollows, or withdraws a pending request. */
export async function unfollow(prisma: PrismaClient, viewerId: string, username: string): Promise<FollowResult> {
  const accountId = await accountIdFor(prisma, username);
  await prisma.$transaction([
    prisma.mobileFollow.deleteMany({ where: { followerId: viewerId, followeeId: accountId } }),
    prisma.mobileFollowRequest.deleteMany({ where: { requesterId: viewerId, targetId: accountId } }),
  ]);
  return { following: false, requested: false };
}

/** People waiting for the owner's approval, newest first. */
export async function followRequests(prisma: PrismaClient, ownerId: string): Promise<PersonRow[]> {
  const rows = await prisma.mobileFollowRequest.findMany({ where: { targetId: ownerId }, orderBy: { createdAt: "desc" }, take: 200 });
  return peopleRows(prisma, rows.map((r) => r.requesterId));
}

/** Accepts or declines someone's request; `onAccepted` can tell them. */
export async function answerFollowRequest(
  prisma: PrismaClient, ownerId: string, username: string, accept: boolean,
  onAccepted?: (requesterId: string) => Promise<unknown>,
): Promise<{ ok: true }> {
  const requesterId = await accountIdFor(prisma, username);
  const removed = await prisma.mobileFollowRequest.deleteMany({ where: { requesterId, targetId: ownerId } });
  if (accept && removed.count > 0) {
    const key = { followerId: requesterId, followeeId: ownerId };
    await prisma.mobileFollow.upsert({ where: { followerId_followeeId: key }, update: {}, create: key });
    await onAccepted?.(requesterId);
  }
  return { ok: true };
}

/** Takes someone off the owner's followers, quietly. */
export async function removeFollower(prisma: PrismaClient, ownerId: string, username: string): Promise<{ ok: true }> {
  const followerId = await accountIdFor(prisma, username);
  await prisma.mobileFollow.deleteMany({ where: { followerId, followeeId: ownerId } });
  return { ok: true };
}

export interface PersonRow { username: string; displayName: string | null; avatarUrl: string | null }

/** Who follows this person ("followers") or whom they follow ("following"); people without a username are skipped. */
export async function followList(
  prisma: PrismaClient, username: string, which: "followers" | "following", viewerId: string | null = null,
): Promise<PersonRow[]> {
  const accountId = await accountIdFor(prisma, username);
  if (viewerId !== accountId) {
    const [owner, viewerFollows] = await Promise.all([
      prisma.mobileProfile.findUnique({
        where: { accountId }, select: { followersVisibility: true, followingVisibility: true, isPrivate: true },
      }),
      viewerId
        ? prisma.mobileFollow.findUnique({ where: { followerId_followeeId: { followerId: viewerId, followeeId: accountId } } })
        : null,
    ]);
    const set = asVisibility(which === "followers" ? owner?.followersVisibility : owner?.followingVisibility);
    const level: Visibility = owner?.isPrivate && set === "everyone" ? "followers" : set;
    if (!canSee(level, false, !!viewerFollows)) throw new ApiError("forbidden", "hidden_by_owner");
  }
  const rows = await prisma.mobileFollow.findMany({
    where: which === "followers" ? { followeeId: accountId } : { followerId: accountId },
    orderBy: { createdAt: "desc" }, take: 200,
  });
  return peopleRows(prisma, rows.map((r) => (which === "followers" ? r.followerId : r.followeeId)));
}

/** People in the given order; those without a username are skipped. */
export async function peopleRows(prisma: PrismaClient, ids: string[]): Promise<PersonRow[]> {
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
