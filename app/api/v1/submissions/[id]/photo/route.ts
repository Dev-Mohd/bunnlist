import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { attachSuggestionPhoto, SuggestionPhotoRequest, supabasePhotoStore } from "@/lib/mobile/suggestionPhotos";

// PUT /api/v1/submissions/[id]/photo — the author attaches the product photo (a
// cut-out JPEG ≤ 2 MB) to their pending suggestion. Stored privately.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    const { imageBase64 } = parseBody(SuggestionPhotoRequest, await readJson(req));
    return attachSuggestionPhoto(prisma, supabasePhotoStore(), accountId, id, imageBase64);
  });
}
