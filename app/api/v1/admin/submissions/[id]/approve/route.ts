import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { approveSubmission, ApproveRequest, requireAdmin } from "@/lib/mobile/admin";
import { claudeLatinNamer } from "@/lib/mobile/latinNames";
import { optionalPhotoStore } from "@/lib/mobile/suggestionPhotos";

// POST /api/v1/admin/submissions/[id]/approve — admins only: publish the lot from
// the (edited) suggestion and credit its author. Missing Latin names are written
// by Claude (letter-by-letter without an API key).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    const input = parseBody(ApproveRequest, await readJson(req));
    const apiKey = process.env.ANTHROPIC_API_KEY;
    return approveSubmission(prisma, optionalPhotoStore(), id, input, apiKey ? claudeLatinNamer(apiKey) : null);
  });
}
