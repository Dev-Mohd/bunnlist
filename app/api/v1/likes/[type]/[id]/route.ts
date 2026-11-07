import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { ApiError } from "@/lib/mobile/errors";
import { handle } from "@/lib/mobile/respond";
import { like, LIKE_TARGETS, unlike, type LikeTarget } from "@/lib/mobile/likes";
import { displayNames } from "@/lib/mobile/profile";
import { NOTIFY_WINDOWS, notifyOnce } from "@/lib/mobile/push";

// POST likes, DELETE unlikes /api/v1/likes/review|recipe/[id] (signed in).
// A new like notifies the author. Returns {count, liked}.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function targetType(type: string): LikeTarget {
  if (!(LIKE_TARGETS as readonly string[]).includes(type)) throw ApiError.unprocessable("bad_target");
  return type as LikeTarget;
}

export async function POST(req: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    const kind = targetType(type);
    return like(prisma, accountId, kind, id, async (ownerId, title) => {
      const name = (await displayNames(prisma, [accountId])).get(accountId) ?? "شخص";
      // Liking, unliking and liking again notifies once a day.
      await notifyOnce(prisma, ownerId, kind === "review" ? "reviewHelpful" : "recipeLiked", kind === "review"
        ? { title: "تقييمك مفيد 👍", body: `${name} شاف تقييمك لـ«${title}» مفيد` }
        : { title: "أحد عجبته وصفتك ❤️", body: `${name} عجبته وصفة «${title}»` },
        { key: `like:${accountId}:${kind}:${id}`, windowMs: NOTIFY_WINDOWS.like });
    });
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  return handle(async () => unlike(prisma, await authenticate(req, requireAccessSecret()), targetType(type), id));
}
