import { BrewMethod, ReviewStatus, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { commentCounts } from "./comments";
import { ApiError } from "./errors";
import { award } from "./points";
import { likeStates } from "./likes";
import { displayNames } from "./profile";
import { activityVisibleTo } from "./social";

// Mobile review submission. Mirrors the website's actions/reviews.ts aggregate
// logic (average + per-brew-method stats) but authenticates via the mobile access
// token (the account is the User id) and is addressed by lot slug. Kept separate so
// the website's server action and auth are untouched.

const REVIEW_BODY_MAX_LENGTH = 500;
const brewMethodValues = Object.values(BrewMethod) as [BrewMethod, ...BrewMethod[]];

export const MobileReviewRequest = z.object({
  rating: z.number().int().min(1).max(5),
  brewMethod: z.enum(brewMethodValues),
  wouldBuyAgain: z.boolean(),
  body: z.string().max(REVIEW_BODY_MAX_LENGTH).optional(),
});
export type MobileReviewRequest = z.infer<typeof MobileReviewRequest>;

export interface MobileReview {
  rating: number;
  brewMethod: string;
  wouldBuyAgain: boolean;
  body: string | null;
}

export interface SubmitReviewResult {
  averageRating: number;
  reviewCount: number;
  review: MobileReview;
}

/** Mean rating rounded to two decimals (matches the website). */
export function average(values: number[]): number {
  if (values.length === 0) return 0;
  return Number((values.reduce((sum, v) => sum + v, 0) / values.length).toFixed(2));
}

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

export async function refreshReviewStats(tx: Tx, coffeeLotId: string): Promise<{ averageRating: number; reviewCount: number }> {
  const published = await tx.review.findMany({
    where: { coffeeLotId, status: ReviewStatus.PUBLISHED },
    select: { rating: true, brewMethod: true, wouldBuyAgain: true },
  });

  const averageRating = average(published.map((r) => r.rating));
  const reviewCount = published.length;
  await tx.coffeeLot.update({ where: { id: coffeeLotId }, data: { averageRating, reviewCount } });

  const byMethod = new Map<BrewMethod, { ratings: number[]; wouldBuyAgain: number }>();
  for (const r of published) {
    const cur = byMethod.get(r.brewMethod) ?? { ratings: [], wouldBuyAgain: 0 };
    cur.ratings.push(r.rating);
    if (r.wouldBuyAgain) cur.wouldBuyAgain += 1;
    byMethod.set(r.brewMethod, cur);
  }

  await tx.coffeeLotBrewStat.deleteMany({ where: { coffeeLotId } });
  for (const [brewMethod, stat] of byMethod.entries()) {
    await tx.coffeeLotBrewStat.upsert({
      where: { coffeeLotId_brewMethod: { coffeeLotId, brewMethod } },
      update: { averageRating: average(stat.ratings), reviewCount: stat.ratings.length, wouldBuyAgain: stat.wouldBuyAgain },
      create: { coffeeLotId, brewMethod, averageRating: average(stat.ratings), reviewCount: stat.ratings.length, wouldBuyAgain: stat.wouldBuyAgain },
    });
  }
  return { averageRating, reviewCount };
}

export async function submitReview(
  prisma: PrismaClient,
  accountId: string,
  slug: string,
  input: MobileReviewRequest,
): Promise<SubmitReviewResult> {
  const data = MobileReviewRequest.parse(input);
  let ratedLotId = "";
  const result = await prisma.$transaction(async (tx) => {
    const lot = await tx.coffeeLot.findFirst({
      where: { slug, publishedAt: { not: null } },
      select: { id: true },
    });
    if (!lot) throw ApiError.unprocessable("lot_not_found");
    ratedLotId = lot.id;

    const review = await tx.review.upsert({
      where: { coffeeLotId_userId: { coffeeLotId: lot.id, userId: accountId } },
      update: { rating: data.rating, brewMethod: data.brewMethod, wouldBuyAgain: data.wouldBuyAgain, body: data.body ?? null },
      create: {
        coffeeLotId: lot.id, userId: accountId, rating: data.rating, brewMethod: data.brewMethod,
        wouldBuyAgain: data.wouldBuyAgain, body: data.body ?? null, status: ReviewStatus.PUBLISHED,
      },
      select: { rating: true, brewMethod: true, wouldBuyAgain: true, body: true },
    });

    const totals = await refreshReviewStats(tx, lot.id);
    return { ...totals, review: { ...review } };
  });
  await award(prisma, accountId, "rate", ratedLotId);
  return result;
}

export interface ReviewRow {
  id: string;
  rating: number;
  brewMethod: string;
  wouldBuyAgain: boolean;
  body: string | null;
  createdAt: Date;
  user: { name: string | null } | null;
}

export interface MobileReviewListItem {
  id: string;
  rating: number;
  brewMethod: string;
  wouldBuyAgain: boolean;
  body: string | null;
  authorName: string;
  createdAt: string;
  /** "مفيد" votes, whether the viewer gave one, and whether it's the viewer's own review. */
  helpfulCount?: number;
  markedHelpful?: boolean;
  isMine?: boolean;
  authorUsername?: string | null;
  commentCount?: number;
}

export function mapReview(row: ReviewRow): MobileReviewListItem {
  return {
    id: row.id,
    rating: row.rating,
    brewMethod: row.brewMethod,
    wouldBuyAgain: row.wouldBuyAgain,
    body: row.body,
    authorName: row.user?.name?.trim() || "مستخدم",
    createdAt: row.createdAt.toISOString(),
  };
}

const REVIEWS_PAGE_SIZE = 20;

export async function listReviews(
  prisma: PrismaClient, slug: string, limit = REVIEWS_PAGE_SIZE, viewerId: string | null = null,
): Promise<MobileReviewListItem[]> {
  const rows = await prisma.review.findMany({
    where: { coffeeLot: { slug, publishedAt: { not: null } }, status: ReviewStatus.PUBLISHED },
    orderBy: { createdAt: "desc" },
    take: Math.min(Math.max(limit, 1), REVIEWS_PAGE_SIZE),
    select: {
      id: true, rating: true, brewMethod: true, wouldBuyAgain: true, body: true, createdAt: true,
      userId: true,
      user: { select: { name: true } },
    },
  });
  const userIds = rows.map((r) => r.userId);
  const [names, likes, handles, visible, comments] = await Promise.all([
    displayNames(prisma, userIds),
    likeStates(prisma, "review", rows.map((r) => r.id), viewerId),
    prisma.mobileProfile.findMany({ where: { accountId: { in: userIds } }, select: { accountId: true, username: true } }),
    activityVisibleTo(prisma, viewerId, userIds),
    commentCounts(prisma, rows.map((r) => ({ type: "review" as const, id: r.id }))),
  ]);
  const handle = new Map(handles.map((h) => [h.accountId, h.username]));
  // A private account's rating still counts; who wrote it, and what, is for their followers.
  return rows.map((r) => ({
    ...mapReview(r as unknown as ReviewRow),
    ...(visible.has(r.userId) ? {} : { body: null }),
    authorName: visible.has(r.userId) ? names.get(r.userId) ?? "مستخدم" : "مستخدم",
    helpfulCount: likes.get(r.id)?.count ?? 0,
    markedHelpful: likes.get(r.id)?.liked ?? false,
    isMine: viewerId !== null && r.userId === viewerId,
    authorUsername: visible.has(r.userId) ? handle.get(r.userId) ?? null : null,
    // Comments are hidden with the author: no thread on a review you can't see.
    commentCount: visible.has(r.userId) ? comments.get(`review|${r.id}`) ?? 0 : 0,
  }));
}

export async function getMyReview(prisma: PrismaClient, accountId: string, slug: string): Promise<MobileReview | null> {
  const review = await prisma.review.findFirst({
    where: { coffeeLot: { slug }, userId: accountId, status: ReviewStatus.PUBLISHED },
    orderBy: { updatedAt: "desc" },
    select: { rating: true, brewMethod: true, wouldBuyAgain: true, body: true },
  });
  return review ? { ...review } : null;
}
