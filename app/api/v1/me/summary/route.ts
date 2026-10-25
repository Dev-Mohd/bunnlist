import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { profileSummary } from "@/lib/mobile/summary";

// GET /api/v1/me/summary — the profile tab's numbers, bag pictures and taste card.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return profileSummary(prisma, accountId);
  });
}
