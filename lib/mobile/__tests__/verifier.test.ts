import { describe, it, expect, beforeAll } from "vitest";
import { SignJWT, generateKeyPair, exportJWK, type JWK, type KeyLike } from "jose";
import { createProviderVerifier } from "../verifier";
import { ApiError } from "../errors";

// We sign tokens locally with an RS256 keypair and hand the verifier the matching
// public key as its "JWKS", so the crypto path is exercised without any network.

const APPLE_ISS = "https://appleid.apple.com";
const GOOGLE_ISS = "https://accounts.google.com";
const APPLE_AUD = "com.bunnlist.app";
const GOOGLE_AUD = "123-abc.apps.googleusercontent.com";

let privateKey: KeyLike;
let publicJwk: JWK;

function makeVerifier() {
  return createProviderVerifier({
    apple: { issuer: APPLE_ISS, audience: APPLE_AUD, jwks: [publicJwk] },
    google: { issuer: GOOGLE_ISS, audience: GOOGLE_AUD, jwks: [publicJwk] },
  });
}

async function sign(claims: Record<string, unknown>, iss: string, aud: string) {
  return new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256" })
    .setIssuer(iss)
    .setAudience(aud)
    .setSubject(String(claims.sub ?? "subject-1"))
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(privateKey);
}

beforeAll(async () => {
  const kp = await generateKeyPair("RS256");
  privateKey = kp.privateKey;
  publicJwk = { ...(await exportJWK(kp.publicKey)), alg: "RS256", use: "sig" };
});

describe("provider credential verifier", () => {
  it("verifies a valid Google identity token", async () => {
    const jwt = await sign({ sub: "google-user-1", email: "a@b.com", email_verified: true }, GOOGLE_ISS, GOOGLE_AUD);
    const id = await makeVerifier().verify("google", jwt);
    expect(id).toEqual({ provider: "google", subject: "google-user-1", email: "a@b.com", emailIsPrivateRelay: false });
  });

  it("verifies a valid Apple identity token and flags private relay", async () => {
    const jwt = await sign(
      { sub: "apple-user-1", email: "xyz@privaterelay.appleid.com", is_private_email: "true" },
      APPLE_ISS,
      APPLE_AUD,
    );
    const id = await makeVerifier().verify("apple", jwt);
    expect(id.provider).toBe("apple");
    expect(id.subject).toBe("apple-user-1");
    expect(id.emailIsPrivateRelay).toBe(true);
  });

  it("rejects a token with the wrong audience", async () => {
    const jwt = await sign({ sub: "u" }, GOOGLE_ISS, "someone-elses-client-id");
    await expect(makeVerifier().verify("google", jwt)).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects an Apple token presented as Google (issuer mismatch)", async () => {
    const jwt = await sign({ sub: "u" }, APPLE_ISS, APPLE_AUD);
    await expect(makeVerifier().verify("google", jwt)).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects a malformed credential", async () => {
    await expect(makeVerifier().verify("apple", "not-a-jwt")).rejects.toBeInstanceOf(ApiError);
  });

  it("treats a pre-verified email as an email identity without crypto", async () => {
    const id = await makeVerifier().verify("email", "User@Example.com");
    expect(id).toEqual({ provider: "email", subject: "user@example.com", email: "user@example.com", emailIsPrivateRelay: false });
  });

  it("does not equate an Apple relay subject with a Google email identity", async () => {
    const appleJwt = await sign({ sub: "shared-looking", email: "relay@privaterelay.appleid.com" }, APPLE_ISS, APPLE_AUD);
    const googleJwt = await sign({ sub: "shared-looking", email: "real@gmail.com" }, GOOGLE_ISS, GOOGLE_AUD);
    const a = await makeVerifier().verify("apple", appleJwt);
    const g = await makeVerifier().verify("google", googleJwt);
    // Same raw sub, but different providers → they must never collapse to one identity.
    expect(a.provider).not.toBe(g.provider);
  });
});
