import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { listRoasters } from "@/lib/mobile/roasters";

// GET /api/v1/catalog/roasters — every roaster with published coffees. Public; a
// valid bearer adds which ones the caller follows.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const viewer = req.headers.get("authorization") ? await authenticate(req, requireAccessSecret()).catch(() => null) : null;
    return listRoasters(prisma, viewer);
  });
}
