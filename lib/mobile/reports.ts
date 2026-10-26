import { ReviewStatus, type PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "./errors";
import { displayNames } from "./profile";
import { refreshReviewStats } from "./reviews";

// "بلّغ": anyone signed in can report a review, a recipe, a discoverer's note or a
// profile. Admins see open reports in the console with the reported content, and
// either dismiss them or remove the content (hide the review, unpublish the
// recipe, clear the note or the profile's text). Either way every open report on
// the same thing closes with it.

export const REPORT_TARGETS = ["review", "recipe", "note", "profile"] as const;
export const REPORT_REASONS = ["spam", "offensive", "wrong", "other"] as const;
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export const ReportRequest = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.string().trim().min(1).max(200),
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(500).optional(),
});
export type ReportRequest = z.infer<typeof ReportRequest>;

export const ResolveRequest = z.object({ action: z.enum(["dismiss", "remove"]) });

/** The reported thing's owner and a preview of its text; null when it is gone. */
async function target(
  prisma: PrismaClient, type: ReportTarget, id: string,
): Promise<{ ownerId: string; title: string; text: string | null } | null> {
  switch (type) {
    case "review": {
      const r = await prisma.review.findUnique({
        where: { id }, select: { userId: true, rating: true, body: true, coffeeLot: { select: { nameAr: true } } },
      });
      return r && { ownerId: r.userId, title: `تقييم ${r.rating}/5 على «${r.coffeeLot.nameAr}»`, text: r.body };
    }
    case "recipe": {
      const r = await prisma.mobileRecipe.findUnique({ where: { id }, select: { accountId: true, title: true, notes: true } });
      return r && { ownerId: r.accountId, title: `وصفة «${r.title}»`, text: r.notes || null };
    }
    case "note": {
      const s = await prisma.mobileCoffeeSubmission.findFirst({
        where: { approvedLotId: id, status: "APPROVED" }, select: { accountId: true, name: true, publicNote: true },
      });
      return s && { ownerId: s.accountId, title: `ملاحظة المكتشف على «${s.name}»`, text: s.publicNote };
    }
    case "profile": {
      const p = await prisma.mobileProfile.findUnique({ where: { accountId: id }, select: { username: true, displayName: true, bio: true } });
      return p && { ownerId: id, title: `ملف @${p.username ?? "—"}`, text: [p.displayName, p.bio].filter(Boolean).join("\n") || null };
    }
  }
}

/** Files a report; reporting the same thing again while it is open is a no-op. */
export async function fileReport(prisma: PrismaClient, reporterId: string, input: ReportRequest): Promise<{ ok: true }> {
  let targetId = input.targetId;
  if (input.targetType === "profile") {
    // The app reports profiles by @username; stored by account id.
    const p = await prisma.mobileProfile.findUnique({ where: { username: targetId.replace(/^@/, "").toLowerCase() }, select: { accountId: true } });
    if (p) targetId = p.accountId;
  }
  const found = await target(prisma, input.targetType, targetId);
  if (!found) throw ApiError.unprocessable("target_not_found");
  if (found.ownerId === reporterId) throw ApiError.unprocessable("own_content");
  const open = await prisma.mobileReport.findFirst({
    where: { reporterId, targetType: input.targetType, targetId, status: "open" }, select: { id: true },
  });
  if (!open) {
    await prisma.mobileReport.create({
      data: { reporterId, targetType: input.targetType, targetId, reason: input.reason, details: input.details || null },
    });
  }
  return { ok: true };
}

export interface AdminReport {
  id: string;
  targetType: string;
  targetId: string;
  reason: string;
  details: string | null;
  status: string;
  createdAt: string;
  reporterName: string | null;
  ownerName: string | null;
  title: string;
  text: string | null;
  /** Open reports on the same thing, this one included. */
  sameTargetCount: number;
}

export async function listReports(prisma: PrismaClient, status: "open" | "closed"): Promise<AdminReport[]> {
  const rows = await prisma.mobileReport.findMany({
    where: status === "open" ? { status: "open" } : { status: { not: "open" } },
    orderBy: { createdAt: status === "open" ? "asc" : "desc" },
    take: 100,
  });
  const targets = await Promise.all(rows.map((r) => target(prisma, r.targetType as ReportTarget, r.targetId)));
  const names = await displayNames(prisma, [
    ...rows.map((r) => r.reporterId), ...targets.flatMap((t) => (t ? [t.ownerId] : [])),
  ]);
  const counts = new Map<string, number>();
  rows.filter((r) => r.status === "open").forEach((r) => {
    const key = `${r.targetType}:${r.targetId}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  });
  return rows.map((r, i) => ({
    id: r.id, targetType: r.targetType, targetId: r.targetId, reason: r.reason, details: r.details, status: r.status,
    createdAt: r.createdAt.toISOString(), reporterName: names.get(r.reporterId) ?? null,
    ownerName: targets[i] ? names.get(targets[i]!.ownerId) ?? null : null,
    title: targets[i]?.title ?? "محتوى محذوف", text: targets[i]?.text ?? null,
    sameTargetCount: counts.get(`${r.targetType}:${r.targetId}`) ?? 1,
  }));
}

/** Hides the reported thing without deleting anyone's data outright. */
async function removeTarget(prisma: PrismaClient, type: ReportTarget, id: string): Promise<void> {
  switch (type) {
    case "review": {
      const review = await prisma.review.findUnique({ where: { id }, select: { coffeeLotId: true } });
      if (!review) return;
      await prisma.$transaction(async (tx) => {
        await tx.review.update({ where: { id }, data: { status: ReviewStatus.HIDDEN } });
        await refreshReviewStats(tx, review.coffeeLotId);
      });
      return;
    }
    case "recipe":
      await prisma.mobileRecipe.updateMany({ where: { id, state: "published" }, data: { state: "unpublished" } });
      return;
    case "note":
      await prisma.mobileCoffeeSubmission.updateMany({ where: { approvedLotId: id, status: "APPROVED" }, data: { publicNote: null } });
      return;
    case "profile":
      await prisma.mobileProfile.updateMany({ where: { accountId: id }, data: { displayName: null, bio: null, avatarPath: null } });
      return;
  }
}

export async function resolveReport(
  prisma: PrismaClient, adminId: string, id: string, action: "dismiss" | "remove",
): Promise<{ closed: number }> {
  const report = await prisma.mobileReport.findUnique({ where: { id } });
  if (!report) throw ApiError.unprocessable("report_not_found");
  if (action === "remove") await removeTarget(prisma, report.targetType as ReportTarget, report.targetId);
  const { count } = await prisma.mobileReport.updateMany({
    where: { targetType: report.targetType, targetId: report.targetId, status: "open" },
    data: { status: action === "remove" ? "removed" : "dismissed", resolvedBy: adminId, resolvedAt: new Date() },
  });
  return { closed: count };
}
