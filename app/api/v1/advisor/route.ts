import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { advise, AdvisorRequest, claudeTextReader } from "@/lib/mobile/advisor";

// POST /api/v1/advisor — «ساعدني أختار»: answers in, three coffees out. Public; the
// free-text sentence needs sign-in (it uses Claude, capped per day).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const accountId = req.headers.get("authorization") ? await authenticate(req, requireAccessSecret()).catch(() => null) : null;
    const input = parseBody(AdvisorRequest, await readJson(req));
    const apiKey = process.env.ANTHROPIC_API_KEY;
    return advise(prisma, accountId, input, apiKey ? claudeTextReader(apiKey) : null);
  });
}
