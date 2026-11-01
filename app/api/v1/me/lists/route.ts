import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { createList, ListInput, myLists } from "@/lib/mobile/lists";

// GET /api/v1/me/lists[?lot=<slug>] — my lists (and which hold that coffee); POST creates one.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return myLists(prisma, accountId, new URL(req.url).searchParams.get("lot"));
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return createList(prisma, accountId, parseBody(ListInput, await readJson(req)));
  });
}
