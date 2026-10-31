import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { requireAdmin } from "@/lib/mobile/admin";
import { findDuplicates } from "@/lib/mobile/duplicates";

// GET /api/v1/admin/duplicates — admins only: published coffees that look like the same
// coffee listed twice, roaster by roaster, with the one to keep suggested.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin(prisma, await authenticate(req, requireAccessSecret()));
    return { pairs: await findDuplicates(prisma) };
  });
}
