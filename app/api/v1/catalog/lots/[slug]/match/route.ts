import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { tasteMatch } from "@/lib/mobile/tasteMatch";

// GET /api/v1/catalog/lots/[slug]/match — signed in: how well this coffee fits
// the caller's taste (from their own ratings), with reasons.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return handle(async () => tasteMatch(prisma, await authenticate(req, requireAccessSecret()), decodeURIComponent(slug)));
}
