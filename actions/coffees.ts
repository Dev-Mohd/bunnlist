"use server";

import type { BrewMethod, CoffeeProcess } from "@prisma/client";
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

function normalizeList<T extends string>(values?: T[]) {
  return values?.filter(Boolean) ?? [];
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
  averageRating: unknown;
  reviewCount: number;
  createdAt: Date;
  roaster: { id: string; name: string; nameAr: string; cityAr: string | null };
  originCountry: { id: string; nameAr: string; isoCode: string };
}): CoffeeListItem {
  return {
    ...lot,
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
      brewStats: {
        orderBy: [{ averageRating: "desc" }, { reviewCount: "desc" }],
        select: {
          brewMethod: true,
          averageRating: true,
          reviewCount: true,
          wouldBuyAgain: true,
        },
      },
      reviews: {
        where: { status: ReviewStatus.PUBLISHED },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
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

  return {
    ...toListItem(lot),
    farm: lot.farm,
    producer: lot.producer,
    variety: lot.variety,
    roastLevel: lot.roastLevel,
    altitudeMeters: lot.altitudeMeters,
    description: lot.description,
    descriptionAr: lot.descriptionAr,
    brewStats: lot.brewStats.map((stat) => ({
      ...stat,
      averageRating: Number(stat.averageRating),
    })),
    reviews: lot.reviews,
  };
}

export async function getCoffeeFilters(): Promise<CoffeeFilterOptions> {
  const [roasters, originCountries, processingRows, lotsForNotes, brewRows] = await Promise.all([
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
      select: { flavorNotes: true },
    }),
    prisma.coffeeLot.findMany({
      where: { publishedAt: { not: null } },
      select: { recommendedBrewMethods: true },
    }),
  ]);

  const noteCounts = new Map<string, number>();
  for (const lot of lotsForNotes) {
    for (const note of lot.flavorNotes) {
      noteCounts.set(note, (noteCounts.get(note) ?? 0) + 1);
    }
  }

  const brewMethods = Array.from(
    new Set(brewRows.flatMap((lot) => lot.recommendedBrewMethods)),
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
