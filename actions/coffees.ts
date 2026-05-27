"use server";

import type {
  BrewMethod,
  CoffeeImageSource,
  CoffeeImageType,
  CoffeeProcess,
  ImagePermissionStatus,
} from "@prisma/client";
import { ReviewStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type CoffeeSort = "latest" | "top-rated" | "most-reviewed";

export type CoffeeLotQuery = {
  page?: number;
  perPage?: number;
  query?: string;
  roasterIds?: string[];
  originCountryIds?: string[];
  processingMethods?: CoffeeProcess[];
  flavorNotes?: string[];
  brewMethods?: BrewMethod[];
  sort?: CoffeeSort;
  /** الحد الأدنى لتقييم المحصول (1–5) */
  minRating?: number;
};

export type CoffeeListItem = {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  region: string | null;
  regionAr: string | null;
  process: CoffeeProcess;
  processLabel: string | null;
  flavorNotes: string[];
  recommendedBrewMethods: BrewMethod[];
  imagePath: string | null;
  imageUrl: string | null;
  storedImageUrl: string | null;
  imageStorageProvider: string | null;
  imageType: CoffeeImageType;
  imagePermissionStatus: ImagePermissionStatus;
  imageSource: CoffeeImageSource;
  imageCredit: string | null;
  imageSourceUrl: string | null;
  averageRating: number;
  reviewCount: number;
  createdAt: Date;
  roaster: {
    id: string;
    name: string;
    nameAr: string;
    cityAr: string | null;
  };
  originCountry: {
    id: string;
    nameAr: string;
    isoCode: string;
  };
};

export type PaginatedCoffeeLots = {
  items: CoffeeListItem[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

export type CoffeeReview = {
  id: string;
  userId: string;
  rating: number;
  brewMethod: BrewMethod;
  wouldBuyAgain: boolean;
  body: string | null;
  createdAt: Date;
  user: {
    name: string | null;
    image: string | null;
  };
};

export type LatestCoffeeReview = CoffeeReview & {
  coffeeLot: {
    slug: string;
    name: string;
    roaster: {
      name: string;
    };
  };
};

export type CoffeeLotDetails = CoffeeListItem & {
  farm: string | null;
  producer: string | null;
  variety: string | null;
  roastLevel: string | null;
  altitudeMeters: number | null;
  description: string | null;
  descriptionAr: string | null;
  brewStats: {
    brewMethod: BrewMethod;
    averageRating: number;
    reviewCount: number;
    wouldBuyAgain: number;
  }[];
  reviews: CoffeeReview[];
};

export type CoffeeFilterOptions = {
  roasters: { id: string; name: string; nameAr: string; cityAr: string | null }[];
  originCountries: { id: string; nameAr: string; isoCode: string }[];
  processingMethods: CoffeeProcess[];
  flavorNotes: { name: string; count: number }[];
  brewMethods: BrewMethod[];
};

const DEFAULT_PER_PAGE = 12;
const MAX_PER_PAGE = 24;
const RAW_IMPORT_DESCRIPTION_FALLBACK = "لا يوجد وصف مختصر لهذا المحصول بعد.";
const RAW_IMPORT_DESCRIPTION_MARKERS = [
  "رابط المنتج",
  "مصدر الدفعة",
  "ثقة الاستخراج",
  "bunnlist_batch",
  ".json",
  "unknown",
  "http://",
  "https://",
  "الاستيراد",
];

function normalizeList<T extends string>(values?: T[]) {
  return values?.filter(Boolean) ?? [];
}

function getPublicDescription(description: string | null) {
  if (!description) return null;

  const normalized = description.toLowerCase();
  if (RAW_IMPORT_DESCRIPTION_MARKERS.some((marker) => normalized.includes(marker.toLowerCase()))) {
    return RAW_IMPORT_DESCRIPTION_FALLBACK;
  }

  return description;
}

function toListItem(lot: {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  region: string | null;
  regionAr: string | null;
  process: CoffeeProcess;
  processLabel: string | null;
  flavorNotes: string[];
  recommendedBrewMethods: BrewMethod[];
  imagePath: string | null;
  imageUrl: string | null;
  storedImageUrl: string | null;
  imageStorageProvider: string | null;
  imageType: CoffeeImageType;
  imagePermissionStatus: ImagePermissionStatus;
  imageSource: CoffeeImageSource;
  imageCredit: string | null;
  imageSourceUrl: string | null;
  averageRating: unknown;
  reviewCount: number;
  createdAt: Date;
  roaster: { id: string; name: string; nameAr: string; cityAr: string | null };
  originCountry: { id: string; nameAr: string; isoCode: string };
}): CoffeeListItem {
  return {
    ...lot,
    name: lot.nameAr ?? lot.name,
    region: lot.regionAr ?? lot.region,
    imagePath: lot.imagePath,
    roaster: {
      ...lot.roaster,
      name: lot.roaster.nameAr ?? lot.roaster.name,
    },
    averageRating: Number(lot.averageRating),
  };
}

function getOrderBy(sort: CoffeeSort) {
  if (sort === "top-rated") {
    return [{ averageRating: "desc" as const }, { reviewCount: "desc" as const }, { createdAt: "desc" as const }];
  }

  if (sort === "most-reviewed") {
    return [{ reviewCount: "desc" as const }, { averageRating: "desc" as const }, { createdAt: "desc" as const }];
  }

  return [{ createdAt: "desc" as const }];
}

function average(values: number[]) {
  if (values.length === 0) return 0;

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

function buildUniqueBrewStats(
  reviews: { rating: number; brewMethod: BrewMethod; wouldBuyAgain: boolean }[],
) {
  const byMethod = new Map<BrewMethod, { ratings: number[]; wouldBuyAgain: number }>();

  for (const review of reviews) {
    const current = byMethod.get(review.brewMethod) ?? { ratings: [], wouldBuyAgain: 0 };
    current.ratings.push(review.rating);
    if (review.wouldBuyAgain) current.wouldBuyAgain += 1;
    byMethod.set(review.brewMethod, current);
  }

  return Array.from(byMethod.entries())
    .map(([brewMethod, stat]) => ({
      brewMethod,
      averageRating: average(stat.ratings),
      reviewCount: stat.ratings.length,
      wouldBuyAgain: stat.wouldBuyAgain,
    }))
    .sort((a, b) => b.averageRating - a.averageRating || b.reviewCount - a.reviewCount);
}

export async function getCoffeeLots(input: CoffeeLotQuery = {}): Promise<PaginatedCoffeeLots> {
  const page = Math.max(1, input.page ?? 1);
  const perPage = Math.min(MAX_PER_PAGE, Math.max(1, input.perPage ?? DEFAULT_PER_PAGE));
  const sort = input.sort ?? "latest";
  const query = input.query?.trim();
  const roasterIds = normalizeList(input.roasterIds);
  const originCountryIds = normalizeList(input.originCountryIds);
  const processingMethods = normalizeList(input.processingMethods);
  const flavorNotes = normalizeList(input.flavorNotes);
  const brewMethods = normalizeList(input.brewMethods);
  const minRating = input.minRating && input.minRating >= 1 && input.minRating <= 5
    ? input.minRating
    : undefined;

  const where = {
    publishedAt: { not: null },
    ...(sort === "top-rated" ? { reviewCount: { gt: 0 } } : {}),
    ...(query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" as const } },
            { nameAr: { contains: query, mode: "insensitive" as const } },
            { roaster: { name: { contains: query, mode: "insensitive" as const } } },
            { roaster: { nameAr: { contains: query, mode: "insensitive" as const } } },
          ],
        }
      : {}),
    ...(roasterIds.length ? { roasterId: { in: roasterIds } } : {}),
    ...(originCountryIds.length ? { originCountryId: { in: originCountryIds } } : {}),
    ...(processingMethods.length ? { process: { in: processingMethods } } : {}),
    ...(flavorNotes.length ? { flavorNotes: { hasSome: flavorNotes } } : {}),
    ...(brewMethods.length ? { recommendedBrewMethods: { hasSome: brewMethods } } : {}),
    ...(minRating ? { reviewCount: { gt: 0 }, averageRating: { gte: minRating } } : {}),
  };

  const [total, lots] = await Promise.all([
    prisma.coffeeLot.count({ where }),
    prisma.coffeeLot.findMany({
      where,
      orderBy: getOrderBy(sort),
      skip: (page - 1) * perPage,
      take: perPage,
      include: {
        roaster: { select: { id: true, name: true, nameAr: true, cityAr: true } },
        originCountry: { select: { id: true, nameAr: true, isoCode: true } },
      },
    }),
  ]);

  return {
    items: lots.map(toListItem),
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

export async function getCoffeeLotBySlug(slug: string): Promise<CoffeeLotDetails | null> {
  const lot = await prisma.coffeeLot.findFirst({
    where: {
      slug,
      publishedAt: { not: null },
    },
    include: {
      roaster: { select: { id: true, name: true, nameAr: true, cityAr: true } },
      originCountry: { select: { id: true, nameAr: true, isoCode: true } },
      reviews: {
        where: { status: ReviewStatus.PUBLISHED },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          userId: true,
          rating: true,
          brewMethod: true,
          wouldBuyAgain: true,
          body: true,
          createdAt: true,
          user: {
            select: {
              name: true,
              image: true,
            },
          },
        },
      },
    },
  });

  if (!lot) {
    return null;
  }

  const uniqueReviews = getLatestUniqueReviews(lot.reviews);
  const uniqueAverageRating = average(uniqueReviews.map((review) => review.rating));
  const uniqueReviewCount = uniqueReviews.length;
  const uniqueBrewStats = buildUniqueBrewStats(uniqueReviews);

  return {
    ...toListItem(lot),
    averageRating: uniqueAverageRating,
    reviewCount: uniqueReviewCount,
    farm: lot.farm,
    producer: lot.producer,
    variety: lot.variety,
    roastLevel: lot.roastLevel,
    altitudeMeters: lot.altitudeMeters,
    description: getPublicDescription(lot.description),
    descriptionAr: getPublicDescription(lot.descriptionAr),
    brewStats: uniqueBrewStats,
    reviews: uniqueReviews.slice(0, 10),
  };
}

export async function getLatestCoffeeReviews(limit = 3): Promise<LatestCoffeeReview[]> {
  return prisma.review.findMany({
    where: {
      status: ReviewStatus.PUBLISHED,
      coffeeLot: { publishedAt: { not: null } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      userId: true,
      rating: true,
      brewMethod: true,
      wouldBuyAgain: true,
      body: true,
      createdAt: true,
      user: {
        select: {
          name: true,
          image: true,
        },
      },
      coffeeLot: {
        select: {
          slug: true,
          name: true,
          roaster: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });
}

export async function getCoffeeFilters(): Promise<CoffeeFilterOptions> {
  const [roasters, originCountries, processingRows, lotsForFilters] = await Promise.all([
    prisma.roaster.findMany({
      orderBy: [{ nameAr: "asc" }, { name: "asc" }],
      select: { id: true, name: true, nameAr: true, cityAr: true },
    }),
    prisma.originCountry.findMany({
      orderBy: { nameAr: "asc" },
      select: { id: true, nameAr: true, isoCode: true },
    }),
    prisma.coffeeLot.findMany({
      where: { publishedAt: { not: null } },
      distinct: ["process"],
      select: { process: true },
      orderBy: { process: "asc" },
    }),
    prisma.coffeeLot.findMany({
      where: { publishedAt: { not: null } },
      select: { flavorNotes: true, recommendedBrewMethods: true },
    }),
  ]);

  const noteCounts = new Map<string, number>();
  for (const lot of lotsForFilters) {
    for (const note of lot.flavorNotes) {
      noteCounts.set(note, (noteCounts.get(note) ?? 0) + 1);
    }
  }

  const brewMethods = Array.from(
    new Set(lotsForFilters.flatMap((lot) => lot.recommendedBrewMethods)),
  ).sort();

  return {
    roasters,
    originCountries,
    processingMethods: processingRows.map((row) => row.process),
    flavorNotes: Array.from(noteCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "ar"))
      .slice(0, 20),
    brewMethods,
  };
}
