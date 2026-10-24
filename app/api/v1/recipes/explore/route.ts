import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { exploreRecipes } from "@/lib/mobile/recipes";

// GET /api/v1/recipes/explore[?lot=slug] — published recipes from everyone, newest
// first. Public; a valid bearer only marks which recipes are the caller's.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const lot = new URL(req.url).searchParams.get("lot");
  return handle(async () => {
    const viewerId = req.headers.get("authorization")
      ? await authenticate(req, requireAccessSecret()).catch(() => null)
      : null;
    return { recipes: await exploreRecipes(prisma, viewerId, lot) };
  });
}
