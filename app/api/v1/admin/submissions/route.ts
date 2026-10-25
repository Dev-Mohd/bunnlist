import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { listSubmissions, requireAdmin, SUBMISSION_STATUSES } from "@/lib/mobile/admin";
import { optionalPhotoStore } from "@/lib/mobile/suggestionPhotos";

// GET /api/v1/admin/submissions?status=PENDING|APPROVED|REJECTED — admins only.
// Photos come back as one-hour signed URLs to the private bucket.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const raw = new URL(req.url).searchParams.get("status") ?? "PENDING";
  const status = (SUBMISSION_STATUSES as readonly string[]).includes(raw)
    ? (raw as (typeof SUBMISSION_STATUSES)[number]) : "PENDING";
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    return { submissions: await listSubmissions(prisma, optionalPhotoStore(), status) };
  });
}
