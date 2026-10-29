import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { displayNames } from "@/lib/mobile/profile";
import { notify } from "@/lib/mobile/push";
import { answerFollowRequest } from "@/lib/mobile/social";

// POST /api/v1/me/follow-requests/[username] {accept} — accept or decline a request.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Answer = z.object({ accept: z.boolean() });

export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return handle(async () => {
    const ownerId = await authenticate(req, requireAccessSecret());
    const { accept } = parseBody(Answer, await readJson(req));
    return answerFollowRequest(prisma, ownerId, decodeURIComponent(username), accept, async (requesterId) => {
      const name = (await displayNames(prisma, [ownerId])).get(ownerId) ?? "شخص";
      const handleRow = await prisma.mobileProfile.findUnique({ where: { accountId: ownerId }, select: { username: true } });
      await notify(prisma, requesterId, "newFollower", {
        title: "انقبل طلبك", body: `صرت تتابع ${name}`,
        data: handleRow?.username ? { username: handleRow.username } : undefined,
      });
    });
  });
}
