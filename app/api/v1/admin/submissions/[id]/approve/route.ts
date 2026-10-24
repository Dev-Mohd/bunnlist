import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { approveSubmission, ApproveRequest, requireAdmin } from "@/lib/mobile/admin";
import { supabasePhotoStore } from "@/lib/mobile/suggestionPhotos";

// POST /api/v1/admin/submissions/[id]/approve — admins only: publish the lot from
// the (edited) suggestion and credit its author.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    const input = parseBody(ApproveRequest, await readJson(req));
    return approveSubmission(prisma, supabasePhotoStore(), id, input);
  });
}
