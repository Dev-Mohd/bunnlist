import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { ApiError } from "@/lib/mobile/errors";
import { handle } from "@/lib/mobile/respond";
import { requireAdmin } from "@/lib/mobile/admin";
import { BUNDLED_BATCHES, importBatch } from "@/lib/mobile/importBatch";
import { optionalPhotoStore } from "@/lib/mobile/suggestionPhotos";

// POST /api/v1/admin/import/[batch] — admins only: adds a bundled, cleaned batch
// of coffees as pending suggestions for review. Safe to run again; `remaining` says how
// many new ones are left for the next run.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: Promise<{ batch: string }> }) {
  const { batch } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    const bundle = BUNDLED_BATCHES[batch];
    if (!bundle) throw ApiError.unprocessable("unknown_batch");
    // Leaves headroom under the 60 s limit; a big batch finishes over a few runs.
    return importBatch(prisma, bundle.data, bundle.photos, optionalPhotoStore(), 45_000);
  });
}
