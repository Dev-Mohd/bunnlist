import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { isAdmin } from "@/lib/mobile/admin";
import { founderPoll, FounderVoteInput, voteOnFounderPoll } from "@/lib/mobile/founderPerks";

// GET — the latest founders' poll (founders and admins; null for everyone else).
// POST { option } — a founder's vote; voting again changes it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return { poll: await founderPoll(prisma, accountId, await isAdmin(prisma, accountId)) };
  });
}

export async function POST(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    const { option } = parseBody(FounderVoteInput, await readJson(req));
    return { poll: await voteOnFounderPoll(prisma, accountId, option) };
  });
}
