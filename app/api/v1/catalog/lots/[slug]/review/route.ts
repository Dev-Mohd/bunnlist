import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { MobileReviewRequest, submitReview, getMyReview } from "@/lib/mobile/reviews";

// Authenticated review for one lot.
//   POST /api/v1/catalog/lots/[slug]/review  — create/update the caller's review
//   GET  /api/v1/catalog/lots/[slug]/review  — the caller's existing review (or null)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    const input = parseBody(MobileReviewRequest, await readJson(req));
    return submitReview(prisma, accountId, slug, input);
  });
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return { review: await getMyReview(prisma, accountId, slug) };
  });
}
