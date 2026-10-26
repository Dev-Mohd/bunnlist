import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { passport } from "@/lib/mobile/passport";

// GET /api/v1/me/passport — the caller's coffee passport: origin stamps and badges.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => passport(prisma, await authenticate(req, requireAccessSecret())));
}
