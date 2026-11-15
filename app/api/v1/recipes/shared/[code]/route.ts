import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { recipeByShareCode } from "@/lib/mobile/recipes";

// GET /api/v1/recipes/shared/[code] — the recipe a share code opens. Public; a valid
// bearer only marks whether it is the caller's own.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  return handle(async () => {
    const viewerId = req.headers.get("authorization")
      ? await authenticate(req, requireAccessSecret()).catch(() => null)
      : null;
    return { recipe: await recipeByShareCode(prisma, code, viewerId) };
  });
}
