import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { CollectionUpdate, getEntry, setEntry } from "@/lib/mobile/collection";

// Authenticated per-lot collection state for the caller.
//   GET /api/v1/catalog/lots/[slug]/collection — current flags
//   PUT /api/v1/catalog/lots/[slug]/collection — apply a partial flag patch
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return getEntry(prisma, accountId, slug);
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    const patch = parseBody(CollectionUpdate, await readJson(req));
    return setEntry(prisma, accountId, slug, patch);
  });
}
