import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { requireAdmin } from "@/lib/mobile/admin";
import { ChallengeUpdate, deleteChallenge, updateChallenge } from "@/lib/mobile/challenges";

// PATCH edits a challenge, DELETE removes it (admins only).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    await requireAdmin(prisma, await authenticate(req, requireAccessSecret()));
    return updateChallenge(prisma, id, parseBody(ChallengeUpdate, await readJson(req)));
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    await requireAdmin(prisma, await authenticate(req, requireAccessSecret()));
    return deleteChallenge(prisma, id);
  });
}
