import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { requireAdmin } from "@/lib/mobile/admin";
import { FeedbackReply, replyFeedback } from "@/lib/mobile/feedback";

// POST { reply } answers a message and notifies its sender (admins only).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    return replyFeedback(prisma, accountId, id, parseBody(FeedbackReply, await readJson(req)).reply);
  });
}
