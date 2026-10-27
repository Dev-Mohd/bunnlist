import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { requireAdmin } from "@/lib/mobile/admin";
import { broadcast, broadcastAudiences, broadcastHistory, BroadcastRequest } from "@/lib/mobile/adminUsers";

// GET /api/v1/admin/broadcasts — admins only: audience sizes and past broadcasts.
// POST { title, body, audience: test | all | active30 } — sends a push to them.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    const [audiences, history] = await Promise.all([broadcastAudiences(prisma), broadcastHistory(prisma)]);
    return { audiences, history };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    return broadcast(prisma, accountId, parseBody(BroadcastRequest, await readJson(req)));
  });
}
