import { prisma } from "@/lib/prisma";
import { handle } from "@/lib/mobile/respond";
import { listUpdates } from "@/lib/mobile/updates";

// GET /api/v1/updates — «تحديثات BunnList», newest first, with comment counts. Public.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => ({ updates: await listUpdates(prisma) }));
}
