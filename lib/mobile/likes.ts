import type { PrismaClient } from "@prisma/client";
import { ApiError } from "./errors";

// Likes: "مفيد" on a published review, "أعجبني" on a published recipe. One per
// person per thing; never on your own. The author is kept on the row so the
// most-helpful ranking and notifications don't need to look it up again.

export const LIKE_TARGETS = ["review", "recipe"] as const;
export type LikeTarget = (typeof LIKE_TARGETS)[number];

export interface LikeState { count: number; liked: boolean }

/** Author and a short title of a published target, or null when there is none. */
async function target(prisma: PrismaClient, type: LikeTarget, id: string): Promise<{ ownerId: string; title: string } | null> {
  if (type === "review") {
    const review = await prisma.review.findFirst({
      where: { id, status: "PUBLISHED" }, select: { userId: true, coffeeLot: { select: { nameAr: true } } },
    });
    return review ? { ownerId: review.userId, title: review.coffeeLot.nameAr } : null;
  }
  const recipe = await prisma.mobileRecipe.findFirst({ where: { id, state: "published" }, select: { accountId: true, title: true } });
  return recipe ? { ownerId: recipe.accountId, title: recipe.title } : null;
}

/** `onNewLike` runs only for a new like (e.g. to notify the author). */
export async function like(
  prisma: PrismaClient, accountId: string, type: LikeTarget, id: string,
  onNewLike?: (ownerId: string, title: string) => Promise<unknown>,
): Promise<LikeState> {
  const found = await target(prisma, type, id);
  if (!found) throw ApiError.unprocessable("not_found");
  if (found.ownerId === accountId) throw ApiError.unprocessable("cannot_like_own");
  const key = { accountId_targetType_targetId: { accountId, targetType: type, targetId: id } };
  const existing = await prisma.mobileLike.findUnique({ where: key });
  if (!existing) {
    await prisma.mobileLike.upsert({ where: key, update: {}, create: { accountId, targetType: type, targetId: id, ownerId: found.ownerId } });
    await onNewLike?.(found.ownerId, found.title);
  }
  return { count: await prisma.mobileLike.count({ where: { targetType: type, targetId: id } }), liked: true };
}

export async function unlike(prisma: PrismaClient, accountId: string, type: LikeTarget, id: string): Promise<LikeState> {
  await prisma.mobileLike.deleteMany({ where: { accountId, targetType: type, targetId: id } });
  return { count: await prisma.mobileLike.count({ where: { targetType: type, targetId: id } }), liked: false };
}

/** Counts and the viewer's own likes for many targets at once. */
export async function likeStates(
  prisma: PrismaClient, type: LikeTarget, ids: string[], viewerId: string | null,
): Promise<Map<string, LikeState>> {
  const states = new Map(ids.map((id) => [id, { count: 0, liked: false }]));
  if (ids.length === 0) return states;
  const [counts, mine] = await Promise.all([
    prisma.mobileLike.groupBy({ by: ["targetId"], where: { targetType: type, targetId: { in: ids } }, _count: { _all: true } }),
    viewerId
      ? prisma.mobileLike.findMany({ where: { accountId: viewerId, targetType: type, targetId: { in: ids } }, select: { targetId: true } })
      : Promise.resolve([]),
  ]);
  for (const c of counts) states.set(c.targetId, { count: c._count._all, liked: false });
  for (const m of mine) {
    const s = states.get(m.targetId);
    if (s) s.liked = true;
  }
  return states;
}
