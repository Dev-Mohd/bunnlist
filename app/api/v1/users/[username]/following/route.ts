import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { followList } from "@/lib/mobile/social";

// GET /api/v1/users/[username]/following — people (with usernames), unless the owner
// keeps the list from this viewer (403 hidden_by_owner). A valid bearer identifies the viewer.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return handle(async () => {
    const viewerId = req.headers.get("authorization")
      ? await authenticate(req, requireAccessSecret()).catch(() => null)
      : null;
    return { people: await followList(prisma, decodeURIComponent(username), "following", viewerId) };
  });
}
