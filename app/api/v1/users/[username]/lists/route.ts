import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { userLists } from "@/lib/mobile/lists";

// GET /api/v1/users/[username]/lists — a person's public lists (all of them for themselves).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return handle(async () => {
    const viewerId = req.headers.get("authorization") ? await authenticate(req, requireAccessSecret()).catch(() => null) : null;
    return userLists(prisma, viewerId, decodeURIComponent(username));
  });
}
