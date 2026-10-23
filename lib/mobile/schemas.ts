import { z } from "zod";

// Request/response schemas for the mobile v1 auth endpoints. The client sends a
// provider-verified credential; the server never trusts a client-asserted
// account id. Identities resolve by (provider, subject) only.

export const AuthProvider = z.enum(["apple", "google", "email"]);
export type AuthProvider = z.infer<typeof AuthProvider>;

/** POST /api/v1/auth/exchange — trade a verified provider credential for tokens. */
export const ExchangeRequest = z.object({
  provider: AuthProvider,
  // Apple/Google identity token (JWT) or, for email, the one-time code already verified in a prior step.
  credential: z.string().min(1),
  // Opaque device id for binding a session; never a secret.
  deviceId: z.string().min(1).max(200),
});
export type ExchangeRequest = z.infer<typeof ExchangeRequest>;

/** POST /api/v1/auth/refresh — rotate the refresh token. */
export const RefreshRequest = z.object({
  refreshToken: z.string().min(1),
});
export type RefreshRequest = z.infer<typeof RefreshRequest>;

export const TokenResponse = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  accessExpiresInSeconds: z.number().int().positive(),
  accountId: z.string(),
  isNewAccount: z.boolean().optional(),
});
export type TokenResponse = z.infer<typeof TokenResponse>;

/** POST /api/v1/auth/email/request — begin email OTP (neutral response). */
export const EmailRequest = z.object({
  email: z.string().email(),
});
export type EmailRequest = z.infer<typeof EmailRequest>;

/** POST /api/v1/auth/email/verify — verify the code, then exchange. */
export const EmailVerifyRequest = z.object({
  email: z.string().email(),
  code: z.string().regex(/^[0-9]{6}$/),
  deviceId: z.string().min(1).max(200),
});
export type EmailVerifyRequest = z.infer<typeof EmailVerifyRequest>;

/** Parse a body with a schema, mapping any failure to a 422 the client contract expects. */
export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    throw Object.assign(new Error("unprocessable"), { apiErrorCode: "unprocessable" as const });
  }
  return result.data;
}
