import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { changeRecipeState, RecipeStateChange } from "@/lib/mobile/recipes";

// PATCH /api/v1/recipes/[id] — publish / unpublish / delete one of the caller's
// recipes. Publishing is validated (422); invalid transitions are 409.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    const { state } = parseBody(RecipeStateChange, await readJson(req));
    return changeRecipeState(prisma, accountId, id, state);
  });
}
