import { prisma } from "@/lib/prisma";
import { browseFacets } from "@/lib/mobile/browse";
import { handle } from "@/lib/mobile/respond";

// GET /api/v1/catalog/facets — filter options with counts, for the app's filter sheet.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => browseFacets(prisma));
}
