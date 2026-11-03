import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { myBlocks } from "@/lib/mobile/blocks";

// GET /api/v1/me/blocks — the people the caller blocked.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => ({ people: await myBlocks(prisma, await authenticate(req, requireAccessSecret())) }));
}
