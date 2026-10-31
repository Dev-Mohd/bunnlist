import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { tasteMatchScores } from "@/lib/mobile/tasteMatch";

// GET /api/v1/catalog/match?slugs=a,b,c — signed in: match scores for up to 60
// coffees at once, for the badge on each card.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const slugs = (new URL(req.url).searchParams.get("slugs") ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean).slice(0, 60);
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return tasteMatchScores(prisma, accountId, slugs);
  });
}
