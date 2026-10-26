import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { fileReport, ReportRequest } from "@/lib/mobile/reports";

// POST /api/v1/reports — signed in: report a review, recipe, discoverer's note or profile.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return fileReport(prisma, accountId, parseBody(ReportRequest, await readJson(req)));
  });
}
