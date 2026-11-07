import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { myTeamMessages } from "@/lib/mobile/teamMessages";

// GET /api/v1/me/messages — «رسائل BunnList»: messages from the team, newest first, and the unread count.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => myTeamMessages(prisma, await authenticate(req, requireAccessSecret())));
}
