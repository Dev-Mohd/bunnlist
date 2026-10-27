import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { MyGrinderRequest, setMyGrinder } from "@/lib/mobile/grinders";

// PUT /api/v1/me/grinder — signed in: { grinderId } sets «مطحنتي»; null clears it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    const { grinderId } = parseBody(MyGrinderRequest, await readJson(req));
    return setMyGrinder(prisma, accountId, grinderId);
  });
}
