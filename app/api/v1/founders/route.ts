import { prisma } from "@/lib/prisma";
import { handle } from "@/lib/mobile/respond";
import { founderStats } from "@/lib/mobile/founders";

// GET /api/v1/founders — public: how many «مبدع مؤسس» badges are given, of 100, and how many are left.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => founderStats(prisma));
}
