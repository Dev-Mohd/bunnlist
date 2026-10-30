import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { requireAdmin } from "@/lib/mobile/admin";
import { ApproveAllRequest, approveAll } from "@/lib/mobile/adminBulk";
import { claudeLatinNamer } from "@/lib/mobile/latinNames";
import { optionalPhotoStore } from "@/lib/mobile/suggestionPhotos";
import { notify } from "@/lib/mobile/push";
import { UNCREDITED_ACCOUNTS } from "@/lib/mobile/submissions";

// POST /api/v1/admin/submissions/approve-all — admins only: publishes every waiting
// suggestion (or one roaster's) as it stands, as many as fit in one run. The app
// calls it again while `remaining` > 0, passing the ids that failed as `skip`.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin(prisma, await authenticate(req, requireAccessSecret()));
    const input = parseBody(ApproveAllRequest, await readJson(req));
    const apiKey = process.env.ANTHROPIC_API_KEY;
    const result = await approveAll(prisma, optionalPhotoStore(), input, apiKey ? claudeLatinNamer(apiKey) : null, 40_000);
    const authored = await prisma.mobileCoffeeSubmission.findMany({
      where: { id: { in: result.done }, accountId: { notIn: UNCREDITED_ACCOUNTS } }, select: { accountId: true, name: true },
    });
    for (const a of authored) {
      await notify(prisma, a.accountId, "submissionApproved", { title: "انقبل اقتراحك 🎉", body: `«${a.name}» صارت في الدليل باسمك` });
    }
    return result;
  });
}
