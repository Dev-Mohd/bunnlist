import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { requireAdmin } from "@/lib/mobile/admin";
import { MergeRequest, mergeLots } from "@/lib/mobile/duplicates";

// POST /api/v1/admin/duplicates/merge {keepId, dropId} — admins only: merges a duplicate into
// the coffee kept (details, people's records and its link move over).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin(prisma, await authenticate(req, requireAccessSecret()));
    const { keepId, dropId } = parseBody(MergeRequest, await readJson(req));
    return mergeLots(prisma, keepId, dropId);
  });
}
