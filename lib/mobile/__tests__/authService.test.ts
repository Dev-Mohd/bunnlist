import { describe, it, expect } from "vitest";
import { exchange, refresh } from "../authService";
import { verifyAccessToken, ReuseDetectedError } from "../tokens";
import type { AuthDeps, StoredSession, VerifiedIdentity } from "../ports";
import { ApiError } from "../errors";

// In-memory fakes for the ports, so the whole flow runs without a DB or network.
function makeDeps(): AuthDeps & { sessionsMap: Map<string, StoredSession> } {
  const sessionsMap = new Map<string, StoredSession>();
  let n = 0;
  const accounts = new Map<string, string>(); // (provider:subject) -> accountId
  return {
    sessionsMap,
    accessSecret: "test-secret-value-at-least-32-bytes-long",
    newId: () => `sess-${++n}`,
    newSecret: () => `secret-${++n}`,
    verifier: {
      async verify(provider, credential): Promise<VerifiedIdentity> {
        if (!credential) throw ApiError.unauthorized();
        // Fake: the credential IS the subject for tests.
        return { provider, subject: credential, email: null, emailIsPrivateRelay: false };
      },
    },
    resolver: {
      async resolve(identity) {
        const key = `${identity.provider}:${identity.subject}`;
        const existing = accounts.get(key);
        if (existing) return { accountId: existing, isNew: false };
        const accountId = `acct-${accounts.size + 1}`;
        accounts.set(key, accountId);
        return { accountId, isNew: true };
      },
    },
    sessions: {
      async create(s) { sessionsMap.set(s.sessionId, s); },
      async get(id) { return sessionsMap.get(id); },
      async save(s) { sessionsMap.set(s.sessionId, s); },
    },
  };
}

const t0 = 1_800_000_000_000;

describe("mobile auth service", () => {
  it("exchanges a credential for tokens and signs a valid access token", async () => {
    const deps = makeDeps();
    const res = await exchange({ provider: "apple", credential: "apple-sub-1", deviceId: "dev-1" }, deps, t0);
    expect(res.isNewAccount).toBe(true);
    const claims = await verifyAccessToken(res.accessToken, deps.accessSecret);
    expect(claims.sub).toBe(res.accountId);
    expect(res.refreshToken.startsWith("sess-1.")).toBe(true);
  });

  it("resolves the same identity to the same account on a second exchange", async () => {
    const deps = makeDeps();
    const a = await exchange({ provider: "google", credential: "g-1", deviceId: "d" }, deps, t0);
    const b = await exchange({ provider: "google", credential: "g-1", deviceId: "d" }, deps, t0 + 1000);
    expect(a.accountId).toBe(b.accountId);
    expect(b.isNewAccount).toBe(false);
  });

  it("rotates the refresh token and keeps the session", async () => {
    const deps = makeDeps();
    const first = await exchange({ provider: "apple", credential: "s1", deviceId: "d" }, deps, t0);
    const rotated = await refresh(first.refreshToken, deps, t0 + 1000);
    expect(rotated.refreshToken).not.toBe(first.refreshToken);
    expect(rotated.accountId).toBe(first.accountId);
    // the new token rotates again; the old one is now reuse
    const rotated2 = await refresh(rotated.refreshToken, deps, t0 + 2000);
    expect(rotated2.refreshToken).not.toBe(rotated.refreshToken);
  });

  it("revokes the session when an old refresh token is reused", async () => {
    const deps = makeDeps();
    const first = await exchange({ provider: "apple", credential: "s1", deviceId: "d" }, deps, t0);
    const rotated = await refresh(first.refreshToken, deps, t0 + 1000);
    await refresh(rotated.refreshToken, deps, t0 + 2000);
    // reuse the original token
    await expect(refresh(first.refreshToken, deps, t0 + 3000)).rejects.toBeInstanceOf(ReuseDetectedError);
    // the whole family is now revoked: even the latest valid token is dead
    await expect(refresh(rotated.refreshToken, deps, t0 + 4000)).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects an unknown refresh token", async () => {
    const deps = makeDeps();
    await expect(refresh("sess-999.whatever", deps, t0)).rejects.toBeInstanceOf(ApiError);
  });
});
