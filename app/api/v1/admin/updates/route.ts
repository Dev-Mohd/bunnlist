import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { requireAdmin } from "@/lib/mobile/admin";
import { createUpdate, listUpdates, UpdateRequest } from "@/lib/mobile/updates";

// GET lists the team's updates; POST { title, body, notify } posts one (admins only).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin(prisma, await authenticate(req, requireAccessSecret()));
    return { updates: await listUpdates(prisma, 100) };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    return createUpdate(prisma, accountId, parseBody(UpdateRequest, await readJson(req)));
  });
}
