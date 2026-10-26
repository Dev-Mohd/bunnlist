import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { requireAdmin } from "@/lib/mobile/admin";
import { resolveReport, ResolveRequest } from "@/lib/mobile/reports";

// POST /api/v1/admin/reports/[id] — admins only: { action: "dismiss" | "remove" };
// closes every open report on the same content.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    const { action } = parseBody(ResolveRequest, await readJson(req));
    return resolveReport(prisma, accountId, id, action);
  });
}
