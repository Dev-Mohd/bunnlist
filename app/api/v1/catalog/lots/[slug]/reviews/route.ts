import { prisma } from "@/lib/prisma";
import { listReviews } from "@/lib/mobile/reviews";
import { handle } from "@/lib/mobile/respond";

// GET /api/v1/catalog/lots/[slug]/reviews — public: the lot's published reviews
// (latest first), for display under the lot in the app.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return handle(async () => {
    return { reviews: await listReviews(prisma, slug) };
  });
}
