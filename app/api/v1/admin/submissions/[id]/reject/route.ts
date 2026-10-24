import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { rejectSubmission, RejectRequest, requireAdmin } from "@/lib/mobile/admin";

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
    return rejectSubmission(prisma, id, reason);
  });
}
