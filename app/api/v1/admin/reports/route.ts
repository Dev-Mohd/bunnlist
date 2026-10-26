import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { requireAdmin } from "@/lib/mobile/admin";
import { listReports } from "@/lib/mobile/reports";

// GET /api/v1/admin/reports?status=open|closed — admins only, with each report's content.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const status = new URL(req.url).searchParams.get("status") === "closed" ? "closed" : "open";
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    return { reports: await listReports(prisma, status) };
  });
}
