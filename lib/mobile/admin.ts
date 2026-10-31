import type { PrismaClient } from "@prisma/client";
import { tidyDescription } from "./describe";
import { z } from "zod";
import { ApiError } from "./errors";
import { CATALOG_ACCOUNT, SUBMISSION_PROCESSES, UNCREDITED_ACCOUNTS } from "./submissions";
import { latinNames, type LatinNamer } from "./latinNames";
import { award } from "./points";
import { displayNames } from "./profile";
import type { PhotoStore } from "./suggestionPhotos";

// In-app review of coffee suggestions, for accounts with the ADMIN role. Approving
// publishes a catalog lot (finding or creating its roaster and origin), copies the
// cut-out photo to the public catalog bucket, and links the suggestion to the lot
// so the app can credit its author as the coffee's discoverer.

export async function requireAdmin(prisma: PrismaClient, accountId: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: accountId }, select: { role: true } });
  if (user?.role !== "ADMIN") throw ApiError.forbidden("admin_only");
}

export async function isAdmin(prisma: PrismaClient, accountId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({ where: { id: accountId }, select: { role: true } });
  return user?.role === "ADMIN";
}

export const SUBMISSION_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;

export interface AdminSubmission {
  id: string;
  status: string;
  name: string;
  nameEn: string | null;
  roasterName: string;
  roasterNameEn: string | null;
  originName: string | null;
  process: string | null;
  roastLevel: string | null;
  flavorNotes: string[];
  note: string | null;
  publicNote: string | null;
  photoUrl: string | null;
  /** Batch imports: the page it came from, extraction confidence (0-1), and labels. */
  sourceUrl: string | null;
  sourceConfidence: number | null;
  tags: string[];
  authorName: string | null;
  approvedLotSlug: string | null;
  reviewNote: string | null;
  createdAt: string;
}

export async function listSubmissions(
  prisma: PrismaClient, store: PhotoStore | null, status: (typeof SUBMISSION_STATUSES)[number],
): Promise<AdminSubmission[]> {
  const rows = await prisma.mobileCoffeeSubmission.findMany({
    where: { status }, orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" }, take: 250,
  });
  // People's suggestions before batch imports.
  rows.sort((a, b) => Number(a.accountId === CATALOG_ACCOUNT) - Number(b.accountId === CATALOG_ACCOUNT));
  const authorIds = [...new Set(rows.map((r) => r.accountId).filter((id) => !UNCREDITED_ACCOUNTS.includes(id)))];
  const lotIds = rows.map((r) => r.approvedLotId).filter((id): id is string => !!id);
  const [author, lots] = await Promise.all([
    displayNames(prisma, authorIds),
    lotIds.length ? prisma.coffeeLot.findMany({ where: { id: { in: lotIds } }, select: { id: true, slug: true } }) : [],
  ]);
  const slug = new Map(lots.map((l) => [l.id, l.slug]));
  return Promise.all(rows.map(async (r) => ({
    id: r.id, status: r.status, name: r.name, nameEn: r.nameEn, roasterName: r.roasterName,
    roasterNameEn: r.roasterNameEn, originName: r.originName, process: r.process, roastLevel: r.roastLevel,
    flavorNotes: r.flavorNotes, note: r.note, publicNote: r.publicNote,
    sourceUrl: r.sourceUrl, sourceConfidence: r.sourceConfidence, tags: tagsFrom(readExtras(r.extras)),
    // Without storage configured the list still works, just without photos.
    photoUrl: r.photoPath && store ? await store.signedUrl(r.photoPath) : null,
    authorName: r.accountId === CATALOG_ACCOUNT ? "دفعة المحامص" : author.get(r.accountId) ?? null,
    approvedLotSlug: r.approvedLotId ? slug.get(r.approvedLotId) ?? null : null,
    reviewNote: r.reviewNote,
    createdAt: r.createdAt.toISOString(),
  })));
}

/** What the admin confirms (after editing) to publish the lot. Latin names may be
 *  left empty: an existing roaster keeps its own, the rest are written for them. */
export const ApproveRequest = z.object({
  nameAr: z.string().trim().min(2).max(120),
  name: z.string().trim().max(120).default(""),
  roasterNameAr: z.string().trim().min(2).max(120),
  roasterName: z.string().trim().max(120).default(""),
  originCode: z.string().trim().regex(/^[A-Za-z]{2}$/),
  originNameAr: z.string().trim().min(2).max(80),
  process: z.enum(SUBMISSION_PROCESSES),
  roastLevel: z.enum(["light", "medium", "dark"]).nullable().optional(),
  flavorNotes: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  descriptionAr: z.string().trim().max(2000).optional(),
});
export type ApproveRequest = z.infer<typeof ApproveRequest>;

/** Lot details a batch import carries beyond the suggestion form. */
export interface SubmissionExtras {
  region?: string | null; farm?: string | null; producer?: string | null; altitudeMeters?: number | null;
  variety?: string[]; brewMethods?: string[]; descriptionAr?: string | null;
  isLuxury?: boolean; luxuryReason?: string | null; isInfused?: boolean; isDecaf?: boolean;
}

export function readExtras(value: unknown): SubmissionExtras {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as SubmissionExtras) : {};
}

export function tagsFrom(extras: SubmissionExtras): string[] {
  return [extras.isLuxury && "luxury", extras.isInfused && "infused", extras.isDecaf && "decaf"].filter((t): t is string => !!t);
}

const BREW_METHODS = ["ESPRESSO", "V60", "CHEMEX", "AEROPRESS", "FRENCH_PRESS", "COLD_BREW", "OTHER"] as const;

export const RejectRequest = z.object({ reason: z.string().trim().max(300).optional() });

const ROAST_AR: Record<string, string> = { light: "فاتح", medium: "متوسط", dark: "غامق" };

/** URL-safe slug from Latin text; empty when nothing Latin is left. */
export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function uniqueSlug(base: string, taken: (slug: string) => Promise<boolean>): Promise<string> {
  const root = base || "coffee";
  if (!(await taken(root))) return root;
  for (let i = 2; i < 50; i++) {
    if (!(await taken(`${root}-${i}`))) return `${root}-${i}`;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function approveSubmission(
  prisma: PrismaClient, store: PhotoStore | null, id: string, input: ApproveRequest, namer: LatinNamer | null = null,
): Promise<{ lotSlug: string }> {
  const submission = await prisma.mobileCoffeeSubmission.findUnique({ where: { id } });
  if (!submission) throw ApiError.unprocessable("submission_not_found");
  if (submission.status !== "PENDING") throw ApiError.conflict("already_reviewed");

  const extras = readExtras(submission.extras);
  const isoCode = input.originCode.toUpperCase();
  const origin = await prisma.originCountry.findUnique({ where: { isoCode } })
    ?? await prisma.originCountry.create({ data: { isoCode, nameAr: input.originNameAr } });

  const existingRoaster = await prisma.roaster.findFirst({
    where: {
      OR: [
        { nameAr: input.roasterNameAr },
        ...(input.roasterName ? [{ name: { equals: input.roasterName, mode: "insensitive" as const } }] : []),
      ],
    },
  });

  // Fill any missing Latin names (one model call at most).
  let name = input.name;
  let roasterName = input.roasterName || existingRoaster?.name || "";
  if (!name || !roasterName) {
    const generated = await latinNames(namer, input.nameAr, input.roasterNameAr);
    name ||= generated.name;
    roasterName ||= generated.roasterName;
  }

  const roaster = existingRoaster ?? await prisma.roaster.create({
    data: {
      name: roasterName, nameAr: input.roasterNameAr,
      slug: await uniqueSlug(slugify(roasterName), async (s) => !!(await prisma.roaster.findUnique({ where: { slug: s } }))),
    },
  });

  const slug = await uniqueSlug(
    slugify(`${roaster.name} ${name}`),
    async (s) => !!(await prisma.coffeeLot.findUnique({ where: { slug: s } })),
  );

  const imageUrl = submission.photoPath && store
    ? await store.publish(submission.photoPath, `lots/${slug}-${Date.now().toString(36)}.jpg`)
    : null;

  const lot = await prisma.coffeeLot.create({
    data: {
      slug, name, nameAr: input.nameAr, roasterId: roaster.id, originCountryId: origin.id,
      process: input.process,
      roastLevel: input.roastLevel ? ROAST_AR[input.roastLevel] : null,
      flavorNotes: input.flavorNotes,
      descriptionAr: input.descriptionAr || tidyDescription(extras.descriptionAr),
      ...(extras.region ? { region: extras.region } : {}),
      ...(extras.farm ? { farm: extras.farm } : {}),
      ...(extras.producer ? { producer: extras.producer } : {}),
      ...(extras.altitudeMeters ? { altitudeMeters: Math.round(extras.altitudeMeters) } : {}),
      ...(extras.variety?.length ? { variety: extras.variety.join("، ") } : {}),
      recommendedBrewMethods: (extras.brewMethods ?? []).filter((m): m is (typeof BREW_METHODS)[number] =>
        (BREW_METHODS as readonly string[]).includes(m)),
      publishedAt: new Date(),
      ...(imageUrl ? {
        imageUrl, storedImageUrl: imageUrl, imageType: "USER_UPLOADED", imagePermissionStatus: "APPROVED",
        imageSource: "USER_UPLOAD", imageStorageProvider: "supabase", imageStoredAt: new Date(), imageApprovedAt: new Date(),
      } : {}),
    },
    select: { id: true, slug: true },
  });

  await prisma.mobileCoffeeSubmission.update({
    where: { id }, data: { status: "APPROVED", approvedLotId: lot.id, reviewedAt: new Date() },
  });
  const tags = tagsFrom(extras);
  if (tags.length) {
    await prisma.mobileLotTag.createMany({
      data: tags.map((tag) => ({ lotId: lot.id, tag, note: tag === "luxury" ? extras.luxuryReason ?? null : null })),
      skipDuplicates: true,
    });
  }
  if (!UNCREDITED_ACCOUNTS.includes(submission.accountId)) await award(prisma, submission.accountId, "discovery", id);
  return { lotSlug: lot.slug };
}

export async function rejectSubmission(prisma: PrismaClient, id: string, reason?: string): Promise<{ ok: true }> {
  const submission = await prisma.mobileCoffeeSubmission.findUnique({ where: { id }, select: { status: true } });
  if (!submission) throw ApiError.unprocessable("submission_not_found");
  if (submission.status !== "PENDING") throw ApiError.conflict("already_reviewed");
  await prisma.mobileCoffeeSubmission.update({
    where: { id }, data: { status: "REJECTED", reviewNote: reason || null, reviewedAt: new Date() },
  });
  return { ok: true };
}

/** The account that suggested a lot, if it came from an approved suggestion and still exists. */
export async function discovererName(prisma: PrismaClient, lotId: string): Promise<string | null> {
  const submission = await prisma.mobileCoffeeSubmission.findFirst({
    where: { approvedLotId: lotId, status: "APPROVED", accountId: { notIn: UNCREDITED_ACCOUNTS } },
    select: { accountId: true },
  });
  if (!submission) return null;
  return (await displayNames(prisma, [submission.accountId])).get(submission.accountId) ?? null;
}

/** The discoverer's @username (for linking to their profile), if they have one. */
export async function discovererUsername(prisma: PrismaClient, lotId: string): Promise<string | null> {
  const submission = await prisma.mobileCoffeeSubmission.findFirst({
    where: { approvedLotId: lotId, status: "APPROVED", accountId: { notIn: UNCREDITED_ACCOUNTS } },
    select: { accountId: true },
  });
  if (!submission) return null;
  const profile = await prisma.mobileProfile.findUnique({ where: { accountId: submission.accountId }, select: { username: true } });
  return profile?.username ?? null;
}
