import { createHash, randomInt, timingSafeEqual } from "node:crypto";

// Pure email-OTP logic for the mobile login-by-email flow. A 6-digit code is
// generated, hashed (bound to the email) and stored with an expiry; the plaintext
// is sent by email and never persisted. Verification is attempt-limited, and
// resends are rate-limited by a cooldown. Everything here is pure/deterministic
// (given `now` and the random source) so it is unit-testable without a DB or mail.

export const OTP_TTL_MS = 1000 * 60 * 10; // 10 minutes
export const MAX_ATTEMPTS = 5;
export const RESEND_COOLDOWN_MS = 1000 * 60; // 60 seconds

export interface OtpRecord {
  email: string;
  codeHash: string;
  expiresAt: number; // epoch ms
  attempts: number;
  lastSentAt: number; // epoch ms
}

export function generateCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export function hashCode(email: string, code: string): string {
  return "sha256:" + createHash("sha256").update(`${email.toLowerCase()}:${code}`).digest("hex");
}

export type OtpOutcome = "ok" | "noRecord" | "expired" | "mismatch" | "tooManyAttempts";

/**
 * Decides the result of presenting `code` for `email` against the stored record.
 * Pure: the caller persists the consequences (delete on ok, increment attempts on
 * mismatch) and maps the outcome to an HTTP error.
 */
export function evaluateOtp(
  record: OtpRecord | undefined,
  email: string,
  code: string,
  now: number,
): OtpOutcome {
  if (!record) return "noRecord";
  if (now > record.expiresAt) return "expired";
  if (record.attempts >= MAX_ATTEMPTS) return "tooManyAttempts";
  return constantTimeEqual(hashCode(email, code), record.codeHash) ? "ok" : "mismatch";
}

/** Whether a new code may be sent now, given the last send (resend cooldown). */
export function canSend(record: OtpRecord | undefined, now: number): boolean {
  if (!record) return true;
  return now - record.lastSentAt >= RESEND_COOLDOWN_MS;
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
