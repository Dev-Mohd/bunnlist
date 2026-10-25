import { prisma } from "@/lib/prisma";
import { topRatedLots } from "@/lib/mobile/catalog";
import { handle } from "@/lib/mobile/respond";

// GET /api/v1/catalog/top — the best-rated published coffees, for the home screen.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => ({ lots: await topRatedLots(prisma) }));
}
