import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

// User-submitted coffee suggestions from the app (pending review). Names come in
// Arabic (name, roasterName) and, optionally, as printed in Latin script (nameEn,
// roasterNameEn). Text only for now; image upload is a later step.

/** accountId of suggestions whose author deleted their account. */
export const DELETED_ACCOUNT = "deleted";

export const SUBMISSION_PROCESSES = [
  "NATURAL", "WASHED", "HONEY", "ANAEROBIC", "WET_HULLED", "CARBONIC_MACERATION", "EXPERIMENTAL", "OTHER",
] as const;

export const SubmissionRequest = z.object({
  name: z.string().trim().min(2).max(120),
  roasterName: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().max(120).optional(),
  roasterNameEn: z.string().trim().max(120).optional(),
  originName: z.string().trim().max(80).optional(),
  process: z.enum(SUBMISSION_PROCESSES).optional(),
  roastLevel: z.enum(["light", "medium", "dark"]).optional(),
  flavorNotes: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  note: z.string().trim().max(1000).optional(),
});
export type SubmissionRequest = z.infer<typeof SubmissionRequest>;

export async function createSubmission(
  prisma: PrismaClient,
  accountId: string,
  input: SubmissionRequest,
): Promise<{ id: string }> {
  const data = SubmissionRequest.parse(input);
  const row = await prisma.mobileCoffeeSubmission.create({
    data: {
      accountId,
      name: data.name,
      roasterName: data.roasterName,
      originName: data.originName || null,
      nameEn: data.nameEn || null,
      roasterNameEn: data.roasterNameEn || null,
      process: data.process ?? null,
      roastLevel: data.roastLevel ?? null,
      flavorNotes: data.flavorNotes ?? [],
      note: data.note || null,
    },
    select: { id: true },
  });
  return { id: row.id };
}

export interface MySubmission {
  id: string;
  name: string;
  roasterName: string;
  status: string;
  lotSlug: string | null;
  reviewNote: string | null;
  hasPhoto: boolean;
  createdAt: string;
}

/** The caller's suggestions with their review status, newest first. */
export async function listMySubmissions(prisma: PrismaClient, accountId: string): Promise<MySubmission[]> {
  const rows = await prisma.mobileCoffeeSubmission.findMany({
    where: { accountId }, orderBy: { createdAt: "desc" }, take: 100,
  });
  const lotIds = rows.map((r) => r.approvedLotId).filter((id): id is string => !!id);
  const lots = lotIds.length
    ? await prisma.coffeeLot.findMany({ where: { id: { in: lotIds }, publishedAt: { not: null } }, select: { id: true, slug: true } })
    : [];
  const slug = new Map(lots.map((l) => [l.id, l.slug]));
  return rows.map((r) => ({
    id: r.id, name: r.name, roasterName: r.roasterName, status: r.status,
    lotSlug: r.approvedLotId ? slug.get(r.approvedLotId) ?? null : null,
    reviewNote: r.reviewNote, hasPhoto: !!r.photoPath, createdAt: r.createdAt.toISOString(),
  }));
}
