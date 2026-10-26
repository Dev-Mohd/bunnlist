import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { requireAdmin } from "@/lib/mobile/admin";
import { overview } from "@/lib/mobile/adminConsole";

// GET /api/v1/admin/overview — admins only: counts at a glance and 30 days of activity.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    return overview(prisma);
  });
}
