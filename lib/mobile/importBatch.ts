import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { CATALOG_ACCOUNT, SUBMISSION_PROCESSES } from "./submissions";
import type { PhotoStore } from "./suggestionPhotos";
import batch from "./data/roastery-batch-2026-05.json";
import blackKnightPhotos from "./data/black-knight-photos.json";

// Curated batches (scraped roastery catalogs, cleaned) enter as pending
// suggestions from the "catalog" account, so every coffee is reviewed in the app's
// admin screen before it is published, and nobody is credited as its discoverer.
// Re-running is safe: each item has an import key, and coffees already in the
// catalog (same roaster and name) are skipped. Bags with a bundled product photo
// (extras.photo, JPEG base64, provided by the roaster's owner) get it uploaded as
// the suggestion's photo, so approval publishes it; a re-run adds photos to
// pending imports that lack one.

const Item = z.object({
  importKey: z.string().min(1),
  name: z.string().min(2).max(120),
  nameEn: z.string().max(120).nullable().optional(),
  roasterName: z.string().min(2).max(120),
  roasterNameEn: z.string().max(120).nullable().optional(),
  originName: z.string().max(80).nullable().optional(),
  process: z.enum(SUBMISSION_PROCESSES).nullable().optional(),
  roastLevel: z.enum(["light", "medium", "dark"]).nullable().optional(),
  flavorNotes: z.array(z.string().min(1).max(40)).max(12).default([]),
  sourceUrl: z.string().url().nullable().optional(),
  sourceConfidence: z.number().min(0).max(1).nullable().optional(),
  extras: z.record(z.string(), z.unknown()).default({}),
});
export const Batch = z.object({ batch: z.string(), items: z.array(Item) });
export type Batch = z.infer<typeof Batch>;

export const BUNDLED_BATCHES: Record<string, { data: unknown; photos: Record<string, string> }> = {
  "roasteries-2026-05": { data: batch, photos: blackKnightPhotos as Record<string, string> },
};

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export async function importBatch(
  prisma: PrismaClient, raw: unknown, photos: Record<string, string> = {}, store: PhotoStore | null = null,
): Promise<{ created: number; alreadyImported: number; alreadyInCatalog: number; photos: number }> {
  const { items } = Batch.parse(raw);
  const existingRows = await prisma.mobileCoffeeSubmission.findMany({
    where: { importKey: { in: items.map((i) => i.importKey) } }, select: { id: true, importKey: true, status: true, photoPath: true },
  });
  const existing = new Map(existingRows.map((r) => [r.importKey, r]));
  let photoCount = 0;
  const uploadPhoto = async (item: z.infer<typeof Item>): Promise<string | null> => {
    const key = typeof item.extras.photo === "string" ? item.extras.photo : null;
    if (!key || !photos[key] || !store) return null;
    const path = `imports/${key}.jpg`;
    await store.put(path, Buffer.from(photos[key], "base64"));
    photoCount += 1;
    return path;
  };
  const lots = await prisma.coffeeLot.findMany({
    select: { name: true, nameAr: true, roaster: { select: { name: true, nameAr: true } } },
  });
  const inCatalog = new Set(lots.flatMap((l) => [
    `${norm(l.roaster?.nameAr)}|${norm(l.nameAr)}`, `${norm(l.roaster?.name)}|${norm(l.name)}`,
  ]));

  let created = 0, alreadyImported = 0, alreadyInCatalog = 0;
  for (const item of items) {
    const prior = existing.get(item.importKey);
    if (prior) {
      alreadyImported += 1;
      if (prior.status === "PENDING" && !prior.photoPath) {
        const photoPath = await uploadPhoto(item);
        if (photoPath) await prisma.mobileCoffeeSubmission.update({ where: { id: prior.id }, data: { photoPath } });
      }
      continue;
    }
    if (inCatalog.has(`${norm(item.roasterName)}|${norm(item.name)}`)
      || (item.nameEn && item.roasterNameEn && inCatalog.has(`${norm(item.roasterNameEn)}|${norm(item.nameEn)}`))) {
      alreadyInCatalog += 1;
      continue;
    }
    await prisma.mobileCoffeeSubmission.create({
      data: {
        accountId: CATALOG_ACCOUNT,
        importKey: item.importKey,
        name: item.name,
        nameEn: item.nameEn || null,
        roasterName: item.roasterName,
        roasterNameEn: item.roasterNameEn || null,
        originName: item.originName || null,
        process: item.process ?? null,
        roastLevel: item.roastLevel ?? null,
        flavorNotes: item.flavorNotes,
        sourceUrl: item.sourceUrl ?? null,
        sourceConfidence: item.sourceConfidence ?? null,
        extras: item.extras as object,
        photoPath: await uploadPhoto(item),
      },
    });
    created += 1;
  }
  return { created, alreadyImported, alreadyInCatalog, photos: photoCount };
}
