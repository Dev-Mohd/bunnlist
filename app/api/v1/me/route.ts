import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { isAdmin } from "@/lib/mobile/admin";
import { getProfile } from "@/lib/mobile/profile";

// GET /api/v1/me — what the app needs about the signed-in account: its profile
// (@username, display name, bio, avatar, whether first-run setup is done), whether
// it may open the admin review screen, and how many suggestions became lots.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    const [admin, discoveries, profile] = await Promise.all([
      isAdmin(prisma, accountId),
      prisma.mobileCoffeeSubmission.count({ where: { accountId, status: "APPROVED" } }),
      getProfile(prisma, accountId),
    ]);
    return { isAdmin: admin, discoveries, ...profile };
  });
}
