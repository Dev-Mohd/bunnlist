import { verifyOtp } from "@/lib/mobile/emailService";
import { buildEmailDeps } from "@/lib/mobile/deps";
import { EmailVerifyRequest, parseBody } from "@/lib/mobile/schemas";
import { handle, readJson } from "@/lib/mobile/respond";

// POST /api/v1/auth/email/verify — verify the emailed code and, on success, issue
// an access token + rotating refresh token (same token shape as Apple/Google).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const input = parseBody(EmailVerifyRequest, await readJson(req));
    return verifyOtp(input, buildEmailDeps(), Date.now());
  });
}
