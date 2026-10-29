import { jwtVerify, createLocalJWKSet, createRemoteJWKSet, type JWTVerifyGetKey, type JWK } from "jose";
import { ApiError } from "./errors";
import type { CredentialVerifier, Provider, VerifiedIdentity } from "./ports";

// Verifies Apple/Google identity tokens (OIDC ID tokens, RS256) against the
// provider's published keys, checking issuer and audience. The subject (`sub`) is
// the stable account key; the email, when the provider marks it verified, lets a
// second sign-in method join the same account. Apple private-relay addresses are
// flagged and never equated with a real address from another provider.
//
// A pre-verified email (the OTP was already checked by the email/verify route) is
// turned into an `email` identity directly, with no crypto.

const APPLE_RELAY_DOMAIN = "@privaterelay.appleid.com";

export interface ProviderConfig {
  issuer: string | string[];
  audience: string | string[];
  /** A jose key resolver, a remote JWKS URL, or a set of JWKs to build a local set from. */
  jwks: JWTVerifyGetKey | string | JWK[];
}

export interface ProviderVerifierConfig {
  apple: ProviderConfig;
  google: ProviderConfig;
}

function keyResolver(jwks: ProviderConfig["jwks"]): JWTVerifyGetKey {
  if (typeof jwks === "string") return createRemoteJWKSet(new URL(jwks));
  if (Array.isArray(jwks)) return createLocalJWKSet({ keys: jwks });
  return jwks;
}

export function createProviderVerifier(config: ProviderVerifierConfig): CredentialVerifier {
  const resolvers: Record<"apple" | "google", JWTVerifyGetKey> = {
    apple: keyResolver(config.apple.jwks),
    google: keyResolver(config.google.jwks),
  };

  async function verifyIdToken(provider: "apple" | "google", credential: string): Promise<VerifiedIdentity> {
    const cfg = config[provider];
    // Fail closed when this provider has no configured audience, rather than
    // letting an empty audience silently weaken the check.
    const audiences = Array.isArray(cfg.audience) ? cfg.audience : [cfg.audience];
    if (audiences.filter((a) => a && a.length > 0).length === 0) {
      throw ApiError.unauthorized("provider_not_configured");
    }
    let payload;
    try {
      ({ payload } = await jwtVerify(credential, resolvers[provider], {
        issuer: cfg.issuer,
        audience: cfg.audience,
      }));
    } catch {
      // Never reveal why (bad signature, wrong aud, expired) — a single opaque 401.
      throw ApiError.unauthorized("credential_invalid");
    }
    if (typeof payload.sub !== "string" || payload.sub.length === 0) {
      throw ApiError.unauthorized("credential_invalid");
    }
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
    const emailIsPrivateRelay =
      provider === "apple" &&
      (payload.is_private_email === true ||
        payload.is_private_email === "true" ||
        (email?.endsWith(APPLE_RELAY_DOMAIN) ?? false));
    const emailVerified = payload.email_verified === true || payload.email_verified === "true";
    return { provider, subject: payload.sub, email, emailIsPrivateRelay, emailVerified };
  }

  return {
    async verify(provider: Provider, credential: string): Promise<VerifiedIdentity> {
      if (provider === "email") {
        const email = credential.trim().toLowerCase();
        if (email.length === 0) throw ApiError.unauthorized("credential_invalid");
        return { provider: "email", subject: email, email, emailIsPrivateRelay: false, emailVerified: true };
      }
      return verifyIdToken(provider, credential);
    },
  };
}
