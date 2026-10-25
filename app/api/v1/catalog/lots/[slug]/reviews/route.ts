import { prisma } from "@/lib/prisma";
import { listReviews } from "@/lib/mobile/reviews";
import { handle } from "@/lib/mobile/respond";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";

// GET /api/v1/catalog/lots/[slug]/reviews — public: the lot's published reviews
// (latest first), for display under the lot in the app.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return handle(async () => {
    // A valid bearer adds which reviews the caller marked helpful.
    const viewerId = req.headers.get("authorization")
      ? await authenticate(req, requireAccessSecret()).catch(() => null)
      : null;
    return { reviews: await listReviews(prisma, slug, undefined, viewerId) };
  });
}
