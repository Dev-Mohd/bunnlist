import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { originsMap } from "@/lib/mobile/origins";

// GET /api/v1/catalog/origins — producing countries for the map. Public; a valid
// bearer adds how many coffees from each the caller has tried.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const viewer = req.headers.get("authorization") ? await authenticate(req, requireAccessSecret()).catch(() => null) : null;
    return originsMap(prisma, viewer);
  });
}
