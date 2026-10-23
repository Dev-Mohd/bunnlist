import { prisma } from "@/lib/prisma";
import { listPublishedLots } from "@/lib/mobile/catalog";
import { handle } from "@/lib/mobile/respond";

// GET /api/v1/catalog/lots — public, read-only list of published coffee lots for
// the mobile app. No auth: catalog content is public.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const lots = await listPublishedLots(prisma);
    return { lots };
  });
}
