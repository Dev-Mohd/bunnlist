import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify, type JWTPayload } from "jose";
import { ApiError } from "./errors";

// ---------------------------------------------------------------------------
// Refresh tokens: rotation with reuse detection. Mirrors BunnListCore
// RefreshTokenFamily. Tokens are stored hashed (SHA-256); the plaintext is
// returned once to the client and never persisted. Presenting an already
// consumed token is treated as theft and revokes the whole family.
// ---------------------------------------------------------------------------

export const REFRESH_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
export const ACCESS_TTL_SEC = 60 * 15; // 15 minutes
/** Two requests from one phone can refresh at once; the slower one presents the
 *  token the faster one just used. Within this window that's refused, not treated
 *  as theft (the family stays alive). */
export const REUSE_GRACE_MS = 60 * 1000;

export function hashToken(token: string): string {
  return "sha256:" + createHash("sha256").update(token).digest("hex");
}

export function newRefreshToken(): string {
  return randomBytes(32).toString("base64url");
}

/** The persisted state of one refresh-token family (a session). */
export interface RefreshFamilyState {
  currentHash: string;
  issuedAt: number; // epoch ms
  consumedHashes: string[];
  revoked: boolean;
}

export function createRefreshFamily(initialToken: string, now: number): RefreshFamilyState {
  return { currentHash: hashToken(initialToken), issuedAt: now, consumedHashes: [], revoked: false };
}

export interface RotationResult {
  state: RefreshFamilyState;
  newToken: string;
}

/**
 * Rotates the family given the presented refresh token. Returns the next state
 * and the new plaintext token. Throws ApiError on expiry/reuse/revocation; a
 * reuse revokes the family so the caller must persist `state` even on throw
 * when `revokedByReuse` is set.
 */
export function rotateRefresh(
  state: RefreshFamilyState,
  presentedToken: string,
  now: number,
  makeToken: () => string = newRefreshToken,
): RotationResult {
  if (state.revoked) throw ApiError.unauthorized("session_revoked");
  const presented = hashToken(presentedToken);

  if (constantTimeEqual(presented, state.currentHash)) {
    if (now - state.issuedAt > REFRESH_TTL_MS) throw ApiError.unauthorized("refresh_expired");
    const newToken = makeToken();
    const next: RefreshFamilyState = {
      currentHash: hashToken(newToken),
      issuedAt: now,
      consumedHashes: [...state.consumedHashes, state.currentHash],
      revoked: false,
    };
    return { state: next, newToken };
  }

  const previous = state.consumedHashes[state.consumedHashes.length - 1];
  if (previous && constantTimeEqual(presented, previous) && now - state.issuedAt <= REUSE_GRACE_MS) {
    throw ApiError.unauthorized("refresh_superseded");
  }

  if (state.consumedHashes.some((h) => constantTimeEqual(presented, h))) {
    // Reuse of a consumed token: revoke the family. The thrown error carries the
    // revoked state so the caller persists the revocation.
    const revoked: RefreshFamilyState = { ...state, revoked: true };
    throw new ReuseDetectedError(revoked);
  }
  throw ApiError.unauthorized("refresh_unknown");
}

/** Thrown on refresh-token reuse; carries the now-revoked family to persist. */
export class ReuseDetectedError extends ApiError {
  readonly revokedState: RefreshFamilyState;
  constructor(revokedState: RefreshFamilyState) {
    super("unauthorized", "refresh_reuse_detected");
    this.name = "ReuseDetectedError";
    this.revokedState = revokedState;
  }
}

// ---------------------------------------------------------------------------
// Access tokens: short-lived signed JWTs (HS256). The secret comes from the
// environment at the route layer; these helpers take it explicitly so they are
// pure and testable.
// ---------------------------------------------------------------------------

export interface AccessClaims extends JWTPayload {
  sub: string; // account id
  sid: string; // session (refresh family) id
}

export async function signAccessToken(
  claims: { accountId: string; sessionId: string },
  secret: string,
  now: number,
  ttlSec: number = ACCESS_TTL_SEC,
): Promise<string> {
  const key = new TextEncoder().encode(secret);
  return new SignJWT({ sid: claims.sessionId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.accountId)
    .setIssuedAt(Math.floor(now / 1000))
    .setExpirationTime(Math.floor(now / 1000) + ttlSec)
    .setIssuer("bunnlist")
    .sign(key);
}

export async function verifyAccessToken(token: string, secret: string): Promise<AccessClaims> {
  const key = new TextEncoder().encode(secret);
  try {
    const { payload } = await jwtVerify(token, key, { issuer: "bunnlist" });
    if (typeof payload.sub !== "string" || typeof payload.sid !== "string") {
      throw ApiError.unauthorized("access_malformed");
    }
    return payload as AccessClaims;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw ApiError.unauthorized("access_invalid");
  }
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}
