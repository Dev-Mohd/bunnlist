import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { requireAdmin } from "@/lib/mobile/admin";
import { PhotoToolRequest, photoTool } from "@/lib/mobile/photoTools";
import { optionalPhotoStore } from "@/lib/mobile/suggestionPhotos";

// POST /api/v1/admin/photos — admins only: preview or apply a backdrop cut / crop,
// delete or restore a photo, or cut a whole roaster's waiting photos (in runs).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin(prisma, await authenticate(req, requireAccessSecret()));
    const input = parseBody(PhotoToolRequest, await readJson(req));
    return photoTool(prisma, optionalPhotoStore(), input, 45_000);
  });
}
