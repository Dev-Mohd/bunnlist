import type { PrismaClient } from "@prisma/client";

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

export const CATALOG_PAGE_SIZE = 50;

export async function listPublishedLots(prisma: PrismaClient, limit: number = CATALOG_PAGE_SIZE): Promise<MobileLot[]> {
  const rows = await prisma.coffeeLot.findMany({
    where: { publishedAt: { not: null } },
    orderBy: [{ reviewCount: "desc" }, { createdAt: "desc" }],
    take: Math.min(Math.max(limit, 1), CATALOG_PAGE_SIZE),
    select: {
      id: true, slug: true, name: true, nameAr: true, process: true, processLabel: true,
      flavorNotes: true, roastLevel: true, averageRating: true, reviewCount: true, imageUrl: true,
      roaster: { select: { nameAr: true, name: true } },
      originCountry: { select: { nameAr: true, isoCode: true } },
    },
  });
  return rows.map((r) => mapLot(r as unknown as CoffeeLotRow));
}
