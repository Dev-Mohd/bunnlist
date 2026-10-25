import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { getNotificationSettings, NotificationSettingsUpdate, updateNotificationSettings } from "@/lib/mobile/push";

// GET / PATCH /api/v1/me/notifications — which push notifications this account wants.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => getNotificationSettings(prisma, await authenticate(req, requireAccessSecret())));
}

export async function PATCH(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return updateNotificationSettings(prisma, accountId, parseBody(NotificationSettingsUpdate, await readJson(req)));
  });
}
