import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { checkUsername, setUsername, UsernameRequest } from "@/lib/mobile/profile";

// The caller's @username.
//   GET /api/v1/me/username?check=name — is it valid and free (for live feedback)
//   PUT /api/v1/me/username              — claim it (409 username_taken, 422 + reason)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const candidate = new URL(req.url).searchParams.get("check") ?? "";
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return checkUsername(prisma, accountId, candidate);
  });
}

export async function PUT(req: Request) {
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    const { username } = parseBody(UsernameRequest, await readJson(req));
    return setUsername(prisma, accountId, username);
  });
}
