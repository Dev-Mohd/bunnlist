import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { suggestedPeople } from "@/lib/mobile/people";

// GET /api/v1/users/suggested — people to follow (signed in): coffees in common, and the week's most active.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  return handle(async () => suggestedPeople(prisma, await authenticate(req, requireAccessSecret())));
}
