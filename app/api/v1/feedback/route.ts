import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { FeedbackRequest, myFeedback, sendFeedback } from "@/lib/mobile/feedback";

// GET the caller's suggestions/experiences with the team's replies;
// POST { kind: suggestion | experience | problem, body } sends one.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return { items: await myFeedback(prisma, accountId) };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return sendFeedback(prisma, accountId, parseBody(FeedbackRequest, await readJson(req)));
  });
}
