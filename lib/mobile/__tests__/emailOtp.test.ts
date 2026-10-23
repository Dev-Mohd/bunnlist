import { describe, it, expect } from "vitest";
import {
  generateCode,
  hashCode,
  evaluateOtp,
  canSend,
  OTP_TTL_MS,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_MS,
  type OtpRecord,
} from "../emailOtp";

const t0 = 1_800_000_000_000;
const email = "user@example.com";

function record(partial: Partial<OtpRecord> = {}): OtpRecord {
  return {
    email,
    codeHash: hashCode(email, "123456"),
    expiresAt: t0 + OTP_TTL_MS,
    attempts: 0,
    lastSentAt: t0,
    ...partial,
  };
}

describe("generateCode", () => {
  it("produces a 6-digit numeric code", () => {
    for (let i = 0; i < 50; i++) expect(generateCode()).toMatch(/^[0-9]{6}$/);
  });
});

describe("hashCode", () => {
  it("binds the code to the email and hides the plaintext", () => {
    const h = hashCode(email, "123456");
    expect(h).not.toContain("123456");
    expect(h).toBe(hashCode(email, "123456"));
    expect(h).not.toBe(hashCode("other@example.com", "123456"));
  });
});

describe("evaluateOtp", () => {
  it("accepts the right code before expiry", () => {
    expect(evaluateOtp(record(), email, "123456", t0 + 1000)).toBe("ok");
  });

  it("reports no record", () => {
    expect(evaluateOtp(undefined, email, "123456", t0)).toBe("noRecord");
  });

  it("reports an expired code", () => {
    expect(evaluateOtp(record(), email, "123456", t0 + OTP_TTL_MS + 1)).toBe("expired");
  });

  it("reports a mismatch for the wrong code", () => {
    expect(evaluateOtp(record(), email, "000000", t0 + 1000)).toBe("mismatch");
  });

  it("reports too many attempts before checking the code", () => {
    expect(evaluateOtp(record({ attempts: MAX_ATTEMPTS }), email, "123456", t0 + 1000)).toBe("tooManyAttempts");
  });

  it("does not accept a code from a different email's hash", () => {
    const rec = record({ codeHash: hashCode("someone@else.com", "123456") });
    expect(evaluateOtp(rec, email, "123456", t0 + 1000)).toBe("mismatch");
  });
});

describe("canSend (resend cooldown)", () => {
  it("allows a first send", () => {
    expect(canSend(undefined, t0)).toBe(true);
  });

  it("blocks a resend inside the cooldown window", () => {
    expect(canSend(record({ lastSentAt: t0 }), t0 + RESEND_COOLDOWN_MS - 1)).toBe(false);
  });

  it("allows a resend after the cooldown", () => {
    expect(canSend(record({ lastSentAt: t0 }), t0 + RESEND_COOLDOWN_MS + 1)).toBe(true);
  });
});
