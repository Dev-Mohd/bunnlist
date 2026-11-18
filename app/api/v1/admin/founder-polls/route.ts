import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { requireAdmin } from "@/lib/mobile/admin";
import { closeFounderPoll, createFounderPoll, FounderPollInput } from "@/lib/mobile/founderPerks";

// POST { question, options } asks the founders a new question (closing any open one).
// DELETE closes the open poll. Admins only.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    return { poll: await createFounderPoll(prisma, accountId, parseBody(FounderPollInput, await readJson(req))) };
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    return { poll: await closeFounderPoll(prisma, accountId) };
  });
}
