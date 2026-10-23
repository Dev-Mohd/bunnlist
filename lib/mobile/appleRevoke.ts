import { SignJWT, importPKCS8 } from "jose";
import type { AppleRevoker } from "./accountService";

// Revokes a user's Apple tokens at Sign in with Apple's /auth/revoke endpoint,
// which Apple requires when an account is deleted. The client secret is a short
// ES256 JWT signed with the app's Apple private key (.p8). When the Apple
// credentials are not configured, revocation is skipped (logged) so account
// deletion still proceeds — the local data is always removed.

const APPLE_AUDIENCE = "https://appleid.apple.com";
const APPLE_REVOKE_URL = "https://appleid.apple.com/auth/revoke";

interface AppleConfig {
  clientId: string;
  teamId: string;
  keyId: string;
  privateKeyPem: string;
}

function readConfig(): AppleConfig | null {
  const clientId = (process.env.MOBILE_APPLE_AUDIENCE ?? "").split(",")[0]?.trim();
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  // The .p8 contents; env stores "\n" escapes, so unescape to real newlines.
  const privateKeyPem = process.env.APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!clientId || !teamId || !keyId || !privateKeyPem) return null;
  return { clientId, teamId, keyId, privateKeyPem };
}

async function clientSecret(cfg: AppleConfig, now: number): Promise<string> {
  const key = await importPKCS8(cfg.privateKeyPem, "ES256");
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: cfg.keyId })
    .setIssuer(cfg.teamId)
    .setIssuedAt(Math.floor(now / 1000))
    .setExpirationTime(Math.floor(now / 1000) + 300)
    .setAudience(APPLE_AUDIENCE)
    .setSubject(cfg.clientId)
    .sign(key);
}

export function createAppleRevoker(): AppleRevoker {
  return {
    async revoke(refreshToken: string): Promise<void> {
      const cfg = readConfig();
      if (!cfg) {
        console.warn("Apple revocation skipped: Apple credentials not configured.");
        return;
      }
      const secret = await clientSecret(cfg, Date.now());
      const body = new URLSearchParams({
        client_id: cfg.clientId,
        client_secret: secret,
        token: refreshToken,
        token_type_hint: "refresh_token",
      });
      const res = await fetch(APPLE_REVOKE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) throw new Error(`Apple revoke failed with status ${res.status}`);
    },
  };
}
