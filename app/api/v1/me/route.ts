import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { isAdmin } from "@/lib/mobile/admin";

// GET /api/v1/me — what the app needs about the signed-in account: whether it may
// open the admin review screen, and how many of its suggestions became lots.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    const [admin, discoveries] = await Promise.all([
      isAdmin(prisma, accountId),
      prisma.mobileCoffeeSubmission.count({ where: { accountId, status: "APPROVED" } }),
    ]);
    return { isAdmin: admin, discoveries };
  });
}
