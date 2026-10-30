import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { requireAdmin } from "@/lib/mobile/admin";
import { RoasterNameRequest, renameRoasterEn } from "@/lib/mobile/adminEdit";

// POST /api/v1/admin/roasters/name — admins only: a roaster's English name, set
// once for its published record and all its suggestions.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin(prisma, await authenticate(req, requireAccessSecret()));
    return renameRoasterEn(prisma, parseBody(RoasterNameRequest, await readJson(req)));
  });
}
