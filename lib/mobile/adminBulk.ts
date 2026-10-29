import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "./errors";
import { approveSubmission, ApproveRequest, rejectSubmission } from "./admin";
import { SUBMISSION_PROCESSES } from "./submissions";
import type { LatinNamer } from "./latinNames";
import type { PhotoStore } from "./suggestionPhotos";

// Review in bulk, and taking a coffee out of the catalog. Batch imports arrive in
// the dozens, and approving them one form at a time is slow: bulk approval
// publishes each suggestion as it stands (fixes come later, from the lot editor).

export const BulkReviewRequest = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  /** remove: clears rejected suggestions off the list (kept as ARCHIVED so re-imports skip them). */
  action: z.enum(["approve", "reject", "remove"]),
  reason: z.string().trim().max(300).optional(),
});
export type BulkReviewRequest = z.infer<typeof BulkReviewRequest>;

export interface BulkReviewResult {
  done: string[];
  failed: { id: string; name: string; reason: string }[];
}

/** Blends and coffees without a stated origin are filed under "مزيج". */
const BLEND = { isoCode: "XB", nameAr: "مزيج" };
const EXTRA_ORIGINS: Record<string, string> = {
  "السعودية": "SA", "هندوراس": "HN", "المكسيك": "MX", "بوروندي": "BI", "تنزانيا": "TZ", "بنما": "PA",
  "الإكوادور": "EC", "زامبيا": "ZM", "نيبال": "NP", "بوليفيا": "BO", "جامايكا": "JM", "تايلاند": "TH",
};

/** The approve form a suggestion fills by itself: its own fields, origin by name. */
export async function approvalFor(
  prisma: PrismaClient, s: { name: string; nameEn: string | null; roasterName: string; roasterNameEn: string | null;
    originName: string | null; process: string | null; roastLevel: string | null; flavorNotes: string[] },
): Promise<ApproveRequest> {
  const typed = s.originName?.trim();
  let origin = BLEND;
  if (typed) {
    const known = await prisma.originCountry.findFirst({ where: { nameAr: typed }, select: { isoCode: true, nameAr: true } });
    if (known) origin = known;
    else if (EXTRA_ORIGINS[typed]) origin = { isoCode: EXTRA_ORIGINS[typed], nameAr: typed };
    else throw ApiError.unprocessable("unknown_origin");
  }
  return ApproveRequest.parse({
    nameAr: s.name, name: s.nameEn ?? "", roasterNameAr: s.roasterName, roasterName: s.roasterNameEn ?? "",
    originCode: origin.isoCode, originNameAr: origin.nameAr,
    process: (SUBMISSION_PROCESSES as readonly string[]).includes(s.process ?? "") ? s.process : "OTHER",
    roastLevel: ["light", "medium", "dark"].includes(s.roastLevel ?? "") ? s.roastLevel : null,
    flavorNotes: s.flavorNotes.slice(0, 12),
  });
}

const REASON_AR: Record<string, string> = {
  unknown_origin: "بلد المنشأ غير معروف، افتحها وعدّله",
  already_reviewed: "انراجعت من قبل",
  not_rejected: "تنحذف المرفوضة بس",
  lot_in_use: "لها تقييمات أو تحضيرات، أخفها بدال الحذف",
  lot_not_found: "ما لقيناها",
  submission_not_found: "ما لقيناها",
};

export async function bulkReview(
  prisma: PrismaClient, store: PhotoStore | null, req: BulkReviewRequest, namer: LatinNamer | null = null,
): Promise<BulkReviewResult> {
  const rows = await prisma.mobileCoffeeSubmission.findMany({ where: { id: { in: req.ids } } });
  const byId = new Map(rows.map((r) => [r.id, r]));
  const result: BulkReviewResult = { done: [], failed: [] };
  // One at a time: each approval may create a roaster the next one reuses.
  for (const id of req.ids) {
    const row = byId.get(id);
    try {
      if (!row) throw ApiError.unprocessable("submission_not_found");
      if (req.action === "approve") await approveSubmission(prisma, store, id, await approvalFor(prisma, row), namer);
      else if (req.action === "reject") await rejectSubmission(prisma, id, req.reason);
      else await archiveSubmission(prisma, row);
      result.done.push(id);
    } catch (e) {
      const code = e instanceof ApiError ? e.reason ?? e.code : "error";
      result.failed.push({ id, name: row?.name ?? id, reason: REASON_AR[code] ?? "تعذّر" });
    }
  }
  return result;
}

/** Takes a rejected suggestion off every list; the row stays so a re-import knows it. */
async function archiveSubmission(prisma: PrismaClient, row: { id: string; status: string }): Promise<void> {
  if (row.status !== "REJECTED") throw ApiError.conflict("not_rejected");
  await prisma.mobileCoffeeSubmission.update({ where: { id: row.id }, data: { status: "ARCHIVED" } });
}

export const BulkDeleteLotsRequest = z.object({ ids: z.array(z.string().min(1)).min(1).max(100) });

/** Deletes several lots; the ones people have used stay, with the reason. */
export async function bulkDeleteLots(prisma: PrismaClient, ids: string[]): Promise<BulkReviewResult> {
  const names = new Map((await prisma.coffeeLot.findMany({ where: { id: { in: ids } }, select: { id: true, nameAr: true } }))
    .map((l) => [l.id, l.nameAr]));
  const result: BulkReviewResult = { done: [], failed: [] };
  for (const id of ids) {
    try {
      await deleteLot(prisma, id);
      result.done.push(id);
    } catch (e) {
      const code = e instanceof ApiError ? e.reason ?? e.code : "error";
      result.failed.push({ id, name: names.get(id) ?? id, reason: REASON_AR[code] ?? "تعذّر" });
    }
  }
  return result;
}

/**
 * Removes a lot from the catalog for good. Only while nobody has used it: a coffee
 * with reviews, brews or recipes would take people's records with it, so those are
 * hidden instead. Its suggestion is marked rejected so a re-import skips it.
 */
export async function deleteLot(prisma: PrismaClient, id: string): Promise<{ deleted: true }> {
  const lot = await prisma.coffeeLot.findUnique({ where: { id }, select: { id: true } });
  if (!lot) throw ApiError.unprocessable("lot_not_found");
  const [reviews, brews, recipes] = await Promise.all([
    prisma.review.count({ where: { coffeeLotId: id } }),
    prisma.mobileBrewExperience.count({ where: { lotId: id } }),
    prisma.mobileRecipe.count({ where: { lotId: id } }),
  ]);
  if (reviews + brews + recipes > 0) throw ApiError.conflict("lot_in_use");
  await prisma.$transaction([
    prisma.mobileCollectionEntry.deleteMany({ where: { lotId: id } }),
    prisma.mobileLotTag.deleteMany({ where: { lotId: id } }),
    prisma.mobileTrendingOverride.deleteMany({ where: { lotId: id } }),
    prisma.mobileCoffeeSubmission.updateMany({
      where: { approvedLotId: id }, data: { status: "REJECTED", approvedLotId: null, reviewNote: "حُذفت من الدليل" },
    }),
    prisma.coffeeLot.delete({ where: { id } }),
  ]);
  return { deleted: true };
}
