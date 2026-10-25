import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { CATALOG_ACCOUNT, SUBMISSION_PROCESSES } from "./submissions";
import batch from "./data/roastery-batch-2026-05.json";

// Curated batches (scraped roastery catalogs, cleaned) enter as pending
// suggestions from the "catalog" account, so every coffee is reviewed in the app's
// admin screen before it is published, and nobody is credited as its discoverer.
// Re-running is safe: each item has an import key, and coffees already in the
// catalog (same roaster and name) are skipped.

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

export const BUNDLED_BATCHES: Record<string, unknown> = { "roasteries-2026-05": batch };

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export async function importBatch(prisma: PrismaClient, raw: unknown): Promise<{
  created: number; alreadyImported: number; alreadyInCatalog: number;
}> {
  const { items } = Batch.parse(raw);
  const existing = new Set((await prisma.mobileCoffeeSubmission.findMany({
    where: { importKey: { in: items.map((i) => i.importKey) } }, select: { importKey: true },
  })).map((r) => r.importKey));
  const lots = await prisma.coffeeLot.findMany({
    select: { name: true, nameAr: true, roaster: { select: { name: true, nameAr: true } } },
  });
  const inCatalog = new Set(lots.flatMap((l) => [
    `${norm(l.roaster?.nameAr)}|${norm(l.nameAr)}`, `${norm(l.roaster?.name)}|${norm(l.name)}`,
  ]));

  let created = 0, alreadyImported = 0, alreadyInCatalog = 0;
  for (const item of items) {
    if (existing.has(item.importKey)) { alreadyImported += 1; continue; }
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
      },
    });
    created += 1;
  }
  return { created, alreadyImported, alreadyInCatalog };
}
