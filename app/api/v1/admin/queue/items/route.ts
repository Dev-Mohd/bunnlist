import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { requireAdmin } from "@/lib/mobile/admin";
import { handle } from "@/lib/mobile/respond";
import { optionalPhotoStore } from "@/lib/mobile/suggestionPhotos";
import { QUEUE_KINDS, queueItems, type QueueKind } from "@/lib/mobile/adminQueue";

// GET /api/v1/admin/queue/items?kind=pending|incomplete&roaster= — admins only: one roaster's
// cards (up to 100), each with what it's missing.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin(prisma, await authenticate(req, requireAccessSecret()));
    const params = new URL(req.url).searchParams;
    const raw = params.get("kind") ?? "pending";
    const kind: QueueKind = (QUEUE_KINDS as readonly string[]).includes(raw) ? (raw as QueueKind) : "pending";
    return { items: await queueItems(prisma, optionalPhotoStore(), kind, params.get("roaster")) };
  });
}
