import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { requireAdmin } from "@/lib/mobile/admin";
import { handle } from "@/lib/mobile/respond";
import { queueCounts } from "@/lib/mobile/adminQueue";

// GET /api/v1/admin/queue — admins only: the day's work, counted (suggestions waiting,
// coffees missing origin / process / notes / photo, open reports).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin(prisma, await authenticate(req, requireAccessSecret()));
    return queueCounts(prisma);
  });
}
