import { BrewMethod, ReviewStatus, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "./errors";

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

async function refreshReviewStats(tx: Tx, coffeeLotId: string): Promise<{ averageRating: number; reviewCount: number }> {
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
  return prisma.$transaction(async (tx) => {
    const lot = await tx.coffeeLot.findFirst({
      where: { slug, publishedAt: { not: null } },
      select: { id: true },
    });
    if (!lot) throw ApiError.unprocessable("lot_not_found");

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
}

export async function getMyReview(prisma: PrismaClient, accountId: string, slug: string): Promise<MobileReview | null> {
  const review = await prisma.review.findFirst({
    where: { coffeeLot: { slug }, userId: accountId, status: ReviewStatus.PUBLISHED },
    orderBy: { updatedAt: "desc" },
    select: { rating: true, brewMethod: true, wouldBuyAgain: true, body: true },
  });
  return review ? { ...review } : null;
}
