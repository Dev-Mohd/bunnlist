# Mobile auth (C03) — server slice

Tokens and auth logic for the BunnList **iOS app**, kept separate from the
website's NextAuth web sessions. Mirrors the iOS `BunnListCore` contract
(`docs/c03-contract.md` in the app repo): identities resolve by
`(provider, subject)` only, refresh tokens rotate with reuse detection, and the
error codes are 401/403/409/422/429.

## What is here (pure, tested — `npm run test:mobile`)

| File | Role |
|---|---|
| `errors.ts` | `ApiError` + status mapping (401/403/409/422/429) |
| `tokens.ts` | refresh hashing, rotation + reuse detection, access JWT sign/verify (HS256) |
| `idempotency.ts` | pure begin-outcome decision (replay / inProgress / conflict / deleted) |
| `schemas.ts` | zod request/response schemas for the v1 endpoints |
| `ports.ts` | interfaces for storage and provider verification |
| `authService.ts` | `exchange` and `refresh` composed over the ports |

26 vitest tests cover rotation, reuse-revocation, expiry, access-token
round-trip/tamper, idempotency, schema validation, and the end-to-end
exchange→refresh→reuse flow with in-memory fakes. No database or network is
touched here.

## Wired and live (Apple + Google)

| File | Role |
|---|---|
| `verifier.ts` | `CredentialVerifier` — verifies Apple/Google ID tokens (RS256) against each provider's JWKS, checks issuer + audience, flags Apple private-relay; a pre-verified email becomes an `email` identity with no crypto |
| `resolver.ts` | `IdentityResolver` — resolves/creates an account by `(provider, subject)` only via the existing `User`/`Account` tables; never merges by email, never writes a relay address |
| `sessionStore.ts` | `SessionStore` — backs `MobileSession` with Prisma (pure row↔family mappers are unit-tested) |
| `deps.ts` | assembles the real `AuthDeps` from env + Prisma per request |
| `respond.ts` | route plumbing: JSON parse, zod → 422, `ApiError` → status, opaque 500 |

Also wired: `emailOtp.ts`/`emailService.ts`/`otpStore.ts`/`mailer.ts` (email login),
and `authGuard.ts`/`accountService.ts`/`accountStore.ts`/`appleRevoke.ts` (account deletion).

Routes (App Router, Node runtime) — all **live**:
- `POST /api/v1/auth/exchange` → `exchange()` (Apple/Google)
- `POST /api/v1/auth/refresh` → `refresh()` (rotation + reuse revocation)
- `POST /api/v1/auth/email/request` → neutral OTP send
- `POST /api/v1/auth/email/verify` → verify code, then issue tokens
- `POST /api/v1/account/delete` → authenticated; purge data + best-effort Apple revoke

### Required environment variables
Set these as environment secrets (never in the repo):
- `MOBILE_JWT_SECRET` — ≥32 chars, signs the access tokens. **Required by every endpoint.** ✅ set
- `RESEND_API_KEY` — enables the email OTP mailer. ✅ set (sends from `onboarding@resend.dev` until a domain is verified)
- `MOBILE_MAIL_FROM` — optional, overrides the default from-address once a domain is verified.
- `MOBILE_APPLE_AUDIENCE` — the iOS app's Apple client id / bundle id (comma-separate to allow several). Required only for Apple exchange; an unset provider fails closed with `provider_not_configured`.
- `MOBILE_GOOGLE_AUDIENCE` — the iOS OAuth client id. Required only for Google exchange.
- `APPLE_TEAM_ID` / `APPLE_KEY_ID` / `APPLE_PRIVATE_KEY` — enable real Apple token revocation on delete. Until set, deletion still purges all data and skips the revoke call.

## Still to wire (later phases)

1. **Apple/Google go-live** — set the audiences (needs the iOS app's identifiers from an
   Apple Developer account + Google Cloud OAuth client). For Apple token revocation on delete,
   also capture the Apple auth code and store its refresh token.
2. **DeviceToken** storage (push) and the **product/lot read API** for the app
   (see `docs/c03-contract.md`).

The web homepage, existing NextAuth routes, admin, and the current schema remain
untouched by this slice.
