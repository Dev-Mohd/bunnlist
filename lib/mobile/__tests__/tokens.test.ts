import { describe, it, expect } from "vitest";
import {
  createRefreshFamily,
  rotateRefresh,
  ReuseDetectedError,
  hashToken,
  signAccessToken,
  verifyAccessToken,
  REFRESH_TTL_MS,
} from "../tokens";
import { ApiError } from "../errors";

const t0 = 1_800_000_000_000;

describe("refresh rotation", () => {
  it("issues a new token and consumes the presented one", () => {
    let fam = createRefreshFamily("t0", t0);
    const r1 = rotateRefresh(fam, "t0", t0 + 10, () => "t1");
    expect(r1.newToken).toBe("t1");
    expect(r1.state.currentHash).toBe(hashToken("t1"));
    expect(r1.state.consumedHashes).toContain(hashToken("t0"));
    // the new token rotates again
    const r2 = rotateRefresh(r1.state, "t1", t0 + 20, () => "t2");
    expect(r2.newToken).toBe("t2");
  });

  it("detects reuse of a consumed token and revokes the family", () => {
    const fam = createRefreshFamily("t0", t0);
    const r1 = rotateRefresh(fam, "t0", t0 + 10, () => "t1");
    rotateRefresh(r1.state, "t1", t0 + 20, () => "t2");
    // presenting the original (consumed) token again is reuse
    let caught: unknown;
    try {
      rotateRefresh(r1.state, "t0", t0 + 30, () => "tx");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ReuseDetectedError);
    expect((caught as ReuseDetectedError).revokedState.revoked).toBe(true);
    expect((caught as ReuseDetectedError).reason).toBe("refresh_reuse_detected");
  });

  it("rejects a revoked family", () => {
    const fam = { ...createRefreshFamily("t0", t0), revoked: true };
    expect(() => rotateRefresh(fam, "t0", t0 + 10)).toThrowError(/unauthorized/);
  });

  it("rejects an expired token", () => {
    const fam = createRefreshFamily("t0", t0);
    expect(() => rotateRefresh(fam, "t0", t0 + REFRESH_TTL_MS + 1)).toThrow(ApiError);
  });

  it("rejects an unknown token without revoking", () => {
    const fam = createRefreshFamily("t0", t0);
    expect(() => rotateRefresh(fam, "nope", t0 + 10)).toThrow(ApiError);
  });

  it("does not store the plaintext token", () => {
    const fam = createRefreshFamily("super-secret", t0);
    expect(JSON.stringify(fam)).not.toContain("super-secret");
  });
});

describe("access tokens", () => {
  const secret = "test-secret-at-least-32-bytes-long-string";

  it("round-trips a signed token", async () => {
    const jwt = await signAccessToken({ accountId: "acct-1", sessionId: "sess-1" }, secret, t0);
    const claims = await verifyAccessToken(jwt, secret);
    expect(claims.sub).toBe("acct-1");
    expect(claims.sid).toBe("sess-1");
  });

  it("rejects a token signed with another secret", async () => {
    const jwt = await signAccessToken({ accountId: "acct-1", sessionId: "sess-1" }, secret, t0);
    await expect(verifyAccessToken(jwt, "a-different-secret-value-32-bytes-xx")).rejects.toBeInstanceOf(ApiError);
  });

  it("rejects an expired token", async () => {
    const jwt = await signAccessToken({ accountId: "a", sessionId: "s" }, secret, t0, 1);
    // sign at t0 with 1s TTL; verify "now" is far later via a token issued in the past
    const past = await signAccessToken({ accountId: "a", sessionId: "s" }, secret, Date.now() - 10_000, 1);
    await expect(verifyAccessToken(past, secret)).rejects.toBeInstanceOf(ApiError);
    expect(jwt).toBeTypeOf("string");
  });
});
