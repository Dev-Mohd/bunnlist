import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { personCoffees, Shelf } from "@/lib/mobile/people";

// GET /api/v1/users/[username]/coffees?shelf=owned|tried|favorite|wantsToTry — a person's
// coffees on a shelf with every shelf's count; 403 hidden_by_owner when their activity is
// kept from this viewer (a private account, to non-followers).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return handle(async () => {
    const viewerId = req.headers.get("authorization")
      ? await authenticate(req, requireAccessSecret()).catch(() => null)
      : null;
    const shelf = Shelf.catch("owned").parse(new URL(req.url).searchParams.get("shelf") ?? "owned");
    return personCoffees(prisma, viewerId, decodeURIComponent(username), shelf);
  });
}
