import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { home } from "@/lib/mobile/home";

// GET /api/v1/home — the app's home: trending this week (coffees, roasters,
// recipes) and the community pulse. A valid bearer adds the caller's last brew and
// lets followed people come first in the pulse.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const viewerId = req.headers.get("authorization")
      ? await authenticate(req, requireAccessSecret()).catch(() => null)
      : null;
    return home(prisma, viewerId);
  });
}
