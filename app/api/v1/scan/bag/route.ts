import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { ApiError } from "@/lib/mobile/errors";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { BagScanRequest, claudeBagReader, scanBag } from "@/lib/mobile/bagScan";

// POST /api/v1/scan/bag — signed-in users send one bag photo; Claude extracts the
// label's fields and we return them with matching published lots. The photo is
// not stored. Needs ANTHROPIC_API_KEY in the environment (403 ai_not_configured).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw ApiError.forbidden("ai_not_configured");
    const image = parseBody(BagScanRequest, await readJson(req));
    return scanBag(prisma, claudeBagReader(apiKey), accountId, image);
  });
}
