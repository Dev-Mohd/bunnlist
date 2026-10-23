import { describe, it, expect } from "vitest";
import { requestOtp, verifyOtp, type OtpStore, type Mailer, type EmailDeps } from "../emailService";
import { hashCode, type OtpRecord, MAX_ATTEMPTS, RESEND_COOLDOWN_MS } from "../emailOtp";
import type { AuthDeps, StoredSession, VerifiedIdentity } from "../ports";
import { ApiError } from "../errors";

const t0 = 1_800_000_000_000;
const email = "User@Example.com";
const normalized = "user@example.com";

function fakeOtpStore() {
  const map = new Map<string, OtpRecord>();
  const store: OtpStore = {
    async get(e) { return map.get(e); },
    async upsert(r) { map.set(r.email, r); },
    async incrementAttempts(e) { const r = map.get(e); if (r) map.set(e, { ...r, attempts: r.attempts + 1 }); },
    async delete(e) { map.delete(e); },
  };
  return { store, map };
}

function fakeMailer() {
  const sent: Array<{ email: string; code: string }> = [];
  const mailer: Mailer = { async sendOtp(e, c) { sent.push({ email: e, code: c }); } };
  return { mailer, sent };
}

function fakeAuth(): AuthDeps {
  const sessions = new Map<string, StoredSession>();
  let n = 0;
  return {
    verifier: { async verify(provider, credential): Promise<VerifiedIdentity> {
      return { provider, subject: credential, email: credential, emailIsPrivateRelay: false };
    } },
    resolver: { async resolve() { return { accountId: "acct-1", isNew: true }; } },
    sessions: {
      async create(s) { sessions.set(s.sessionId, s); },
      async get(id) { return sessions.get(id); },
      async save(s) { sessions.set(s.sessionId, s); },
    },
    accessSecret: "test-secret-at-least-32-bytes-long-string",
    newId: () => `sess-${++n}`,
    newSecret: () => `secret-${n}`,
  };
}

function deps(makeCode = () => "123456"): { d: EmailDeps; sent: Array<{ email: string; code: string }>; map: Map<string, OtpRecord> } {
  const { store, map } = fakeOtpStore();
  const { mailer, sent } = fakeMailer();
  return { d: { otp: store, mailer, auth: fakeAuth(), makeCode }, sent, map };
}

describe("requestOtp", () => {
  it("stores a hashed code and mails the plaintext (normalized email)", async () => {
    const { d, sent, map } = deps();
    await requestOtp(email, d, t0);
    expect(sent).toEqual([{ email: normalized, code: "123456" }]);
    const rec = map.get(normalized)!;
    expect(rec.codeHash).toBe(hashCode(normalized, "123456"));
    expect(rec.codeHash).not.toContain("123456");
    expect(rec.attempts).toBe(0);
  });

  it("does not resend inside the cooldown window", async () => {
    const { d, sent } = deps();
    await requestOtp(email, d, t0);
    await requestOtp(email, d, t0 + RESEND_COOLDOWN_MS - 1);
    expect(sent).toHaveLength(1);
  });

  it("resends after the cooldown", async () => {
    const { d, sent } = deps();
    await requestOtp(email, d, t0);
    await requestOtp(email, d, t0 + RESEND_COOLDOWN_MS + 1);
    expect(sent).toHaveLength(2);
  });
});

describe("verifyOtp", () => {
  it("issues tokens for the right code and consumes the record", async () => {
    const { d, map } = deps();
    await requestOtp(email, d, t0);
    const tokens = await verifyOtp({ email, code: "123456", deviceId: "dev-1" }, d, t0 + 1000);
    expect(tokens.accountId).toBe("acct-1");
    expect(tokens.accessToken).toBeTypeOf("string");
    expect(tokens.refreshToken).toBeTypeOf("string");
    expect(map.get(normalized)).toBeUndefined(); // consumed
  });

  it("rejects a wrong code and counts the attempt", async () => {
    const { d, map } = deps();
    await requestOtp(email, d, t0);
    await expect(verifyOtp({ email, code: "000000", deviceId: "dev-1" }, d, t0 + 1000)).rejects.toBeInstanceOf(ApiError);
    expect(map.get(normalized)!.attempts).toBe(1);
  });

  it("rate-limits after too many attempts", async () => {
    const { d, map } = deps();
    await requestOtp(email, d, t0);
    map.set(normalized, { ...map.get(normalized)!, attempts: MAX_ATTEMPTS });
    try {
      await verifyOtp({ email, code: "123456", deviceId: "dev-1" }, d, t0 + 1000);
      expect.unreachable();
    } catch (e) {
      expect((e as ApiError).status).toBe(429);
    }
  });

  it("rejects an unknown email without revealing it was never requested", async () => {
    const { d } = deps();
    try {
      await verifyOtp({ email: "nobody@example.com", code: "123456", deviceId: "dev-1" }, d, t0);
      expect.unreachable();
    } catch (e) {
      expect((e as ApiError).status).toBe(401);
      expect((e as ApiError).reason).toBe("code_invalid");
    }
  });
});
