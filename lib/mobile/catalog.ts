import type { PrismaClient } from "@prisma/client";
import { discovererName } from "./admin";

// Read-only catalog feed for the mobile app. Returns the published coffee lots as a
// flat, display-oriented DTO (Arabic-first), independent of the website's richer page
// models. Pure `mapLot` is unit-tested; `listPublishedLots` runs the Prisma query.

export interface CoffeeLotRow {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  process: string;
  processLabel: string | null;
  flavorNotes: string[];
  roastLevel: string | null;
  averageRating: unknown; // Prisma Decimal | string | number depending on the driver
  reviewCount: number;
  imageUrl: string | null;
  roaster: { nameAr: string; name: string } | null;
  originCountry: { nameAr: string; isoCode: string } | null;
}

export interface MobileLot {
  id: string;
  slug: string;
  name: string;
  nameAr: string;
  roasterNameAr: string;
  originNameAr: string | null;
  originCode: string | null;
  process: string;
  processLabel: string | null;
  flavorNotes: string[];
  roastLevel: string | null;
  averageRating: number;
  reviewCount: number;
  imageUrl: string | null;
}

export function mapLot(row: CoffeeLotRow): MobileLot {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    nameAr: row.nameAr,
    roasterNameAr: row.roaster?.nameAr ?? "",
    originNameAr: row.originCountry?.nameAr ?? null,
    originCode: row.originCountry?.isoCode ?? null,
    process: row.process,
    processLabel: row.processLabel,
    flavorNotes: row.flavorNotes,
    roastLevel: row.roastLevel,
    averageRating: Number(row.averageRating ?? 0),
    reviewCount: row.reviewCount,
    imageUrl: row.imageUrl,
  };
}

export interface BrewStatRow {
  brewMethod: string;
  averageRating: unknown;
  reviewCount: number;
  wouldBuyAgain: number;
}

export interface CoffeeLotDetailRow extends CoffeeLotRow {
  descriptionAr: string | null;
  regionAr: string | null;
  variety: string | null;
  recommendedBrewMethods: string[];
  brewStats: BrewStatRow[];
}

export interface MobileBrewStat {
  method: string;
  averageRating: number;
  reviewCount: number;
  wouldBuyAgain: number;
}

export interface MobileLotDetail extends MobileLot {
  descriptionAr: string | null;
  regionAr: string | null;
  variety: string | null;
  recommendedBrewMethods: string[];
  brewStats: MobileBrewStat[];
  /** Name of the account whose suggestion became this lot, if still around. */
  discoveredBy?: string | null;
}

export function mapLotDetail(row: CoffeeLotDetailRow): MobileLotDetail {
  return {
    ...mapLot(row),
    descriptionAr: row.descriptionAr,
    regionAr: row.regionAr,
    variety: row.variety,
    recommendedBrewMethods: row.recommendedBrewMethods,
    brewStats: row.brewStats
      .map((s) => ({
        method: s.brewMethod,
        averageRating: Number(s.averageRating ?? 0),
        reviewCount: s.reviewCount,
        wouldBuyAgain: s.wouldBuyAgain,
      }))
      .sort((a, b) => b.reviewCount - a.reviewCount),
  };
}

export const CATALOG_PAGE_SIZE = 50;

const LOT_LIST_SELECT = {
  id: true, slug: true, name: true, nameAr: true, process: true, processLabel: true,
  flavorNotes: true, roastLevel: true, averageRating: true, reviewCount: true, imageUrl: true,
  roaster: { select: { nameAr: true, name: true } },
  originCountry: { select: { nameAr: true, isoCode: true } },
} as const;

export async function listPublishedLots(prisma: PrismaClient, limit: number = CATALOG_PAGE_SIZE): Promise<MobileLot[]> {
  const rows = await prisma.coffeeLot.findMany({
    where: { publishedAt: { not: null } },
    orderBy: [{ reviewCount: "desc" }, { createdAt: "desc" }],
    take: Math.min(Math.max(limit, 1), CATALOG_PAGE_SIZE),
    select: LOT_LIST_SELECT,
  });
  return rows.map((r) => mapLot(r as unknown as CoffeeLotRow));
}

export async function searchLots(prisma: PrismaClient, query: string, limit: number = 20): Promise<MobileLot[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const rows = await prisma.coffeeLot.findMany({
    where: {
      publishedAt: { not: null },
      OR: [
        { nameAr: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { roaster: { nameAr: { contains: q, mode: "insensitive" } } },
      ],
    },
    orderBy: [{ reviewCount: "desc" }, { createdAt: "desc" }],
    take: Math.min(Math.max(limit, 1), CATALOG_PAGE_SIZE),
    select: LOT_LIST_SELECT,
  });
  return rows.map((r) => mapLot(r as unknown as CoffeeLotRow));
}

export async function getPublishedLot(prisma: PrismaClient, slug: string): Promise<MobileLotDetail | null> {
  const row = await prisma.coffeeLot.findFirst({
    where: { slug, publishedAt: { not: null } },
    select: {
      id: true, slug: true, name: true, nameAr: true, process: true, processLabel: true,
      flavorNotes: true, roastLevel: true, averageRating: true, reviewCount: true, imageUrl: true,
      descriptionAr: true, regionAr: true, variety: true, recommendedBrewMethods: true,
      roaster: { select: { nameAr: true, name: true } },
      originCountry: { select: { nameAr: true, isoCode: true } },
      brewStats: { select: { brewMethod: true, averageRating: true, reviewCount: true, wouldBuyAgain: true } },
    },
  });
  if (!row) return null;
  return { ...mapLotDetail(row as unknown as CoffeeLotDetailRow), discoveredBy: await discovererName(prisma, row.id) };
}
