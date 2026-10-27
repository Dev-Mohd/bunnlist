import type { Prisma, PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";
import { z } from "zod";
import { ApiError } from "./errors";
import { decodeJpeg, type PhotoStore } from "./suggestionPhotos";
import bundled from "./data/grinders.json";

// The grinder guide behind «مطحنتي». The bundled list names the grinders and
// says which have a photo (served from /grinders/<id>.jpg, provided by the app's
// owner with permission). Specs start empty and are filled in from manufacturers'
// sources, each recorded in `sources`, through the admin console — never guessed.

export const GRINDER_CATEGORIES = ["hand", "electric", "single_dose", "built_in", "espresso", "commercial"] as const;
export const ADJUSTMENTS = ["clicks", "stepped", "stepless", "timer"] as const;
export const OWNER_PHOTO_CREDIT = "صورة من مالك التطبيق بإذن";

const Bundled = z.object({
  items: z.array(z.object({
    id: z.string(), brand: z.string(), model: z.string(), variant: z.string().nullable(),
    category: z.enum(GRINDER_CATEGORIES), photo: z.boolean(),
    spec: z.object({
      adjustment: z.enum(ADJUSTMENTS), rangeMin: z.number().nullable(), rangeMax: z.number().nullable(),
      clicksPerRotation: z.number().int().nullable(), micronsPerStep: z.number().nullable(),
      zeroGuideAr: z.string().nullable(), notesAr: z.string().nullable(),
      sources: z.array(z.object({ label: z.string(), url: z.string().url() })).min(1),
    }).nullable().optional(),
  })),
});

export interface MobileGrinder {
  id: string;
  brand: string;
  model: string;
  variant: string | null;
  category: string;
  adjustment: string | null;
  rangeMin: number | null;
  rangeMax: number | null;
  clicksPerRotation: number | null;
  micronsPerStep: number | null;
  zeroGuideAr: string | null;
  notesAr: string | null;
  sources: { label: string; url: string }[];
  imageUrl: string | null;
  imageCredit: string | null;
  published: boolean;
}

type Row = Prisma.MobileGrinderGetPayload<object>;

const view = (r: Row): MobileGrinder => ({
  id: r.id, brand: r.brand, model: r.model, variant: r.variant, category: r.category, adjustment: r.adjustment,
  rangeMin: r.rangeMin, rangeMax: r.rangeMax, clicksPerRotation: r.clicksPerRotation, micronsPerStep: r.micronsPerStep,
  zeroGuideAr: r.zeroGuideAr, notesAr: r.notesAr,
  sources: Array.isArray(r.sources) ? (r.sources as { label: string; url: string }[]) : [],
  imageUrl: r.imageUrl, imageCredit: r.imageCredit, published: r.published,
});

/** Published grinders, by category then the bundled order. */
export async function listGrinders(prisma: PrismaClient, includeHidden = false): Promise<MobileGrinder[]> {
  const rows = await prisma.mobileGrinder.findMany({
    where: includeHidden ? {} : { published: true },
    orderBy: [{ sortOrder: "asc" }],
  });
  const order = new Map(GRINDER_CATEGORIES.map((c, i) => [c as string, i]));
  return rows.map(view).sort((a, b) => (order.get(a.category) ?? 9) - (order.get(b.category) ?? 9));
}

/**
 * Adds bundled grinders that aren't in the guide yet (with their photo URL under
 * `origin` and the specs researched from makers' and retailers' pages, each with
 * its sources). Existing rows keep every edit made in the console; a row still
 * without a picture or specs gets the bundled ones. Safe to run again.
 */
export async function seedGrinders(
  prisma: PrismaClient, origin: string, raw: unknown = bundled,
): Promise<{ created: number; photos: number; specs: number }> {
  const { items } = Bundled.parse(raw);
  const existing = new Map((await prisma.mobileGrinder.findMany({ select: { id: true, imageUrl: true, adjustment: true } })).map((r) => [r.id, r]));
  let created = 0, photos = 0, specs = 0;
  for (const [index, item] of items.entries()) {
    const imageUrl = item.photo ? `${origin.replace(/\/$/, "")}/grinders/${item.id}.jpg` : null;
    const prior = existing.get(item.id);
    if (!prior) {
      await prisma.mobileGrinder.create({
        data: {
          id: item.id, brand: item.brand, model: item.model, variant: item.variant, category: item.category,
          sortOrder: index, imageUrl, imageCredit: imageUrl ? OWNER_PHOTO_CREDIT : null,
          ...(item.spec ?? {}),
        },
      });
      created += 1;
      if (imageUrl) photos += 1;
      if (item.spec) specs += 1;
    } else {
      // Fill only what is still empty: a photo the row lacks, specs nobody entered yet.
      const data = {
        ...(!prior.imageUrl && imageUrl ? { imageUrl, imageCredit: OWNER_PHOTO_CREDIT } : {}),
        ...(!prior.adjustment && item.spec ? item.spec : {}),
      };
      if (Object.keys(data).length) {
        await prisma.mobileGrinder.update({ where: { id: item.id }, data });
        if ("imageUrl" in data) photos += 1;
        if ("adjustment" in data) specs += 1;
      }
    }
  }
  return { created, photos, specs };
}

const optionalText = (max: number) => z.string().trim().max(max).nullable().transform((v) => v || null);

export const GrinderEdit = z.object({
  brand: z.string().trim().min(1).max(60),
  model: z.string().trim().min(1).max(80),
  variant: optionalText(60),
  category: z.enum(GRINDER_CATEGORIES),
  adjustment: z.enum(ADJUSTMENTS).nullable(),
  rangeMin: z.number().min(0).max(1000).nullable(),
  rangeMax: z.number().min(0).max(1000).nullable(),
  clicksPerRotation: z.number().int().min(1).max(500).nullable(),
  micronsPerStep: z.number().min(0.5).max(500).nullable(),
  zeroGuideAr: optionalText(1500),
  notesAr: optionalText(1500),
  sources: z.array(z.object({ label: z.string().trim().min(1).max(80), url: z.string().url().max(500) })).max(8),
  published: z.boolean(),
}).partial();
export type GrinderEdit = z.infer<typeof GrinderEdit>;

export async function updateGrinder(prisma: PrismaClient, id: string, edit: GrinderEdit): Promise<MobileGrinder> {
  const found = await prisma.mobileGrinder.findUnique({ where: { id }, select: { id: true } });
  if (!found) throw ApiError.unprocessable("grinder_not_found");
  const row = await prisma.mobileGrinder.update({ where: { id }, data: edit as Prisma.MobileGrinderUpdateInput });
  return view(row);
}

/** Replaces a grinder's photo with a JPEG the admin uploads. */
export async function replaceGrinderPhoto(
  prisma: PrismaClient, store: PhotoStore | null, id: string, base64: string,
): Promise<MobileGrinder> {
  if (!store?.putPublic) throw ApiError.forbidden("storage_not_configured");
  const found = await prisma.mobileGrinder.findUnique({ where: { id }, select: { id: true } });
  if (!found) throw ApiError.unprocessable("grinder_not_found");
  const bytes = decodeJpeg(base64);
  const version = createHash("sha1").update(bytes).digest("hex").slice(0, 8);
  const imageUrl = await store.putPublic(`grinders/${id}-${version}.jpg`, bytes);
  return view(await prisma.mobileGrinder.update({ where: { id }, data: { imageUrl, imageCredit: OWNER_PHOTO_CREDIT } }));
}

export const MyGrinderRequest = z.object({ grinderId: z.string().trim().min(1).max(80).nullable() });

/** Sets «مطحنتي» (null clears it). */
export async function setMyGrinder(prisma: PrismaClient, accountId: string, grinderId: string | null): Promise<{ grinderId: string | null }> {
  if (grinderId) {
    const found = await prisma.mobileGrinder.findFirst({ where: { id: grinderId, published: true }, select: { id: true } });
    if (!found) throw ApiError.unprocessable("grinder_not_found");
  }
  await prisma.mobileProfile.upsert({ where: { accountId }, update: { grinderId }, create: { accountId, grinderId } });
  return { grinderId };
}
