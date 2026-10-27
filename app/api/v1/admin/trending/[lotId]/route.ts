import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { requireAdmin } from "@/lib/mobile/admin";
import { setTrendingOverride, TrendingOverride } from "@/lib/mobile/home";

// PUT /api/v1/admin/trending/[lotId] {mode: "pin" | "hide" | null} — admins only:
// pin a coffee to the home's trending list, keep it off, or clear either.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PUT(req: Request, { params }: { params: Promise<{ lotId: string }> }) {
  const { lotId } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    const { mode } = parseBody(TrendingOverride, await readJson(req));
    return setTrendingOverride(prisma, accountId, lotId, mode);
  });
}
