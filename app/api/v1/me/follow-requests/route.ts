import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { followRequests } from "@/lib/mobile/social";

// GET /api/v1/me/follow-requests — people asking to follow the caller's private account.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => ({ people: await followRequests(prisma, await authenticate(req, requireAccessSecret())) }));
}
