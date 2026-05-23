import { SignJWT, importPKCS8 } from "jose";

type CachedSecret = { secret: string; exp: number };
let cached: CachedSecret | null = null;

/**
 * Generates (or returns a cached) Apple Sign In client secret.
 *
 * Apple requires a short-lived ES256 JWT signed with your P8 private key.
 * We cache the generated secret for its full validity period (~6 months) so
 * the key is only imported once per server process.
 *
 * Returns null when any of the four required env vars is absent.
 * Never logs the private key or the generated JWT.
 */
export async function getAppleClientSecret(): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);

  // Return cached secret while it still has more than 5 minutes left.
  if (cached && cached.exp > now + 300) {
    return cached.secret;
  }

  const clientId = process.env.APPLE_CLIENT_ID;
  const teamId = process.env.APPLE_TEAM_ID;
  const keyId = process.env.APPLE_KEY_ID;
  const rawPrivateKey = process.env.APPLE_PRIVATE_KEY;

  if (!clientId || !teamId || !keyId || !rawPrivateKey) {
    return null;
  }

  // .env files store multi-line PEM blocks with literal \n — expand them.
  const privateKeyPem = rawPrivateKey.replace(/\\n/g, "\n");

  const privateKey = await importPKCS8(privateKeyPem, "ES256");

  // Apple client secrets may be valid for up to 6 months (15,777,000 s).
  const exp = now + 15_777_000;

  const secret = await new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setAudience("https://appleid.apple.com")
    .setSubject(clientId)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .sign(privateKey);

  cached = { secret, exp };
  return secret;
}
