import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { displayNames } from "@/lib/mobile/profile";
import { notify } from "@/lib/mobile/push";
import { follow, unfollow } from "@/lib/mobile/social";

// POST follows (or, for a private account, asks to), DELETE unfollows or withdraws the
// request: /api/v1/users/[username]/follow (signed in).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return handle(async () => {
    const viewerId = await authenticate(req, requireAccessSecret());
    return follow(prisma, viewerId, decodeURIComponent(username), async (followeeId, kind) => {
      const name = (await displayNames(prisma, [viewerId])).get(viewerId) ?? "شخص";
      const handleRow = await prisma.mobileProfile.findUnique({ where: { accountId: viewerId }, select: { username: true } });
      // A request rides the same «متابع جديد» notification setting.
      await notify(prisma, followeeId, "newFollower", kind === "request"
        ? { title: "طلب متابعة", body: `${name} يبي يتابعك`, data: { followRequests: "1" } }
        : { title: "متابع جديد", body: `${name} صار يتابعك`, data: handleRow?.username ? { username: handleRow.username } : undefined });
    });
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return handle(async () => unfollow(prisma, await authenticate(req, requireAccessSecret()), decodeURIComponent(username)));
}
