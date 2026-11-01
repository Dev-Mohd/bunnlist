import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { deleteList, ListUpdate, updateList } from "@/lib/mobile/lists";

// PATCH renames / re-describes / shows or hides a list; DELETE removes it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return updateList(prisma, accountId, id, parseBody(ListUpdate, await readJson(req)));
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => deleteList(prisma, await authenticate(req, requireAccessSecret()), id));
}
