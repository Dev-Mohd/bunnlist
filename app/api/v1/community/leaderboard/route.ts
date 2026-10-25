import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { leaderboard, LEADERBOARD_KINDS, type LeaderboardKind } from "@/lib/mobile/points";

// GET /api/v1/community/leaderboard?period=week|all&kind=points|discoverers|raters
// — public top 50 (accounts that chose to hide are left out). A valid bearer adds
// the caller's rank.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const period = params.get("period") === "all" ? "all" : "week";
  const requested = params.get("kind") as LeaderboardKind | null;
  const kind = requested && LEADERBOARD_KINDS.includes(requested) ? requested : "points";
  const limit = Math.min(Math.max(Number(params.get("limit")) || 50, 1), 50);
  return handle(async () => {
    const viewerId = req.headers.get("authorization")
      ? await authenticate(req, requireAccessSecret()).catch(() => null)
      : null;
    return leaderboard(prisma, period, viewerId, new Date(), limit, kind);
  });
}
