import { randomUUID, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { createProviderVerifier } from "./verifier";
import { createPrismaIdentityResolver } from "./resolver";
import { createPrismaSessionStore } from "./sessionStore";
import { createPrismaOtpStore } from "./otpStore";
import { createResendMailer } from "./mailer";
import type { AuthDeps } from "./ports";
import type { EmailDeps } from "./emailService";

// Assembles the real (Prisma- and provider-backed) AuthDeps from environment
// configuration. Called per request by the route handlers. The access-token
// secret is required for every endpoint; the per-provider audiences are required
// only when that provider is actually used (an unconfigured provider fails closed
// inside the verifier), so refresh works before Apple/Google audiences are set.

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS = "https://appleid.apple.com/auth/keys";
const GOOGLE_ISSUER = ["https://accounts.google.com", "accounts.google.com"];
const GOOGLE_JWKS = "https://www.googleapis.com/oauth2/v3/certs";

function splitAudience(value: string | undefined): string[] {
  return (value ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export function buildAuthDeps(): AuthDeps {
  const accessSecret = process.env.MOBILE_JWT_SECRET;
  if (!accessSecret || accessSecret.length < 32) {
    throw new Error("MOBILE_JWT_SECRET must be set to at least 32 characters.");
  }

  const verifier = createProviderVerifier({
    apple: { issuer: APPLE_ISSUER, audience: splitAudience(process.env.MOBILE_APPLE_AUDIENCE), jwks: APPLE_JWKS },
    google: { issuer: GOOGLE_ISSUER, audience: splitAudience(process.env.MOBILE_GOOGLE_AUDIENCE), jwks: GOOGLE_JWKS },
  });

  return {
    verifier,
    resolver: createPrismaIdentityResolver(prisma),
    sessions: createPrismaSessionStore(prisma),
    accessSecret,
    newId: () => randomUUID(),
    newSecret: () => randomBytes(32).toString("base64url"),
  };
}

// Assembles the email-login dependencies. Reuses the full AuthDeps so a verified
// code issues tokens through the same exchange path as Apple/Google.
export function buildEmailDeps(): EmailDeps {
  return {
    otp: createPrismaOtpStore(prisma),
    mailer: createResendMailer(),
    auth: buildAuthDeps(),
  };
}
