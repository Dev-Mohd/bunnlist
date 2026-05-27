"use server";

import { revalidatePath } from "next/cache";
import { BrewMethod, ReviewStatus, type Review } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { requireAuth } from "@/lib/auth-helpers";
import { checkRateLimit } from "@/lib/rate-limit";

const REVIEW_BODY_MAX_LENGTH = 500;
const REVIEWS_PER_PAGE = 10;

const brewMethodValues = Object.values(BrewMethod) as [BrewMethod, ...BrewMethod[]];

const reviewInputSchema = z.object({
  coffeeLotId: z.string().min(1, "المحصول غير صحيح."),
  rating: z.number().int().min(1, "اختر التقييم.").max(5, "التقييم غير صحيح."),
  brewMethod: z.enum(brewMethodValues, { error: "اختر طريقة التحضير." }),
  wouldBuyAgain: z.boolean({ error: "اختر هل تشتريه مرة ثانية." }),
  body: z.string().max(REVIEW_BODY_MAX_LENGTH, "نص التجربة يجب ألا يتجاوز 500 حرف.").optional(),
});

const coffeeLotIdSchema = z.string().min(1);
const pageSchema = z.coerce.number().int().min(1).default(1);

export type ReviewActionResult =
  | { success: true; reviewId: string }
  | { success: false; error: string };

export type ReviewWithUser = {
  id: string;
  coffeeLotId: string;
  userId: string;
  rating: number;
  brewMethod: BrewMethod;
  wouldBuyAgain: boolean;
  body: string | null;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
};

export type UserReviewForCoffeeLot = Pick<
  Review,
  "id" | "coffeeLotId" | "userId" | "rating" | "brewMethod" | "wouldBuyAgain" | "body"
>;

function getRetryMessage(retryAfter?: number) {
  const minutes = Math.max(1, Math.ceil((retryAfter ?? 60) / 60));
  return `وصلت للحد المسموح من المحاولات. حاول مرة أخرى بعد ${minutes} دقائق.`;
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(2));
}

function getLatestUniqueReviews<T extends { userId: string; createdAt: Date }>(reviews: T[]) {
  const byUser = new Map<string, T>();

  for (const review of reviews) {
    if (!byUser.has(review.userId)) {
      byUser.set(review.userId, review);
    }
  }

  return Array.from(byUser.values());
}

async function refreshReviewStats(coffeeLotId: string, tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) {
  const publishedReviews = await tx.review.findMany({
    where: {
      coffeeLotId,
      status: ReviewStatus.PUBLISHED,
    },
    select: {
      rating: true,
      brewMethod: true,
      wouldBuyAgain: true,
    },
  });

  await tx.coffeeLot.update({
    where: { id: coffeeLotId },
    data: {
      averageRating: average(publishedReviews.map((review) => review.rating)),
      reviewCount: publishedReviews.length,
    },
  });

  const statsByMethod = new Map<
    BrewMethod,
    { ratings: number[]; wouldBuyAgain: number }
  >();

  for (const review of publishedReviews) {
    const current = statsByMethod.get(review.brewMethod) ?? {
      ratings: [],
      wouldBuyAgain: 0,
    };

    current.ratings.push(review.rating);
    if (review.wouldBuyAgain) current.wouldBuyAgain += 1;
    statsByMethod.set(review.brewMethod, current);
  }

  await tx.coffeeLotBrewStat.deleteMany({ where: { coffeeLotId } });

  for (const [brewMethod, stat] of statsByMethod.entries()) {
    await tx.coffeeLotBrewStat.upsert({
      where: {
        coffeeLotId_brewMethod: {
          coffeeLotId,
          brewMethod,
        },
      },
      update: {
        averageRating: average(stat.ratings),
        reviewCount: stat.ratings.length,
        wouldBuyAgain: stat.wouldBuyAgain,
      },
      create: {
        coffeeLotId,
        brewMethod,
        averageRating: average(stat.ratings),
        reviewCount: stat.ratings.length,
        wouldBuyAgain: stat.wouldBuyAgain,
      },
    });
  }
}

export async function createOrUpdateReview(input: {
  coffeeLotId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  brewMethod: BrewMethod;
  wouldBuyAgain: boolean;
  body?: string;
}): Promise<ReviewActionResult> {
  const session = await requireAuth();
  const userId = session.user.id;

  if (!userId) {
    return { success: false, error: "يجب تسجيل الدخول لإضافة تقييم." };
  }

  const parsed = reviewInputSchema.safeParse({
    ...input,
    body: input.body?.trim() || undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? "بيانات التقييم غير صحيحة.",
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const rateLimit = await checkRateLimit(
        {
          action: "CREATE_REVIEW",
          userId,
          targetId: parsed.data.coffeeLotId,
        },
        tx,
      );

      if (!rateLimit.allowed) {
        return {
          success: false as const,
          error: getRetryMessage(rateLimit.retryAfter),
        };
      }

      const coffeeLot = await tx.coffeeLot.findFirst({
        where: {
          id: parsed.data.coffeeLotId,
          publishedAt: { not: null },
        },
        select: {
          id: true,
          slug: true,
        },
      });

      if (!coffeeLot) {
        return { success: false as const, error: "المحصول غير موجود." };
      }

      const review = await tx.review.upsert({
        where: {
          coffeeLotId_userId: {
            coffeeLotId: coffeeLot.id,
            userId,
          },
        },
        update: {
          rating: parsed.data.rating,
          brewMethod: parsed.data.brewMethod,
          wouldBuyAgain: parsed.data.wouldBuyAgain,
          body: parsed.data.body ?? null,
          // Do NOT reset status here — preserve any HIDDEN/FLAGGED decision made by an admin.
          // status is only set on create (below).
        },
        create: {
          coffeeLotId: coffeeLot.id,
          userId,
          rating: parsed.data.rating,
          brewMethod: parsed.data.brewMethod,
          wouldBuyAgain: parsed.data.wouldBuyAgain,
          body: parsed.data.body ?? null,
          status: ReviewStatus.PUBLISHED,
        },
        select: {
          id: true,
        },
      });

      await refreshReviewStats(coffeeLot.id, tx);

      return {
        success: true as const,
        reviewId: review.id,
        slug: coffeeLot.slug,
      };
    });

    if (result.success) {
      revalidatePath(`/coffees/${result.slug}`);
      revalidatePath("/coffees");
      revalidatePath("/");
      return { success: true, reviewId: result.reviewId };
    }

    return result;
  } catch (error) {
    console.error(error);
    return {
      success: false,
      error: "تعذر حفظ التقييم الآن. حاول مرة أخرى.",
    };
  }
}

export async function getReviewsByCoffeeLot(coffeeLotId: string, page = 1): Promise<{
  reviews: ReviewWithUser[];
  totalPages: number;
  currentPage: number;
}> {
  const parsedCoffeeLotId = coffeeLotIdSchema.safeParse(coffeeLotId);
  if (!parsedCoffeeLotId.success) {
    return { reviews: [], totalPages: 1, currentPage: 1 };
  }

  const currentPage = pageSchema.catch(1).parse(page);

  const reviews = await prisma.review.findMany({
    where: {
      coffeeLotId: parsedCoffeeLotId.data,
      status: ReviewStatus.PUBLISHED,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      coffeeLotId: true,
      userId: true,
      rating: true,
      brewMethod: true,
      wouldBuyAgain: true,
      body: true,
      createdAt: true,
      updatedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
    },
  });

  const uniqueReviews = getLatestUniqueReviews(reviews);
  const paginatedReviews = uniqueReviews.slice(
    (currentPage - 1) * REVIEWS_PER_PAGE,
    currentPage * REVIEWS_PER_PAGE,
  );

  return {
    reviews: paginatedReviews,
    totalPages: Math.max(1, Math.ceil(uniqueReviews.length / REVIEWS_PER_PAGE)),
    currentPage,
  };
}

export type MyReview = {
  id: string;
  rating: number;
  brewMethod: BrewMethod;
  wouldBuyAgain: boolean;
  body: string | null;
  createdAt: Date;
    coffeeLot: {
      id: string;
      slug: string;
      nameAr: string;
      imagePath: string | null;
      imageUrl: string | null;
      storedImageUrl: string | null;
      imageStorageProvider: string | null;
      imageType: string;
      imagePermissionStatus: string;
      roaster: { nameAr: string };
    };
};

export async function getMyReviews(): Promise<MyReview[]> {
  const session = await auth();
  if (!session?.user?.id) return [];

  return prisma.review.findMany({
    where: { userId: session.user.id, status: ReviewStatus.PUBLISHED },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      brewMethod: true,
      wouldBuyAgain: true,
      body: true,
      createdAt: true,
      coffeeLot: {
        select: {
          id: true,
          slug: true,
          nameAr: true,
          imagePath: true,
          imageUrl: true,
          storedImageUrl: true,
          imageStorageProvider: true,
          imageType: true,
          imagePermissionStatus: true,
          roaster: { select: { nameAr: true } },
        },
      },
    },
  });
}

export async function getUserReviewForCoffeeLot(coffeeLotId: string): Promise<UserReviewForCoffeeLot | null> {
  const session = await auth();
  if (!session?.user?.id) {
    return null;
  }

  const parsedCoffeeLotId = coffeeLotIdSchema.safeParse(coffeeLotId);
  if (!parsedCoffeeLotId.success) {
    return null;
  }

  return prisma.review.findFirst({
    where: {
      coffeeLotId: parsedCoffeeLotId.data,
      userId: session.user.id,
      status: ReviewStatus.PUBLISHED,
    },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      coffeeLotId: true,
      userId: true,
      rating: true,
      brewMethod: true,
      wouldBuyAgain: true,
      body: true,
    },
  });
}
