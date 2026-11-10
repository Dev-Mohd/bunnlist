import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { requireAdmin } from "@/lib/mobile/admin";
import { getRotation, RotationInput, saveRotation } from "@/lib/mobile/broadcastRotation";

// GET /api/v1/admin/broadcasts/rotation — admins only: the repeating notifications.
// PUT { enabled, everyDays, audience: all | active30, items: [{ id?, title, body, enabled }] }
// replaces the list and the settings.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    return getRotation(prisma);
  });
}

export async function PUT(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    return saveRotation(prisma, accountId, parseBody(RotationInput, await readJson(req)));
  });
}
