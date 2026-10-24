import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "./errors";
import { DELETED_ACCOUNT, SUBMISSION_PROCESSES } from "./submissions";
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
  photoUrl: string | null;
  authorName: string | null;
  approvedLotSlug: string | null;
  reviewNote: string | null;
  createdAt: string;
}

export async function listSubmissions(
  prisma: PrismaClient, store: PhotoStore, status: (typeof SUBMISSION_STATUSES)[number],
): Promise<AdminSubmission[]> {
  const rows = await prisma.mobileCoffeeSubmission.findMany({
    where: { status }, orderBy: { createdAt: status === "PENDING" ? "asc" : "desc" }, take: 100,
  });
  const authorIds = [...new Set(rows.map((r) => r.accountId).filter((id) => id !== DELETED_ACCOUNT))];
  const lotIds = rows.map((r) => r.approvedLotId).filter((id): id is string => !!id);
  const [users, lots] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, name: true, email: true } }),
    lotIds.length ? prisma.coffeeLot.findMany({ where: { id: { in: lotIds } }, select: { id: true, slug: true } }) : [],
  ]);
  const author = new Map(users.map((u) => [u.id, u.name?.trim() || u.email || "مستخدم"]));
  const slug = new Map(lots.map((l) => [l.id, l.slug]));
  return Promise.all(rows.map(async (r) => ({
    id: r.id, status: r.status, name: r.name, nameEn: r.nameEn, roasterName: r.roasterName,
    roasterNameEn: r.roasterNameEn, originName: r.originName, process: r.process, roastLevel: r.roastLevel,
    flavorNotes: r.flavorNotes, note: r.note,
    photoUrl: r.photoPath ? await store.signedUrl(r.photoPath) : null,
    authorName: author.get(r.accountId) ?? null,
    approvedLotSlug: r.approvedLotId ? slug.get(r.approvedLotId) ?? null : null,
    reviewNote: r.reviewNote,
    createdAt: r.createdAt.toISOString(),
  })));
}

/** What the admin confirms (after editing) to publish the lot. */
export const ApproveRequest = z.object({
  nameAr: z.string().trim().min(2).max(120),
  name: z.string().trim().min(2).max(120),
  roasterNameAr: z.string().trim().min(2).max(120),
  roasterName: z.string().trim().min(2).max(120),
  originCode: z.string().trim().regex(/^[A-Za-z]{2}$/),
  originNameAr: z.string().trim().min(2).max(80),
  process: z.enum(SUBMISSION_PROCESSES),
  roastLevel: z.enum(["light", "medium", "dark"]).nullable().optional(),
  flavorNotes: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  descriptionAr: z.string().trim().max(2000).optional(),
});
export type ApproveRequest = z.infer<typeof ApproveRequest>;

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
  prisma: PrismaClient, store: PhotoStore, id: string, input: ApproveRequest,
): Promise<{ lotSlug: string }> {
  const submission = await prisma.mobileCoffeeSubmission.findUnique({ where: { id } });
  if (!submission) throw ApiError.unprocessable("submission_not_found");
  if (submission.status !== "PENDING") throw ApiError.conflict("already_reviewed");

  const isoCode = input.originCode.toUpperCase();
  const origin = await prisma.originCountry.findUnique({ where: { isoCode } })
    ?? await prisma.originCountry.create({ data: { isoCode, nameAr: input.originNameAr } });

  const roaster = await prisma.roaster.findFirst({
    where: { OR: [{ nameAr: input.roasterNameAr }, { name: { equals: input.roasterName, mode: "insensitive" } }] },
  }) ?? await prisma.roaster.create({
    data: {
      name: input.roasterName, nameAr: input.roasterNameAr,
      slug: await uniqueSlug(slugify(input.roasterName), async (s) => !!(await prisma.roaster.findUnique({ where: { slug: s } }))),
    },
  });

  const slug = await uniqueSlug(
    slugify(`${input.roasterName} ${input.name}`),
    async (s) => !!(await prisma.coffeeLot.findUnique({ where: { slug: s } })),
  );

  const imageUrl = submission.photoPath
    ? await store.publish(submission.photoPath, `lots/${slug}-${Date.now().toString(36)}.jpg`)
    : null;

  const lot = await prisma.coffeeLot.create({
    data: {
      slug, name: input.name, nameAr: input.nameAr, roasterId: roaster.id, originCountryId: origin.id,
      process: input.process,
      roastLevel: input.roastLevel ? ROAST_AR[input.roastLevel] : null,
      flavorNotes: input.flavorNotes,
      descriptionAr: input.descriptionAr || null,
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
    where: { approvedLotId: lotId, status: "APPROVED", accountId: { not: DELETED_ACCOUNT } },
    select: { accountId: true },
  });
  if (!submission) return null;
  const user = await prisma.user.findUnique({ where: { id: submission.accountId }, select: { name: true } });
  return user ? user.name?.trim() || "مستخدم" : null;
}
