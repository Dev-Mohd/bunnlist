import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { SubmissionRequest, createSubmission } from "@/lib/mobile/submissions";

// POST /api/v1/submissions — authenticated: submit a new coffee suggestion for review.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    const input = parseBody(SubmissionRequest, await readJson(req));
    const { id } = await createSubmission(prisma, accountId, input);
    return { ok: true, id };
  });
}
