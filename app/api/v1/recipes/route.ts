import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { assertCanPost } from "@/lib/mobile/adminUsers";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { listMyRecipes, RecipeUpsert, saveRecipe } from "@/lib/mobile/recipes";

// The caller's recipes.
//   GET  /api/v1/recipes — non-deleted, most recently edited first
//   POST /api/v1/recipes — create or edit by clientId (publish optional, validated)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return { recipes: await listMyRecipes(prisma, accountId) };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await assertCanPost(prisma, accountId);
    const input = parseBody(RecipeUpsert, await readJson(req));
    return saveRecipe(prisma, accountId, input);
  });
}
