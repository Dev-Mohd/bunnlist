import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { roasterPage } from "@/lib/mobile/roasters";

// GET /api/v1/catalog/roasters/[slug] — a roaster's page. Public; a valid bearer
// adds whether the caller follows it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return handle(async () => {
    const viewer = req.headers.get("authorization") ? await authenticate(req, requireAccessSecret()).catch(() => null) : null;
    return roasterPage(prisma, slug, viewer);
  });
}
