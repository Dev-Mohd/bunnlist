import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { requireAdmin } from "@/lib/mobile/admin";
import { BulkEditRequest, bulkEdit } from "@/lib/mobile/adminEdit";

// POST /api/v1/admin/queue/bulk-edit — admins only: set one origin, process, roast
// (or add notes) on many waiting suggestions or published coffees at once.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin(prisma, await authenticate(req, requireAccessSecret()));
    return bulkEdit(prisma, parseBody(BulkEditRequest, await readJson(req)));
  });
}
