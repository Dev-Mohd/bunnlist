import { prisma } from "@/lib/prisma";
import { handle } from "@/lib/mobile/respond";
import { followList } from "@/lib/mobile/social";

// GET /api/v1/users/[username]/followers — public list of people (with usernames).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return handle(async () => ({ people: await followList(prisma, decodeURIComponent(username), "followers") }));
}
