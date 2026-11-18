import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { lotFounderPicks, setFounderPick } from "@/lib/mobile/founderPerks";
import { z } from "zod";

// GET — the founders who recommend this coffee (public; a bearer adds whether the caller can / did).
// PUT { picked } — a founder recommends it or takes that back (403 founders_only, 422 pick_limit_reached).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ picked: z.boolean() });

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return handle(async () => {
    const viewerId = req.headers.get("authorization")
      ? await authenticate(req, requireAccessSecret()).catch(() => null)
      : null;
    return lotFounderPicks(prisma, slug, viewerId);
  });
}

export async function PUT(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    const { picked } = parseBody(Body, await readJson(req));
    return setFounderPick(prisma, accountId, slug, picked);
  });
}
