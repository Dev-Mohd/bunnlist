import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { requireAdmin } from "@/lib/mobile/admin";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { claudeDetailReader, suggestDetails } from "@/lib/mobile/adminQueue";

// POST /api/v1/admin/queue/suggest {kind, id} — admins only: process, origin, notes and roast
// read from the coffee's own description (text only). Nothing is saved here.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const Body = z.object({ kind: z.enum(["submission", "lot"]), id: z.string().min(1) });

export async function POST(req: Request) {
  return handle(async () => {
    await requireAdmin(prisma, await authenticate(req, requireAccessSecret()));
    const { kind, id } = parseBody(Body, await readJson(req));
    const apiKey = process.env.ANTHROPIC_API_KEY;
    return suggestDetails(prisma, apiKey ? claudeDetailReader(apiKey) : null, kind, id);
  });
}
