import { prisma } from "@/lib/prisma";
import { handle } from "@/lib/mobile/respond";
import { similarLots } from "@/lib/mobile/similar";

// GET /api/v1/catalog/lots/[slug]/similar — coffees from other roasters that taste
// alike (with why), and more from the same roaster. Public.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return handle(async () => similarLots(prisma, slug));
}
