import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { getList } from "@/lib/mobile/lists";

// GET /api/v1/lists/[id] — a list with its coffees: the owner's always, a public one
// for whoever may see the owner's activity.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const viewerId = req.headers.get("authorization") ? await authenticate(req, requireAccessSecret()).catch(() => null) : null;
    return getList(prisma, id, viewerId);
  });
}
