import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { setRoasterFollow } from "@/lib/mobile/roasters";

// PUT / DELETE /api/v1/catalog/roasters/[slug]/follow — follow or unfollow a roaster.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function set(req: Request, params: Promise<{ slug: string }>, follow: boolean) {
  const { slug } = await params;
  return handle(async () => setRoasterFollow(prisma, await authenticate(req, requireAccessSecret()), slug, follow));
}

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return set(req, params, true);
}

export async function DELETE(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  return set(req, params, false);
}
