import { exchange } from "@/lib/mobile/authService";
import { buildAuthDeps } from "@/lib/mobile/deps";
import { ExchangeRequest, parseBody } from "@/lib/mobile/schemas";
import { handle, readJson } from "@/lib/mobile/respond";

// POST /api/v1/auth/exchange — trade a provider-verified credential (Apple/Google
// identity token) for an access token + rotating refresh token.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const input = parseBody(ExchangeRequest, await readJson(req));
    return exchange(input, buildAuthDeps(), Date.now());
  });
}
