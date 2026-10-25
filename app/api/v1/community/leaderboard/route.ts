import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { leaderboard } from "@/lib/mobile/points";

// GET /api/v1/community/leaderboard?period=week|all — public top 50 by points
// (accounts that chose to hide are left out). A valid bearer adds the caller's rank.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const period = new URL(req.url).searchParams.get("period") === "all" ? "all" : "week";
  return handle(async () => {
    const viewerId = req.headers.get("authorization")
      ? await authenticate(req, requireAccessSecret()).catch(() => null)
      : null;
    return leaderboard(prisma, period, viewerId);
  });
}
