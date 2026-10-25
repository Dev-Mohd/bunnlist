import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { suggestUsername } from "@/lib/mobile/profile";

// GET /api/v1/me/username/suggest — a valid, free username to pre-fill first-run setup.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return suggestUsername(prisma, accountId);
  });
}
