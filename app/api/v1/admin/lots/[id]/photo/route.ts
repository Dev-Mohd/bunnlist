import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { requireAdmin } from "@/lib/mobile/admin";
import { replaceLotPhoto } from "@/lib/mobile/adminConsole";
import { optionalPhotoStore, SuggestionPhotoRequest } from "@/lib/mobile/suggestionPhotos";

// POST /api/v1/admin/lots/[id]/photo — admins only: replaces the lot's picture
// with a cut-out JPEG ({ imageBase64 }).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    const { imageBase64 } = parseBody(SuggestionPhotoRequest, await readJson(req));
    return replaceLotPhoto(prisma, optionalPhotoStore(), id, imageBase64);
  });
}
