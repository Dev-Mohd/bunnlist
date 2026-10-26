import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { assertCanPost } from "@/lib/mobile/adminUsers";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { ProfileUpdate, updateProfile } from "@/lib/mobile/profile";

// PATCH /api/v1/me/profile — display name (1-40) and bio (≤ 160).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await assertCanPost(prisma, accountId);
    return updateProfile(prisma, accountId, parseBody(ProfileUpdate, await readJson(req)));
  });
}
