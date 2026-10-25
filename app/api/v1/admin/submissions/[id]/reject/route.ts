import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { rejectSubmission, RejectRequest, requireAdmin } from "@/lib/mobile/admin";
import { notify } from "@/lib/mobile/push";
import { UNCREDITED_ACCOUNTS } from "@/lib/mobile/submissions";

// POST /api/v1/admin/submissions/[id]/reject — admins only, with an optional reason
// the author sees in "اقتراحاتي".
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    const { reason } = parseBody(RejectRequest, await readJson(req));
    const result = await rejectSubmission(prisma, id, reason);
    const author = await prisma.mobileCoffeeSubmission.findUnique({ where: { id }, select: { accountId: true, name: true } });
    if (author && !UNCREDITED_ACCOUNTS.includes(author.accountId)) {
      await notify(prisma, author.accountId, "submissionRejected", {
        title: "ما انقبل اقتراحك", body: reason ? `«${author.name}»: ${reason}` : `«${author.name}» ما انقبل. تقدر تشوف التفاصيل في اقتراحاتي.`,
      });
    }
    return result;
  });
}
