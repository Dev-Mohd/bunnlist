import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { isAdmin, OFFICIAL_NAME, staffIds } from "./admin";
import { assertCanPost } from "./adminUsers";
import { ApiError } from "./errors";
import { activityLevel, avatarUrl, displayNames } from "./profile";
import { canSee } from "./social";
import { blockedWith } from "./blockSet";

// Comments on published brews, recipes, reviews and the team's updates. Anyone who can see the post can read
// them; signed-in people who can post may comment (a few a minute at most). The
// author, the post's owner and admins can remove one. The team comments as «BunnList».

export const COMMENT_TARGETS = ["brew", "recipe", "review", "update"] as const;
export type CommentTarget = (typeof COMMENT_TARGETS)[number];
export const COMMENT_MAX = 500;
export const COMMENTS_PER_WINDOW = 6;
const WINDOW_MS = 2 * 60 * 1000;

export const CommentRequest = z.object({ body: z.string().trim().min(1).max(COMMENT_MAX) });

export function commentTarget(type: string): CommentTarget {
  if (!(COMMENT_TARGETS as readonly string[]).includes(type)) throw ApiError.unprocessable("bad_target");
  return type as CommentTarget;
}

export interface MobileComment {
  id: string;
  body: string;
  createdAt: string;
  name: string;
  username: string | null;
  avatarUrl: string | null;
  isMine: boolean;
  canDelete: boolean;
  /** Written by the team; shown as «BunnList» with a badge. */
  isOfficial: boolean;
}

/** The post's owner and a short title, if it exists and the viewer may see it. */
export async function postOwner(
  prisma: PrismaClient, type: CommentTarget, id: string, viewerId: string | null,
): Promise<{ ownerId: string; title: string } | null> {
  let owner: { ownerId: string; title: string } | null = null;
  if (type === "brew") {
    const b = await prisma.mobileBrewExperience.findFirst({ where: { id, state: "published" }, select: { accountId: true, lotId: true } });
    if (b) {
      const lot = await prisma.coffeeLot.findUnique({ where: { id: b.lotId }, select: { nameAr: true } });
      owner = { ownerId: b.accountId, title: lot?.nameAr ?? "قهوة" };
    }
  } else if (type === "recipe") {
    const r = await prisma.mobileRecipe.findFirst({ where: { id, state: "published" }, select: { accountId: true, title: true } });
    if (r) owner = { ownerId: r.accountId, title: r.title };
  } else if (type === "update") {
    const u = await prisma.mobileUpdate.findFirst({ where: { id, deletedAt: null }, select: { createdBy: true, title: true } });
    // Everyone may read the team's updates.
    return u ? { ownerId: u.createdBy, title: u.title } : null;
  } else {
    const r = await prisma.review.findFirst({ where: { id, status: "PUBLISHED" }, select: { userId: true, coffeeLot: { select: { nameAr: true } } } });
    if (r) owner = { ownerId: r.userId, title: r.coffeeLot.nameAr };
  }
  if (!owner) return null;
  // Blocked either way: the post isn't there for the viewer (no reading, no commenting).
  if (viewerId && owner.ownerId !== viewerId && (await blockedWith(prisma, viewerId)).has(owner.ownerId)) return null;
  if (owner.ownerId !== viewerId) {
    // A post's thread shows only to whom its owner shares activity with — the same
    // rule that hides their brews, recipes and reviews from everyone else.
    const [profile, follows] = await Promise.all([
      prisma.mobileProfile.findUnique({ where: { accountId: owner.ownerId }, select: { activityVisibility: true, isPrivate: true } }),
      viewerId
        ? prisma.mobileFollow.findUnique({ where: { followerId_followeeId: { followerId: viewerId, followeeId: owner.ownerId } } })
        : Promise.resolve(null),
    ]);
    if (!canSee(activityLevel(profile), false, !!follows)) return null;
  }
  return owner;
}

export async function listComments(prisma: PrismaClient, type: CommentTarget, id: string, viewerId: string | null): Promise<{ comments: MobileComment[]; count: number }> {
  const post = await postOwner(prisma, type, id, viewerId);
  if (!post) throw ApiError.unprocessable("post_not_found");
  const [all, blocked] = await Promise.all([
    prisma.mobileComment.findMany({ where: { targetType: type, targetId: id, deletedAt: null }, orderBy: { createdAt: "asc" }, take: 200 }),
    blockedWith(prisma, viewerId),
  ]);
  const rows = all.filter((r) => !blocked.has(r.accountId));
  const ids = [...new Set(rows.map((r) => r.accountId))];
  const [names, profiles, staff] = await Promise.all([
    displayNames(prisma, ids),
    prisma.mobileProfile.findMany({ where: { accountId: { in: ids } }, select: { accountId: true, username: true, avatarPath: true } }),
    staffIds(prisma),
  ]);
  const team = new Set(staff);
  const admin = !!viewerId && team.has(viewerId);
  const profile = new Map(profiles.map((p) => [p.accountId, p]));
  const comments = rows.map((r) => {
    const official = team.has(r.accountId);
    return {
      id: r.id, body: r.body, createdAt: r.createdAt.toISOString(),
      name: official ? OFFICIAL_NAME : names.get(r.accountId) ?? "مستخدم",
      username: official ? null : profile.get(r.accountId)?.username ?? null,
      avatarUrl: official ? null : avatarUrl(profile.get(r.accountId)?.avatarPath ?? null),
      isMine: r.accountId === viewerId,
      canDelete: !!viewerId && (r.accountId === viewerId || post.ownerId === viewerId || admin),
      isOfficial: official,
    };
  });
  return { comments, count: comments.length };
}

export async function addComment(
  prisma: PrismaClient, accountId: string, type: CommentTarget, id: string, body: string,
  onNotify?: (ownerId: string, title: string) => Promise<void>, now = new Date(),
): Promise<MobileComment> {
  await assertCanPost(prisma, accountId, now);
  const post = await postOwner(prisma, type, id, accountId);
  if (!post) throw ApiError.unprocessable("post_not_found");
  const recent = await prisma.mobileComment.count({ where: { accountId, createdAt: { gte: new Date(now.getTime() - WINDOW_MS) } } });
  if (recent >= COMMENTS_PER_WINDOW) throw ApiError.rateLimited("too_many_comments");
  const row = await prisma.mobileComment.create({ data: { targetType: type, targetId: id, accountId, body: body.trim() } });
  if (post.ownerId !== accountId && onNotify) await onNotify(post.ownerId, post.title).catch(() => undefined);
  const [names, profile, official] = await Promise.all([
    displayNames(prisma, [accountId]),
    prisma.mobileProfile.findUnique({ where: { accountId }, select: { username: true, avatarPath: true } }),
    isAdmin(prisma, accountId),
  ]);
  return {
    id: row.id, body: row.body, createdAt: row.createdAt.toISOString(),
    name: official ? OFFICIAL_NAME : names.get(accountId) ?? "مستخدم",
    username: official ? null : profile?.username ?? null,
    avatarUrl: official ? null : avatarUrl(profile?.avatarPath ?? null), isMine: true, canDelete: true, isOfficial: official,
  };
}

export async function deleteComment(prisma: PrismaClient, accountId: string, commentId: string): Promise<{ ok: true }> {
  const c = await prisma.mobileComment.findUnique({ where: { id: commentId } });
  if (!c || c.deletedAt) return { ok: true };
  let allowed = c.accountId === accountId;
  if (!allowed) {
    const post = await postOwner(prisma, c.targetType as CommentTarget, c.targetId, accountId);
    allowed = post?.ownerId === accountId || (await isAdmin(prisma, accountId));
  }
  if (!allowed) throw ApiError.forbidden("not_yours");
  await prisma.mobileComment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
  return { ok: true };
}

/** Live comment counts for posts, by "type|id". */
export async function commentCounts(prisma: PrismaClient, posts: { type: CommentTarget; id: string }[]): Promise<Map<string, number>> {
  if (!posts.length) return new Map();
  const rows = await prisma.mobileComment.groupBy({
    by: ["targetType", "targetId"],
    where: { deletedAt: null, OR: COMMENT_TARGETS.map((t) => ({ targetType: t, targetId: { in: posts.filter((p) => p.type === t).map((p) => p.id) } })) },
    _count: { _all: true },
  });
  return new Map(rows.map((r) => [`${r.targetType}|${r.targetId}`, r._count._all]));
}
