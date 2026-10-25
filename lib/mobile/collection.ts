import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "./errors";
import { award, revoke } from "./points";

// The mobile "collection": per-account saved state for a lot (owned / favorite /
// want-to-try / tried), keyed by (account, lot). A PUT applies a partial patch over
// the existing flags; the app reads its whole collection to sync across devices.

export interface CollectionFlags {
  owned: boolean;
  favorite: boolean;
  wantsToTry: boolean;
  tried: boolean;
}

export const CollectionUpdate = z.object({
  owned: z.boolean().optional(),
  favorite: z.boolean().optional(),
  wantsToTry: z.boolean().optional(),
  tried: z.boolean().optional(),
});
export type CollectionUpdate = z.infer<typeof CollectionUpdate>;

export function defaultFlags(): CollectionFlags {
  return { owned: false, favorite: false, wantsToTry: false, tried: false };
}

export function mergeFlags(existing: CollectionFlags | undefined, patch: CollectionUpdate): CollectionFlags {
  const base = existing ?? defaultFlags();
  return {
    owned: patch.owned ?? base.owned,
    favorite: patch.favorite ?? base.favorite,
    wantsToTry: patch.wantsToTry ?? base.wantsToTry,
    tried: patch.tried ?? base.tried,
  };
}

async function lotIdForSlug(prisma: PrismaClient, slug: string): Promise<string> {
  const lot = await prisma.coffeeLot.findFirst({ where: { slug, publishedAt: { not: null } }, select: { id: true } });
  if (!lot) throw ApiError.unprocessable("lot_not_found");
  return lot.id;
}

export async function getEntry(prisma: PrismaClient, accountId: string, slug: string): Promise<CollectionFlags> {
  const lotId = await lotIdForSlug(prisma, slug);
  const row = await prisma.mobileCollectionEntry.findUnique({ where: { accountId_lotId: { accountId, lotId } } });
  return row ? pickFlags(row) : defaultFlags();
}

export async function setEntry(
  prisma: PrismaClient,
  accountId: string,
  slug: string,
  patch: CollectionUpdate,
): Promise<CollectionFlags> {
  const lotId = await lotIdForSlug(prisma, slug);
  const existing = await prisma.mobileCollectionEntry.findUnique({ where: { accountId_lotId: { accountId, lotId } } });
  const merged = mergeFlags(existing ? pickFlags(existing) : undefined, patch);
  await prisma.mobileCollectionEntry.upsert({
    where: { accountId_lotId: { accountId, lotId } },
    update: merged,
    create: { accountId, lotId, ...merged },
  });
  if (merged.owned && !existing?.owned) await award(prisma, accountId, "collect", lotId);
  if (!merged.owned && existing?.owned) await revoke(prisma, accountId, "collect", lotId);
  return merged;
}

export interface CollectionListItem extends CollectionFlags {
  lotId: string;
  slug: string;
  nameAr: string;
  roasterNameAr: string;
  originNameAr: string | null;
  originCode: string | null;
  imageUrl: string | null;
}

export async function listEntries(prisma: PrismaClient, accountId: string): Promise<CollectionListItem[]> {
  const rows = await prisma.mobileCollectionEntry.findMany({
    where: { accountId, OR: [{ owned: true }, { favorite: true }, { wantsToTry: true }, { tried: true }] },
    orderBy: { updatedAt: "desc" },
  });
  if (rows.length === 0) return [];

  const lots = await prisma.coffeeLot.findMany({
    where: { id: { in: rows.map((r) => r.lotId) }, publishedAt: { not: null } },
    select: {
      id: true, slug: true, nameAr: true, imageUrl: true,
      roaster: { select: { nameAr: true } },
      originCountry: { select: { nameAr: true, isoCode: true } },
    },
  });
  const byId = new Map(lots.map((l) => [l.id, l]));

  return rows.flatMap((r) => {
    const lot = byId.get(r.lotId);
    if (!lot) return [];
    return [{
      lotId: r.lotId, slug: lot.slug, nameAr: lot.nameAr,
      roasterNameAr: lot.roaster?.nameAr ?? "",
      originNameAr: lot.originCountry?.nameAr ?? null,
      originCode: lot.originCountry?.isoCode ?? null,
      imageUrl: lot.imageUrl ?? null,
      ...pickFlags(r),
    }];
  });
}

function pickFlags(row: { owned: boolean; favorite: boolean; wantsToTry: boolean; tried: boolean }): CollectionFlags {
  return { owned: row.owned, favorite: row.favorite, wantsToTry: row.wantsToTry, tried: row.tried };
}
