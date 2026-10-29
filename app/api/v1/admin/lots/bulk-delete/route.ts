import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { requireAdmin } from "@/lib/mobile/admin";
import { BulkDeleteLotsRequest, bulkDeleteLots } from "@/lib/mobile/adminBulk";

// POST /api/v1/admin/lots/bulk-delete — admins only: delete up to 100 unused lots
// at once; lots people have reviewed, brewed or written recipes for are reported back.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    return bulkDeleteLots(prisma, parseBody(BulkDeleteLotsRequest, await readJson(req)).ids);
  });
}
