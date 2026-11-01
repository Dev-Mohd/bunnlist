import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { forYou } from "@/lib/mobile/forYou";

// GET /api/v1/me/for-you — the signed-in home: today's coffee for their taste,
// owned coffees not rated yet, new coffees from roasters they collect, and what
// the people they follow brewed this week.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return forYou(prisma, accountId);
  });
}
