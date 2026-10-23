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

## What you must wire to go live (needs DB + secrets; cannot run in CI sandbox)

1. **Env secret** `MOBILE_JWT_SECRET` (≥32 bytes) for access-token signing. Set it
   as an environment secret, never in the repo.
2. **Prisma models** (additive migration, reviewed before applying — see the
   proposed schema in `docs/mobile-schema.prisma` of the app repo / below):
   - `MobileSession { id, accountId, deviceId, currentHash, issuedAt, consumedHashes String[], revoked, createdAt, updatedAt }`
   - `MobileIdempotency { ownerId, operation, clientId, payloadHash, state, resourceId?, response?, completedAt?, @@id([ownerId, operation, clientId]) }`
   - Reuse the existing `User`/`Account` tables for identity resolution.
3. **Port implementations** under `lib/mobile/`:
   - `CredentialVerifier`: verify Apple/Google identity JWTs against their JWKS
     (jose `createRemoteJWKSet`), and treat a pre-verified email OTP as `email`.
   - `IdentityResolver`: upsert `User` + `Account` by `(provider, providerAccountId)`;
     never match by email alone; never equate Apple private-relay to a Google email.
   - `SessionStore`: back `MobileSession` with Prisma.
4. **Route handlers** (App Router), each: parse with the zod schema (422 on fail),
   call the service, map `ApiError.status`/`toBody()` to the response:
   - `POST /api/v1/auth/exchange` → `exchange()`
   - `POST /api/v1/auth/refresh` → `refresh()`
   - `POST /api/v1/auth/email/request` and `/verify` → email OTP then exchange
   - `POST /api/v1/account/delete` → revoke sessions + `DeviceToken`, and for Apple
     call the token-revocation endpoint (Guideline 5.1.1)
5. **Account deletion & Apple token revocation**, **DeviceToken** storage, and the
   **product/lot migration** (see `docs/c03-contract.md`) are the remaining gated work.

The web homepage, existing NextAuth routes, admin, and the current schema are
untouched by this slice.
