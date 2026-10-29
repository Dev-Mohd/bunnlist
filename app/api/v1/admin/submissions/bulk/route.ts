import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { requireAdmin } from "@/lib/mobile/admin";
import { BulkReviewRequest, bulkReview } from "@/lib/mobile/adminBulk";
import { claudeLatinNamer } from "@/lib/mobile/latinNames";
import { optionalPhotoStore } from "@/lib/mobile/suggestionPhotos";
import { notify } from "@/lib/mobile/push";
import { UNCREDITED_ACCOUNTS } from "@/lib/mobile/submissions";

// POST /api/v1/admin/submissions/bulk — admins only: approve (as they stand) or
// reject up to 100 suggestions at once. Reports which went through and why others didn't.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    const input = parseBody(BulkReviewRequest, await readJson(req));
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const result = await bulkReview(prisma, optionalPhotoStore(), input, apiKey ? claudeLatinNamer(apiKey) : null);
    const authored = await prisma.mobileCoffeeSubmission.findMany({
      where: { id: { in: result.done }, accountId: { notIn: UNCREDITED_ACCOUNTS } }, select: { accountId: true, name: true },
    });
    for (const a of authored) {
      if (input.action === "remove") break;
      await notify(prisma, a.accountId, input.action === "approve" ? "submissionApproved" : "submissionRejected",
        input.action === "approve"
          ? { title: "انقبل اقتراحك 🎉", body: `«${a.name}» صارت في الدليل باسمك` }
          : { title: "ما انقبل اقتراحك", body: `«${a.name}» ما انقبل. تقدر تشوف التفاصيل في اقتراحاتي.` });
    }
    return result;
  });
}
