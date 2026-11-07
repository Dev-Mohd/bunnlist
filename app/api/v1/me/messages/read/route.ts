import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { markTeamMessagesRead } from "@/lib/mobile/teamMessages";

// POST /api/v1/me/messages/read — marks the team's messages read (the screen was opened).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => markTeamMessagesRead(prisma, await authenticate(req, requireAccessSecret())));
}
