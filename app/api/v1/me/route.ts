import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { isAdmin } from "@/lib/mobile/admin";
import { getUsername } from "@/lib/mobile/profile";

// GET /api/v1/me — what the app needs about the signed-in account: its @username,
// whether it may open the admin review screen, and how many suggestions became lots.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    const [admin, discoveries, username] = await Promise.all([
      isAdmin(prisma, accountId),
      prisma.mobileCoffeeSubmission.count({ where: { accountId, status: "APPROVED" } }),
      getUsername(prisma, accountId),
    ]);
    return { isAdmin: admin, discoveries, username };
  });
}
