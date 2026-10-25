import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { follow, unfollow } from "@/lib/mobile/social";

// POST follows, DELETE unfollows /api/v1/users/[username]/follow (signed in).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return handle(async () => follow(prisma, await authenticate(req, requireAccessSecret()), decodeURIComponent(username)));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return handle(async () => unfollow(prisma, await authenticate(req, requireAccessSecret()), decodeURIComponent(username)));
}
