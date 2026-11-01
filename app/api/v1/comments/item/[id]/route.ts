import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { deleteComment } from "@/lib/mobile/comments";

// DELETE /api/v1/comments/item/[id] — by its author, the post's owner or an admin.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => deleteComment(prisma, await authenticate(req, requireAccessSecret()), id));
}
