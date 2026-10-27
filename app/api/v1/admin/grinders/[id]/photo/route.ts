import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { requireAdmin } from "@/lib/mobile/admin";
import { replaceGrinderPhoto } from "@/lib/mobile/grinders";
import { optionalPhotoStore, SuggestionPhotoRequest } from "@/lib/mobile/suggestionPhotos";

// POST /api/v1/admin/grinders/[id]/photo — admins only: { imageBase64 } JPEG.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    const { imageBase64 } = parseBody(SuggestionPhotoRequest, await readJson(req));
    return replaceGrinderPhoto(prisma, optionalPhotoStore(), id, imageBase64);
  });
}
