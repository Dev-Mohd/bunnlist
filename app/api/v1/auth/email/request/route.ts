import { requestOtp } from "@/lib/mobile/emailService";
import { buildEmailDeps } from "@/lib/mobile/deps";
import { EmailRequest, parseBody } from "@/lib/mobile/schemas";
import { handle, readJson } from "@/lib/mobile/respond";
import { prisma } from "@/lib/prisma";
import { clientIp, hit, LIMITS } from "@/lib/mobile/rateLimit";

// POST /api/v1/auth/email/request — begin email login. Always responds the same
// way ({ ok: true }) whether or not a mail went out, so it never reveals which
// addresses exist or whether mail is configured. A failed send is logged, not surfaced.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return handle(async () => {
    const { email } = parseBody(EmailRequest, await readJson(req));
    // One device can't send codes to many addresses (spam, mail quota).
    await hit(prisma, LIMITS.otpRequestIp, clientIp(req), "too_many_requests");
    try {
      await requestOtp(email, buildEmailDeps(), Date.now());
    } catch (err) {
      console.error("otp send failed", err);
    }
    return { ok: true };
  });
}
