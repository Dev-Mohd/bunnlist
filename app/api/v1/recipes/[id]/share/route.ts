import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { shareRecipe } from "@/lib/mobile/recipes";

// POST /api/v1/recipes/[id]/share — the code (and link) for one of the caller's recipes.
// The same code every time; a recipe that isn't theirs reads as missing.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return shareRecipe(prisma, accountId, id);
  });
}
