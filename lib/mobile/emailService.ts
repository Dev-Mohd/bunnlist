import { exchange } from "./authService";
import { ApiError } from "./errors";
import {
  canSend,
  evaluateOtp,
  generateCode,
  hashCode,
  OTP_TTL_MS,
  type OtpRecord,
} from "./emailOtp";
import type { AuthDeps } from "./ports";
import type { TokenResponse } from "./schemas";

// Login-by-email, composed over ports so it runs under vitest with in-memory
// fakes. `requestOtp` is deliberately neutral — it never reveals whether an email
// exists or whether a mail was sent — and rate-limits resends. `verifyOtp` checks
// the code (attempt-limited) and, on success, issues tokens via the same
// `exchange` path used by Apple/Google, with the provider fixed to `email`.

export interface OtpStore {
  get(email: string): Promise<OtpRecord | undefined>;
  upsert(record: OtpRecord): Promise<void>;
  incrementAttempts(email: string): Promise<void>;
  delete(email: string): Promise<void>;
}

export interface Mailer {
  sendOtp(email: string, code: string): Promise<void>;
}

export interface EmailDeps {
  otp: OtpStore;
  mailer: Mailer;
  auth: AuthDeps;
  makeCode?: () => string;
}

function normalize(email: string): string {
  return email.trim().toLowerCase();
}

export async function requestOtp(email: string, deps: EmailDeps, now: number): Promise<void> {
  const normalized = normalize(email);
  const existing = await deps.otp.get(normalized);
  // Silently ignore resends inside the cooldown — no error, no second email.
  if (!canSend(existing, now)) return;

  const code = (deps.makeCode ?? generateCode)();
  await deps.otp.upsert({
    email: normalized,
    codeHash: hashCode(normalized, code),
    expiresAt: now + OTP_TTL_MS,
    attempts: 0,
    lastSentAt: now,
  });
  await deps.mailer.sendOtp(normalized, code);
}

export async function verifyOtp(
  input: { email: string; code: string; deviceId: string },
  deps: EmailDeps,
  now: number,
): Promise<TokenResponse> {
  const email = normalize(input.email);
  const record = await deps.otp.get(email);
  const outcome = evaluateOtp(record, email, input.code, now);

  switch (outcome) {
    case "ok":
      await deps.otp.delete(email);
      return exchange({ provider: "email", credential: email, deviceId: input.deviceId }, deps.auth, now);
    case "mismatch":
      await deps.otp.incrementAttempts(email);
      throw ApiError.unauthorized("code_invalid");
    case "tooManyAttempts":
      throw ApiError.rateLimited("too_many_attempts");
    case "expired":
      throw ApiError.unauthorized("code_expired");
    case "noRecord":
      throw ApiError.unauthorized("code_invalid");
  }
}
