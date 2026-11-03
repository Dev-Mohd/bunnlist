import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { requireAdmin } from "@/lib/mobile/admin";
import { deleteUpdate } from "@/lib/mobile/updates";

// DELETE removes an update (admins only).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    await requireAdmin(prisma, await authenticate(req, requireAccessSecret()));
    return deleteUpdate(prisma, id);
  });
}
