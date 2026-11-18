import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { PinnedRecipeInput, setPinnedRecipe } from "@/lib/mobile/founderPerks";

// PUT /api/v1/me/pinned-recipe { recipeId | null } — founders: the recipe shown first on their profile.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    const { recipeId } = parseBody(PinnedRecipeInput, await readJson(req));
    return setPinnedRecipe(prisma, accountId, recipeId);
  });
}
