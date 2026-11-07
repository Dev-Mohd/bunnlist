import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { requireAdmin } from "@/lib/mobile/admin";
import { sendTeamMessage, TeamMessageRequest, teamMessagesFor } from "@/lib/mobile/teamMessages";

// Admins only. GET: what the team sent this person. POST {kind, title, body}: send one
// (signed «فريق BunnList», with a push).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    await requireAdmin(prisma, await authenticate(req, requireAccessSecret()));
    return { messages: await teamMessagesFor(prisma, id) };
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const adminId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, adminId);
    return sendTeamMessage(prisma, adminId, id, parseBody(TeamMessageRequest, await readJson(req)));
  });
}
