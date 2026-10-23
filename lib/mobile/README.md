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

Routes (App Router, Node runtime):
- `POST /api/v1/auth/exchange` → `exchange()` — **live**
- `POST /api/v1/auth/refresh` → `refresh()` — **live**

### Required environment variables
Set these as environment secrets (never in the repo):
- `MOBILE_JWT_SECRET` — ≥32 chars, signs the access tokens. **Required by every endpoint.**
- `MOBILE_APPLE_AUDIENCE` — the iOS app's Apple client id / bundle id (comma-separate to allow several). Required only for Apple exchange; an unset provider fails closed with `provider_not_configured`.
- `MOBILE_GOOGLE_AUDIENCE` — the iOS OAuth client id. Required only for Google exchange.

## Still to wire (next sub-steps)

1. **Email OTP** — `POST /api/v1/auth/email/request` + `/verify`. Needs a code store
   (own table) and a mailer (e.g. Resend); the verify step then calls `exchange()` with
   provider `email`. The schemas (`EmailRequest`, `EmailVerifyRequest`) are already defined and tested.
2. **Account deletion & Apple token revocation** — `POST /api/v1/account/delete`: revoke
   sessions + `DeviceToken`, and call Apple's token-revocation endpoint (Guideline 5.1.1).
3. **DeviceToken** storage and the **product/lot migration** (see `docs/c03-contract.md`).

The web homepage, existing NextAuth routes, admin, and the current schema remain
untouched by this slice.
