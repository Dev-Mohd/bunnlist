import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { requireAdmin } from "@/lib/mobile/admin";
import { feedbackInbox } from "@/lib/mobile/feedback";

// GET /api/v1/admin/feedback?filter=open|all — the team's inbox (admins only).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    await requireAdmin(prisma, await authenticate(req, requireAccessSecret()));
    const filter = new URL(req.url).searchParams.get("filter") === "all" ? "all" : "open";
    return feedbackInbox(prisma, filter);
  });
}
