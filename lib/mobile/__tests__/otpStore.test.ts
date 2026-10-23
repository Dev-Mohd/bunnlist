import { describe, it, expect } from "vitest";
import { rowToRecord, type MobileEmailOtpRow } from "../otpStore";

const t0 = 1_800_000_000_000;

describe("otp row mapping", () => {
  it("maps a DB row to a record with epoch-ms timestamps", () => {
    const row: MobileEmailOtpRow = {
      email: "user@example.com",
      codeHash: "sha256:abc",
      expiresAt: new Date(t0 + 1000),
      attempts: 2,
      lastSentAt: new Date(t0),
    };
    expect(rowToRecord(row)).toEqual({
      email: "user@example.com",
      codeHash: "sha256:abc",
      expiresAt: t0 + 1000,
      attempts: 2,
      lastSentAt: t0,
    });
  });
});
