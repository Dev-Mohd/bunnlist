import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";
import { requireAdmin } from "@/lib/mobile/admin";
import { searchUsers, USER_FILTERS, type UserFilter } from "@/lib/mobile/adminUsers";

// GET /api/v1/admin/users?q=&filter= — admins only: newest accounts, or by username, name or email;
// filter is all | active | new | founders | suspended | admins.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const q = params.get("q") ?? "";
  const asked = params.get("filter") ?? "all";
  const filter: UserFilter = (USER_FILTERS as readonly string[]).includes(asked) ? (asked as UserFilter) : "all";
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await requireAdmin(prisma, accountId);
    return { users: await searchUsers(prisma, q, new Date(), filter) };
  });
}
