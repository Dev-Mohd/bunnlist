import { authenticate } from "@/lib/mobile/authGuard";
import { deleteAccount } from "@/lib/mobile/accountService";
import { buildAccountDeps, requireAccessSecret } from "@/lib/mobile/deps";
import { handle } from "@/lib/mobile/respond";

// POST /api/v1/account/delete — authenticated. Permanently deletes the caller's
// account and data, and best-effort revokes any Apple tokens (Guideline 5.1.1).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    await deleteAccount(accountId, buildAccountDeps());
    return { ok: true };
  });
}
