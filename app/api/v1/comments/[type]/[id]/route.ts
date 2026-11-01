import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { addComment, CommentRequest, commentTarget, listComments } from "@/lib/mobile/comments";
import { displayNames } from "@/lib/mobile/profile";
import { notify } from "@/lib/mobile/push";

// GET lists, POST adds a comment on /api/v1/comments/brew|recipe|review/[id].
// A new comment notifies the post's owner.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  return handle(async () => {
    const viewerId = req.headers.get("authorization")
      ? await authenticate(req, requireAccessSecret()).catch(() => null)
      : null;
    return listComments(prisma, commentTarget(type), id, viewerId);
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    const { body } = parseBody(CommentRequest, await readJson(req));
    const kind = commentTarget(type);
    return addComment(prisma, accountId, kind, id, body, async (ownerId, title) => {
      const name = (await displayNames(prisma, [accountId])).get(accountId) ?? "شخص";
      await notify(prisma, ownerId, "comments", {
        title: "تعليق جديد 💬",
        body: `${name} علّق على ${kind === "brew" ? "تحضيرك لـ" : kind === "review" ? "تقييمك لـ" : "وصفتك "}«${title}»: ${body.slice(0, 80)}`,
        data: { target: kind, id },
      });
    });
  });
}
