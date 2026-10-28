import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { requireAdmin } from "@/lib/mobile/admin";
import { adminLot, LotEdit, updateLot } from "@/lib/mobile/adminConsole";
import { deleteLot } from "@/lib/mobile/adminBulk";

// GET/PATCH/DELETE /api/v1/admin/lots/[id] — admins only: a lot's editable details; PATCH
// changes only the fields sent (published: false hides it from the app and site);
// DELETE removes a lot nobody has used yet (409 lot_in_use otherwise).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    return adminLot(prisma, id);
  });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    return updateLot(prisma, id, parseBody(LotEdit, await readJson(req)));
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    return deleteLot(prisma, id);
  });
}
