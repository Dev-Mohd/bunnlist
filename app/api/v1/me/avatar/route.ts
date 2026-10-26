import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { assertCanPost } from "@/lib/mobile/adminUsers";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { removeAvatar, setAvatar, supabaseAvatarStore } from "@/lib/mobile/avatars";
import { SuggestionPhotoRequest } from "@/lib/mobile/suggestionPhotos";

// The caller's profile picture: PUT a square JPEG (≤ 2 MB), DELETE to remove it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await assertCanPost(prisma, accountId);
    const { imageBase64 } = parseBody(SuggestionPhotoRequest, await readJson(req));
    return setAvatar(prisma, supabaseAvatarStore(), accountId, imageBase64);
  });
}

export async function DELETE(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return removeAvatar(prisma, supabaseAvatarStore(), accountId);
  });
}
