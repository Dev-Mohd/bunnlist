import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { requireAdmin } from "@/lib/mobile/admin";
import { DismissRequest, dismissDuplicate } from "@/lib/mobile/duplicates";

// POST /api/v1/admin/duplicates/dismiss {lotA, lotB} — admins only: two different coffees,
// not to be offered as duplicates again.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin(prisma, await authenticate(req, requireAccessSecret()));
    const { lotA, lotB } = parseBody(DismissRequest, await readJson(req));
    return dismissDuplicate(prisma, lotA, lotB);
  });
}
