import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { browseLots, parseBrowseQuery } from "@/lib/mobile/browse";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";

// GET /api/v1/catalog/browse?q=&sort=&origins=&roasters=&processes=&methods=&flavors=&shelf=&favorites=&offset=&limit=
// Public; a valid bearer enables the shelf / favorites filters.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const query = parseBrowseQuery(new URL(req.url).searchParams);
    const accountId = req.headers.get("authorization")
      ? await authenticate(req, requireAccessSecret()).catch(() => null)
      : null;
    return browseLots(prisma, query, accountId);
  });
}
