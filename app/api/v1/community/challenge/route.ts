import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { currentChallenge } from "@/lib/mobile/challenges";

// GET /api/v1/community/challenge — this week's challenge, how many joined and
// finished it; a valid bearer adds the caller's progress (and pays on finishing).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const viewerId = req.headers.get("authorization")
      ? await authenticate(req, requireAccessSecret()).catch(() => null)
      : null;
    return currentChallenge(prisma, viewerId);
  });
}
