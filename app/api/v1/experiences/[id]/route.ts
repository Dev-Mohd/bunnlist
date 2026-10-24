import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { changeExperienceState, ExperienceStateChange } from "@/lib/mobile/experiences";

// PATCH /api/v1/experiences/[id] — publish / unpublish / delete one of the caller's
// experiences. Deleted is final; invalid transitions are 409.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    const { state } = parseBody(ExperienceStateChange, await readJson(req));
    return changeExperienceState(prisma, accountId, id, state);
  });
}
