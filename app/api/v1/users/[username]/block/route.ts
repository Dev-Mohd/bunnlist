import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { block, unblock } from "@/lib/mobile/blocks";

// POST blocks, DELETE unblocks: /api/v1/users/[username]/block (signed in).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return handle(async () => block(prisma, await authenticate(req, requireAccessSecret()), decodeURIComponent(username)));
}

export async function DELETE(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return handle(async () => unblock(prisma, await authenticate(req, requireAccessSecret()), decodeURIComponent(username)));
}
