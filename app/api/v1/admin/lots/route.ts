import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { requireAdmin } from "@/lib/mobile/admin";
import { LOT_FILTERS, searchLots } from "@/lib/mobile/adminConsole";

// GET /api/v1/admin/lots?q=&filter=all|hidden|noPhoto|noNotes — admins only; hidden lots included.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const raw = params.get("filter") ?? "all";
  const filter = (LOT_FILTERS as readonly string[]).includes(raw) ? (raw as (typeof LOT_FILTERS)[number]) : "all";
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    return { lots: await searchLots(prisma, params.get("q") ?? "", filter) };
  });
}
