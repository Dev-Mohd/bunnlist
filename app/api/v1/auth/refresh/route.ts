import { refresh } from "@/lib/mobile/authService";
import { buildAuthDeps } from "@/lib/mobile/deps";
import { RefreshRequest, parseBody } from "@/lib/mobile/schemas";
import { handle, readJson } from "@/lib/mobile/respond";

// POST /api/v1/auth/refresh — rotate the refresh token, returning a fresh pair.
// Reuse of a consumed token revokes the whole session family (theft response).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const { refreshToken } = parseBody(RefreshRequest, await readJson(req));
    return refresh(refreshToken, buildAuthDeps(), Date.now());
  });
}
