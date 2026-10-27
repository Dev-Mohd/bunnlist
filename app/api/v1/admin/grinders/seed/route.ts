import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { requireAdmin } from "@/lib/mobile/admin";
import { seedGrinders } from "@/lib/mobile/grinders";

// POST /api/v1/admin/grinders/seed — admins only: adds bundled grinders that are
// missing from the guide. Never overwrites edits; safe to run again.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    return seedGrinders(prisma, new URL(req.url).origin);
  });
}
