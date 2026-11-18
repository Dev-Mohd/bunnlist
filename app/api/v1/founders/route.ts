import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { founderStats } from "@/lib/mobile/founders";
import { founderDirectory, founderPoll, inviterState } from "@/lib/mobile/founderPerks";
import { isAdmin } from "@/lib/mobile/admin";
import { founderRecipes } from "@/lib/mobile/recipes";

// GET /api/v1/founders — public: how many «مبدع مؤسس» badges are given of 100, who the
// founders are, and their published recipes. A valid bearer adds who invited the caller.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const viewerId = req.headers.get("authorization")
      ? await authenticate(req, requireAccessSecret()).catch(() => null)
      : null;
    const admin = viewerId ? await isAdmin(prisma, viewerId) : false;
    const [stats, founders, recipes, inviter, poll] = await Promise.all([
      founderStats(prisma), founderDirectory(prisma), founderRecipes(prisma, viewerId), inviterState(prisma, viewerId), founderPoll(prisma, viewerId, admin),
    ]);
    return { ...stats, founders, recipes, inviter, poll, isAdmin: admin };
  });
}
