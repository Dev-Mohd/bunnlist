import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { requireAdmin } from "@/lib/mobile/admin";
import { handle } from "@/lib/mobile/respond";
import { optionalPhotoStore } from "@/lib/mobile/suggestionPhotos";
import { QUEUE_KINDS, queueRoasters, type QueueKind } from "@/lib/mobile/adminQueue";

// GET /api/v1/admin/queue/roasters?kind=pending|incomplete — admins only: the work grouped by roaster.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin(prisma, await authenticate(req, requireAccessSecret()));
    const raw = new URL(req.url).searchParams.get("kind") ?? "pending";
    const kind: QueueKind = (QUEUE_KINDS as readonly string[]).includes(raw) ? (raw as QueueKind) : "pending";
    return { roasters: await queueRoasters(prisma, kind, optionalPhotoStore()) };
  });
}
