import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { followingFeed } from "@/lib/mobile/people";

// GET /api/v1/community/following — «أتابعهم»: what the people the caller follows did lately.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => ({ items: await followingFeed(prisma, await authenticate(req, requireAccessSecret())) }));
}
