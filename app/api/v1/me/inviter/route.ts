import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { chooseInviter, InviterChoice } from "@/lib/mobile/founderPerks";

// POST /api/v1/me/inviter { username } — «هو اللي دعاني»: the founder who invited the caller.
// Once only, in the account's first month (409 when already set, 403 after the window).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    const { username } = parseBody(InviterChoice, await readJson(req));
    return chooseInviter(prisma, accountId, username);
  });
}
