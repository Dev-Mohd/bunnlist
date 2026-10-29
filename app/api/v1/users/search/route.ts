import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { searchPeople } from "@/lib/mobile/people";

// GET /api/v1/users/search?q= — people by @username or name (private ones too, so friends
// can ask to follow). A valid bearer adds follow state and leaves the caller out.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const viewerId = req.headers.get("authorization")
      ? await authenticate(req, requireAccessSecret()).catch(() => null)
      : null;
    const q = (new URL(req.url).searchParams.get("q") ?? "").slice(0, 40);
    return { people: await searchPeople(prisma, viewerId, q) };
  });
}
