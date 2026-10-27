import { prisma } from "@/lib/prisma";
import { handle } from "@/lib/mobile/respond";
import { listGrinders } from "@/lib/mobile/grinders";

// GET /api/v1/grinders — the grinder guide (published grinders), no sign-in needed.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => ({ grinders: await listGrinders(prisma) }));
}
