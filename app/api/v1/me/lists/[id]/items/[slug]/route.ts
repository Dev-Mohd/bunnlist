import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { ItemInput, setListItem } from "@/lib/mobile/lists";

// PUT adds a coffee to my list (body: { note? }); DELETE takes it out.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string; slug: string }> }) {
  const { id, slug } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    // The body is optional: an empty PUT just adds the coffee.
    const raw = await req.json().catch(() => ({}));
    const { note } = parseBody(ItemInput, raw ?? {});
    return setListItem(prisma, accountId, id, decodeURIComponent(slug), true, note);
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; slug: string }> }) {
  const { id, slug } = await params;
  return handle(async () => setListItem(prisma, await authenticate(req, requireAccessSecret()), id, decodeURIComponent(slug), false));
}
