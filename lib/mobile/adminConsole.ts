import { createHash } from "node:crypto";
import { CoffeeProcess, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "./errors";
import { riyadhDay } from "./points";
import { decodeJpeg, type PhotoStore } from "./suggestionPhotos";

// The app's admin console: the numbers at a glance, and editing published
// coffees (details, tags, hiding, photo). Admin-only; routes check requireAdmin.

const DAY_MS = 24 * 60 * 60 * 1000;

export interface Overview {
  users: number;
  newUsers7d: number;
  activeToday: number;
  reviews7d: number;
  recipes7d: number;
  brews7d: number;
  scans7d: number;
  lots: number;
  pendingSubmissions: number;
  openReports: number;
  /** The last 30 Riyadh days, oldest first: active accounts and sign-ups. */
  series: { day: string; active: number; newUsers: number }[];
}

export async function overview(prisma: PrismaClient, now = new Date()): Promise<Overview> {
  const weekAgo = new Date(now.getTime() - 7 * DAY_MS);
  const days = Array.from({ length: 30 }, (_, i) => riyadhDay(new Date(now.getTime() - (29 - i) * DAY_MS)));
  const since = new Date(now.getTime() - 31 * DAY_MS);
  const [users, newUsers7d, activeToday, reviews7d, recipes7d, brews7d, scans7d, lots, pendingSubmissions, openReports, activity, joined] =
    await Promise.all([
      prisma.mobileProfile.count(),
      prisma.mobileProfile.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.mobilePointEvent.count({ where: { kind: "activity", day: riyadhDay(now) } }),
      prisma.review.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.mobileRecipe.count({ where: { state: "published", publishedAt: { gte: weekAgo } } }),
      prisma.mobileBrewExperience.count({ where: { createdAt: { gte: weekAgo }, state: { not: "deleted" } } }),
      prisma.mobileAiScan.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.coffeeLot.count({ where: { publishedAt: { not: null } } }),
      prisma.mobileCoffeeSubmission.count({ where: { status: "PENDING" } }),
      prisma.mobileReport.count({ where: { status: "open" } }),
      prisma.mobilePointEvent.groupBy({ by: ["day"], where: { kind: "activity", day: { gte: days[0] } }, _count: { _all: true } }),
      prisma.mobileProfile.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    ]);
  const active = new Map(activity.map((a) => [a.day, a._count._all]));
  const signups = new Map<string, number>();
  joined.forEach((p) => { const d = riyadhDay(p.createdAt); signups.set(d, (signups.get(d) ?? 0) + 1); });
  return {
    users, newUsers7d, activeToday, reviews7d, recipes7d, brews7d, scans7d, lots, pendingSubmissions, openReports,
    series: days.map((day) => ({ day, active: active.get(day) ?? 0, newUsers: signups.get(day) ?? 0 })),
  };
}

// MARK: Coffees

export const LOT_TAGS = ["luxury", "infused", "decaf"] as const;
export const LOT_FILTERS = ["all", "hidden", "noPhoto", "noNotes"] as const;

export interface AdminLotRow {
  id: string;
  slug: string;
  nameAr: string;
  name: string;
  roasterNameAr: string;
  originCode: string | null;
  originNameAr: string | null;
  imageUrl: string | null;
  published: boolean;
  reviewCount: number;
}

const rowSelect = {
  id: true, slug: true, nameAr: true, name: true, imageUrl: true, publishedAt: true, reviewCount: true,
  roaster: { select: { nameAr: true } }, originCountry: { select: { isoCode: true, nameAr: true } },
} as const;

type RowShape = {
  id: string; slug: string; nameAr: string; name: string; imageUrl: string | null; publishedAt: Date | null; reviewCount: number;
  roaster: { nameAr: string } | null; originCountry: { isoCode: string; nameAr: string } | null;
};

const toRow = (l: RowShape): AdminLotRow => ({
  id: l.id, slug: l.slug, nameAr: l.nameAr, name: l.name, roasterNameAr: l.roaster?.nameAr ?? "",
  originCode: l.originCountry?.isoCode ?? null, originNameAr: l.originCountry?.nameAr ?? null,
  imageUrl: l.imageUrl, published: !!l.publishedAt, reviewCount: l.reviewCount,
});

/** Every lot, hidden ones too, matching a name or roaster; newest first. */
export async function searchLots(
  prisma: PrismaClient, q: string, filter: (typeof LOT_FILTERS)[number] = "all",
): Promise<AdminLotRow[]> {
  const text = q.trim();
  const rows = await prisma.coffeeLot.findMany({
    where: {
      ...(text ? {
        OR: [
          { nameAr: { contains: text, mode: "insensitive" } }, { name: { contains: text, mode: "insensitive" } },
          { roaster: { nameAr: { contains: text, mode: "insensitive" } } }, { roaster: { name: { contains: text, mode: "insensitive" } } },
        ],
      } : {}),
      ...(filter === "hidden" ? { publishedAt: null } : {}),
      ...(filter === "noPhoto" ? { imageUrl: null } : {}),
      ...(filter === "noNotes" ? { flavorNotes: { isEmpty: true } } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 60,
    select: rowSelect,
  });
  return rows.map(toRow);
}

export interface AdminLot extends AdminLotRow {
  process: string;
  processLabel: string | null;
  roastLevel: string | null;
  flavorNotes: string[];
  region: string | null;
  variety: string | null;
  altitudeMeters: number | null;
  descriptionAr: string | null;
  tags: string[];
  /** Home trending override: "pin", "hide" or null. */
  trending: string | null;
}

export async function adminLot(prisma: PrismaClient, id: string): Promise<AdminLot> {
  const lot = await prisma.coffeeLot.findUnique({
    where: { id },
    select: {
      ...rowSelect, process: true, processLabel: true, roastLevel: true, flavorNotes: true, region: true,
      regionAr: true, variety: true, altitudeMeters: true, descriptionAr: true,
    },
  });
  if (!lot) throw ApiError.unprocessable("lot_not_found");
  const [tags, override] = await Promise.all([
    prisma.mobileLotTag.findMany({ where: { lotId: id }, select: { tag: true } }),
    prisma.mobileTrendingOverride.findUnique({ where: { lotId: id }, select: { mode: true } }),
  ]);
  return {
    ...toRow(lot), process: lot.process, processLabel: lot.processLabel, roastLevel: lot.roastLevel,
    flavorNotes: lot.flavorNotes, region: lot.regionAr ?? lot.region, variety: lot.variety,
    altitudeMeters: lot.altitudeMeters, descriptionAr: lot.descriptionAr, tags: tags.map((t) => t.tag),
    trending: override?.mode ?? null,
  };
}

const optionalText = (max: number) => z.string().trim().max(max).nullable().transform((v) => v || null);

export const LotEdit = z.object({
  nameAr: z.string().trim().min(2).max(120),
  name: z.string().trim().min(1).max(120),
  process: z.nativeEnum(CoffeeProcess),
  processLabel: optionalText(60),
  roastLevel: optionalText(30),
  flavorNotes: z.array(z.string().trim().min(1).max(40)).max(12),
  originCode: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((v) => v.toUpperCase()),
  originNameAr: z.string().trim().min(2).max(60),
  region: optionalText(120),
  variety: optionalText(120),
  altitudeMeters: z.number().int().min(0).max(4000).nullable(),
  descriptionAr: optionalText(2000),
  published: z.boolean(),
  tags: z.array(z.enum(LOT_TAGS)).max(LOT_TAGS.length),
}).partial();
export type LotEdit = z.infer<typeof LotEdit>;

/** Applies only the fields sent. Hiding clears publishedAt; showing sets it back. */
export async function updateLot(prisma: PrismaClient, id: string, edit: LotEdit): Promise<AdminLot> {
  const lot = await prisma.coffeeLot.findUnique({ where: { id }, select: { id: true, publishedAt: true } });
  if (!lot) throw ApiError.unprocessable("lot_not_found");
  let originCountryId: string | undefined;
  if (edit.originCode) {
    const origin = await prisma.originCountry.findUnique({ where: { isoCode: edit.originCode } })
      ?? await prisma.originCountry.create({ data: { isoCode: edit.originCode, nameAr: edit.originNameAr ?? edit.originCode } });
    originCountryId = origin.id;
  }
  const set = <K extends keyof LotEdit>(key: K) => (edit[key] !== undefined ? { [key]: edit[key] } : {});
  await prisma.coffeeLot.update({
    where: { id },
    data: {
      ...set("nameAr"), ...set("name"), ...set("process"), ...set("processLabel"), ...set("roastLevel"),
      ...set("flavorNotes"), ...set("variety"), ...set("altitudeMeters"), ...set("descriptionAr"),
      ...(edit.region !== undefined ? { regionAr: edit.region } : {}),
      ...(originCountryId ? { originCountryId } : {}),
      ...(edit.published === false ? { publishedAt: null } : {}),
      ...(edit.published === true && !lot.publishedAt ? { publishedAt: new Date() } : {}),
    },
  });
  if (edit.tags) {
    await prisma.mobileLotTag.deleteMany({ where: { lotId: id, tag: { notIn: edit.tags } } });
    await prisma.mobileLotTag.createMany({ data: edit.tags.map((tag) => ({ lotId: id, tag })), skipDuplicates: true });
  }
  return adminLot(prisma, id);
}

/** Replaces a lot's picture with a JPEG (the app cuts the bag out first). */
export async function replaceLotPhoto(
  prisma: PrismaClient, store: PhotoStore | null, id: string, base64: string,
): Promise<{ imageUrl: string }> {
  if (!store?.putPublic) throw ApiError.forbidden("storage_not_configured");
  const lot = await prisma.coffeeLot.findUnique({ where: { id }, select: { slug: true } });
  if (!lot) throw ApiError.unprocessable("lot_not_found");
  const bytes = decodeJpeg(base64);
  const version = createHash("sha1").update(bytes).digest("hex").slice(0, 8);
  const imageUrl = await store.putPublic(`lots/${lot.slug}-${version}.jpg`, bytes);
  await prisma.coffeeLot.update({
    where: { id },
    data: {
      imageUrl, storedImageUrl: imageUrl, imageType: "USER_UPLOADED", imagePermissionStatus: "APPROVED",
      imageSource: "USER_UPLOAD", imageStorageProvider: "supabase", imageStoredAt: new Date(), imageApprovedAt: new Date(),
    },
  });
  return { imageUrl };
}
