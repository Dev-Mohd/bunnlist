import { prisma } from "@/lib/prisma";
import { searchLots } from "@/lib/mobile/catalog";
import { handle } from "@/lib/mobile/respond";

// GET /api/v1/catalog/search?q=... — public search over published lots
// (name / Arabic name / roaster), for the "add a coffee" flow in the app.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q") ?? "";
  return handle(async () => {
    return { lots: await searchLots(prisma, q) };
  });
}
