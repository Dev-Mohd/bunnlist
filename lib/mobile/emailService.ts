import { exchange } from "./authService";
import { ApiError } from "./errors";
import {
  canSend,
  codeMatches,
  generateCode,
  hashCode,
  MAX_ATTEMPTS,
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
  /**
   * Atomically spends one attempt on the code `codeHash` for `email`, only while
   * fewer than `max` were spent. False when the cap is reached or the code changed.
   * Must be a single conditional write so parallel guesses can't all pass a check.
   */
  claimAttempt(email: string, codeHash: string, max: number): Promise<boolean>;
  /** Atomically removes the code `codeHash` for `email`; true for exactly one caller. */
  consume(email: string, codeHash: string): Promise<boolean>;
}

export interface Mailer {
  sendOtp(email: string, code: string): Promise<void>;
}

/** Caps wrong codes per email across every code sent to it (a new code resets per-code attempts). */
export interface OtpFailureLimiter {
  tooMany(email: string): Promise<boolean>;
  recordFailure(email: string): Promise<void>;
}

export interface EmailDeps {
  otp: OtpStore;
  mailer: Mailer;
  auth: AuthDeps;
  makeCode?: () => string;
  failures?: OtpFailureLimiter;
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
  if (deps.failures && (await deps.failures.tooMany(email))) throw ApiError.rateLimited("too_many_attempts");
  const record = await deps.otp.get(email);
  if (!record) throw ApiError.unauthorized("code_invalid");
  if (now > record.expiresAt) throw ApiError.unauthorized("code_expired");
  // Spend the attempt before judging the code, in one conditional write, so a burst
  // of parallel guesses gets at most MAX_ATTEMPTS evaluations per code.
  if (!(await deps.otp.claimAttempt(email, record.codeHash, MAX_ATTEMPTS))) throw ApiError.rateLimited("too_many_attempts");
  if (!codeMatches(record, email, input.code)) {
    await deps.failures?.recordFailure(email);
    throw ApiError.unauthorized("code_invalid");
  }
  // Only the request that actually removes the code may log in with it.
  if (!(await deps.otp.consume(email, record.codeHash))) throw ApiError.unauthorized("code_invalid");
  return exchange({ provider: "email", credential: email, deviceId: input.deviceId }, deps.auth, now);
}
