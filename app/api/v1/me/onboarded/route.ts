import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { markOnboarded } from "@/lib/mobile/profile";

// POST /api/v1/me/onboarded — the first-run setup is done (or skipped); the app
// stops showing it on every device.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return markOnboarded(prisma, accountId);
  });
}
