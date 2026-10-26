import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { assertCanPost } from "@/lib/mobile/adminUsers";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { SubmissionRequest, createSubmission, listMySubmissions } from "@/lib/mobile/submissions";

// Authenticated coffee suggestions.
//   GET  /api/v1/submissions — the caller's suggestions with review status
//   POST /api/v1/submissions — submit a new coffee suggestion for review
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await assertCanPost(prisma, accountId);
    const input = parseBody(SubmissionRequest, await readJson(req));
    const { id } = await createSubmission(prisma, accountId, input);
    return { ok: true, id };
  });
}

export async function GET(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return { submissions: await listMySubmissions(prisma, accountId) };
  });
}
