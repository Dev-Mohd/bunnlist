import { prisma } from "@/lib/prisma";
import { handle } from "@/lib/mobile/respond";
import { newDiscoveries } from "@/lib/mobile/catalog";

// GET /api/v1/catalog/discoveries — public: the newest community discoveries with
// their discoverer, topped up with the newest published lots.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => ({ lots: await newDiscoveries(prisma) }));
}
