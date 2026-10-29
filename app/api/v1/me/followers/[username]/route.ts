import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { removeFollower } from "@/lib/mobile/social";

// DELETE /api/v1/me/followers/[username] — take someone off your followers (they aren't told).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return handle(async () => removeFollower(prisma, await authenticate(req, requireAccessSecret()), decodeURIComponent(username)));
}
