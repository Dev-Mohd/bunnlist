import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { requireAdmin } from "@/lib/mobile/admin";
import { clickSummary } from "@/lib/siteClicks";

// GET /api/v1/admin/site-clicks[?days=30] — admins only: taps on the site's download
// buttons by platform, by button and by day.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const days = Math.min(Math.max(Number(new URL(req.url).searchParams.get("days")) || 30, 1), 365);
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    return clickSummary(prisma, days);
  });
}
