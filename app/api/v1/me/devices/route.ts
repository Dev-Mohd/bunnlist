import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { DeviceRegistration, registerDevice, unregisterDevice } from "@/lib/mobile/push";

// POST /api/v1/me/devices {token, environment} registers this phone for push;
// DELETE {token} stops it (sign-out, notifications off).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return registerDevice(prisma, accountId, parseBody(DeviceRegistration, await readJson(req)));
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    const { token } = parseBody(DeviceRegistration.pick({ token: true }), await readJson(req));
    return unregisterDevice(prisma, accountId, token);
  });
}
