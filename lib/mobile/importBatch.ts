import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { CATALOG_ACCOUNT, SUBMISSION_PROCESSES } from "./submissions";
import { readExtras } from "./admin";
import { approvalFor } from "./adminBulk";
import type { PhotoStore } from "./suggestionPhotos";
import batch from "./data/roastery-batch-2026-05.json";
import arriyadhPhotos from "./data/arriyadh-photos.json";
import ashPhotos from "./data/ash-photos.json";
import blackKnightPhotos from "./data/black-knight-photos.json";
import bunistaPhotos from "./data/bunista-photos.json";
import shovelPhotos from "./data/shovel-photos.json";
import roastingHousePhotos from "./data/roasting-house-photos.json";
import camelStepPhotos from "./data/camel-step-photos.json";
import yahimPhotos from "./data/yahim-photos.json";
import officialPhotos from "./data/official-photos.json";
import soutAsantePhotos from "./data/sout-asante-photos.json";

// Curated batches (scraped roastery catalogs, cleaned) enter as pending
// suggestions from the "catalog" account, so every coffee is reviewed in the app's
// admin screen before it is published, and nobody is credited as its discoverer.
// Re-running is safe: each item has an import key, and coffees already in the
// catalog (same roaster and name) are skipped. Bags with a bundled product photo
// (extras.photo, JPEG base64, provided by the roaster's owner) get it uploaded as
// the suggestion's photo, so approval publishes it; a re-run adds photos to
// pending imports that lack one, and refreshes their details from the batch.

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
  "roasteries-2026-05": {
    data: batch,
    photos: {
      ...(blackKnightPhotos as Record<string, string>),
      ...(arriyadhPhotos as Record<string, string>),
      ...(bunistaPhotos as Record<string, string>),
      ...(ashPhotos as Record<string, string>),
      ...(shovelPhotos as Record<string, string>),
      ...(roastingHousePhotos as Record<string, string>),
      ...(camelStepPhotos as Record<string, string>),
      ...(yahimPhotos as Record<string, string>),
      ...(officialPhotos as Record<string, string>),
      ...(soutAsantePhotos as Record<string, string>),
    },
  },
};

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** The suggestion fields a batch item sets. */
function fields(item: z.infer<typeof Item>) {
  return {
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
  };
}

export async function importBatch(
  prisma: PrismaClient, raw: unknown, photos: Record<string, string> = {}, store: PhotoStore | null = null,
  /** Stop taking new items after this many ms (the route's time limit); the rest wait for the next run. */
  budgetMs = Infinity,
): Promise<{
  created: number; alreadyImported: number; alreadyInCatalog: number; photos: number; photoErrors: number; remaining: number;
  /** Published coffees whose missing details the batch filled in. */
  filled: number;
}> {
  const startedAt = Date.now();
  const { items } = Batch.parse(raw);
  const existingRows = await prisma.mobileCoffeeSubmission.findMany({
    where: { importKey: { in: items.map((i) => i.importKey) } }, select: { id: true, importKey: true, status: true, photoPath: true, approvedLotId: true },
  });
  const existing = new Map(existingRows.map((r) => [r.importKey, r]));
  let photoCount = 0;
  // A photo's path carries a hash of its bytes, so a re-cropped photo is a new
  // file (no stale caches) and an unchanged one is never uploaded twice.
  const photoOf = (item: z.infer<typeof Item>) => {
    const key = typeof item.extras.photo === "string" ? item.extras.photo : null;
    if (!key || !photos[key]) return null;
    const version = createHash("sha1").update(photos[key]).digest("hex").slice(0, 8);
    return { key, version, path: `imports/${key}-${version}.jpg` };
  };
  const uploadPhoto = async (item: z.infer<typeof Item>): Promise<string | null> => {
    const photo = photoOf(item);
    if (!photo || !store) return null;
    await store.put(photo.path, Buffer.from(photos[photo.key], "base64"));
    photoCount += 1;
    return photo.path;
  };
  const approvedLots = new Map((await prisma.coffeeLot.findMany({
    where: { id: { in: existingRows.flatMap((r) => (r.status === "APPROVED" && r.approvedLotId ? [r.approvedLotId] : [])) } },
    select: {
      id: true, slug: true, imageUrl: true, imageType: true, process: true, flavorNotes: true, descriptionAr: true,
      regionAr: true, region: true, variety: true, roastLevel: true, originCountry: { select: { isoCode: true } },
    },
  })).map((l) => [l.id, l]));
  const lots = await prisma.coffeeLot.findMany({
    select: { name: true, nameAr: true, roaster: { select: { name: true, nameAr: true } } },
  });
  const inCatalog = new Set(lots.flatMap((l) => [
    `${norm(l.roaster?.nameAr)}|${norm(l.nameAr)}`, `${norm(l.roaster?.name)}|${norm(l.name)}`,
  ]));

  let created = 0, alreadyImported = 0, alreadyInCatalog = 0, photoErrors = 0, remaining = 0, filled = 0;
  // A few items at a time: each one waits on storage, and the whole run has to
  // finish inside the route's time limit.
  await eachLimited(items, 6, async (item) => {
    const prior = existing.get(item.importKey);
    // Out of time: new coffees wait for the next run (already-imported ones are cheap to pass).
    if (!prior && Date.now() - startedAt > budgetMs) { remaining += 1; return; }
    if (prior) {
      alreadyImported += 1;
      if (prior.status === "PENDING") {
        // Still under review: bring it up to date (newer batch data, a newer photo).
        const photoPath = prior.photoPath === photoOf(item)?.path ? null : await uploadPhoto(item);
        await prisma.mobileCoffeeSubmission.update({
          where: { id: prior.id },
          data: { ...fields(item), ...(photoPath ? { photoPath } : {}) },
        });
      } else if (prior.status === "APPROVED" && prior.approvedLotId) {
        const published = approvedLots.get(prior.approvedLotId);
        if (published) {
          try {
            if (await fillMissing(prisma, published, item)) filled += 1;
          } catch (e) {
            console.error("import fill failed", published.slug, e);
          }
        }
        // Already published with an import photo: swap in the newer photo. A lot
        // whose picture was since replaced on the website is left alone, and so is
        // one published from this very photo (approval names its file by time, not
        // by the photo's hash, so the URL alone can't tell).
        const lot = approvedLots.get(prior.approvedLotId);
        const photo = photoOf(item);
        const current = prior.photoPath === photo?.path || !!(photo && lot?.imageUrl?.endsWith(`-${photo.version}.jpg`));
        if (lot && photo && store && lot.imageType === "USER_UPLOADED" && !current) {
          // A photo that won't go up leaves the lot's current one; the rest of the batch carries on.
          try {
            const path = await uploadPhoto(item);
            const imageUrl = await store.publish(path as string, `lots/${lot.slug}-${photo.version}.jpg`);
            await prisma.coffeeLot.update({
              where: { id: lot.id }, data: { imageUrl, storedImageUrl: imageUrl, imageStoredAt: new Date() },
            });
            await prisma.mobileCoffeeSubmission.update({ where: { id: prior.id }, data: { photoPath: path } });
          } catch (e) {
            console.error("import photo swap failed", lot.slug, e);
            photoErrors += 1;
          }
        }
      }
      return;
    }
    if (inCatalog.has(`${norm(item.roasterName)}|${norm(item.name)}`)
      || (item.nameEn && item.roasterNameEn && inCatalog.has(`${norm(item.roasterNameEn)}|${norm(item.nameEn)}`))) {
      alreadyInCatalog += 1;
      return;
    }
    await prisma.mobileCoffeeSubmission.create({
      data: {
        accountId: CATALOG_ACCOUNT,
        importKey: item.importKey,
        ...fields(item),
        photoPath: await uploadPhoto(item),
      },
    });
    created += 1;
  });
  return { created, alreadyImported, alreadyInCatalog, photos: photoCount, photoErrors, remaining, filled };
}

/** Runs `fn` over the items with at most `limit` in flight. */
async function eachLimited<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  const worker = async () => {
    while (next < items.length) await fn(items[next++]);
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}

type PublishedLot = {
  id: string; process: string; flavorNotes: string[]; descriptionAr: string | null; regionAr: string | null; region: string | null;
  variety: string | null; roastLevel: string | null; originCountry: { isoCode: string } | null;
};
const ROAST_AR: Record<string, string> = { light: "فاتح", medium: "متوسط", dark: "غامق" };

/**
 * Fills a published coffee's missing details from a newer batch: a blend origin, an
 * OTHER process, no notes, no description, region, variety or roast. Whatever the
 * admin already set is left as it is. True when something was filled.
 */
async function fillMissing(prisma: PrismaClient, lot: PublishedLot, item: z.infer<typeof Item>): Promise<boolean> {
  const extras = readExtras(item.extras);
  const data: Record<string, unknown> = {};
  if (lot.originCountry?.isoCode === "XB" && item.originName) {
    try {
      const form = await approvalFor(prisma, {
        name: item.name, nameEn: item.nameEn ?? null, roasterName: item.roasterName, roasterNameEn: item.roasterNameEn ?? null,
        originName: item.originName, process: item.process ?? null, roastLevel: item.roastLevel ?? null, flavorNotes: item.flavorNotes,
      });
      if (form.originCode !== "XB") {
        const origin = await prisma.originCountry.findUnique({ where: { isoCode: form.originCode } })
          ?? await prisma.originCountry.create({ data: { isoCode: form.originCode, nameAr: form.originNameAr } });
        data.originCountryId = origin.id;
      }
    } catch {
      // An origin we can't place stays a blend.
    }
  }
  if (lot.process === "OTHER" && item.process && item.process !== "OTHER") data.process = item.process;
  if (lot.flavorNotes.length === 0 && item.flavorNotes.length) data.flavorNotes = item.flavorNotes;
  if (!lot.descriptionAr && extras.descriptionAr) data.descriptionAr = extras.descriptionAr;
  if (!lot.regionAr && !lot.region && extras.region) data.regionAr = extras.region;
  if (!lot.variety && extras.variety?.length) data.variety = extras.variety.join("، ");
  if (!lot.roastLevel && item.roastLevel) data.roastLevel = ROAST_AR[item.roastLevel];
  if (Object.keys(data).length === 0) return false;
  await prisma.coffeeLot.update({ where: { id: lot.id }, data });
  return true;
}
