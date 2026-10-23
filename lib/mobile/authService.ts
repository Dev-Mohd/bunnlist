import { createRefreshFamily, rotateRefresh, signAccessToken, ACCESS_TTL_SEC, ReuseDetectedError } from "./tokens";
import type { AuthDeps } from "./ports";
import type { TokenResponse } from "./schemas";

// Orchestrates exchange and refresh using the ports. Pure of Next/Prisma so it
// runs under vitest with in-memory fakes; the route layer supplies real ports.
//
// The wire refresh token is `${sessionId}.${secret}` so a refresh request can
// locate its session without the server ever storing the plaintext (only its hash).

function wireToken(sessionId: string, secret: string): string {
  return `${sessionId}.${secret}`;
}

export async function exchange(
  input: { provider: "apple" | "google" | "email"; credential: string; deviceId: string },
  deps: AuthDeps,
  now: number,
): Promise<TokenResponse> {
  const identity = await deps.verifier.verify(input.provider, input.credential);
  const { accountId, isNew } = await deps.resolver.resolve(identity);

  const sessionId = deps.newId();
  const token = wireToken(sessionId, deps.newSecret());
  const family = createRefreshFamily(token, now);
  await deps.sessions.create({ sessionId, accountId, deviceId: input.deviceId, family });

  const accessToken = await signAccessToken({ accountId, sessionId }, deps.accessSecret, now);
  return {
    accessToken,
    refreshToken: token,
    accessExpiresInSeconds: ACCESS_TTL_SEC,
    accountId,
    isNewAccount: isNew,
  };
}

export async function refresh(refreshToken: string, deps: AuthDeps, now: number): Promise<TokenResponse> {
  const sessionId = refreshToken.split(".")[0];
  const session = sessionId ? await deps.sessions.get(sessionId) : undefined;
  if (!session) {
    // Unknown session: do not reveal which part was wrong.
    throw (await import("./errors")).ApiError.unauthorized("refresh_unknown");
  }

  try {
    const result = rotateRefresh(session.family, refreshToken, now, () => wireToken(sessionId!, deps.newSecret()));
    await deps.sessions.save({ ...session, family: result.state });
    const accessToken = await signAccessToken({ accountId: session.accountId, sessionId: session.sessionId }, deps.accessSecret, now);
    return {
      accessToken,
      refreshToken: result.newToken,
      accessExpiresInSeconds: ACCESS_TTL_SEC,
      accountId: session.accountId,
    };
  } catch (err) {
    // Reuse revokes the family; persist the revocation before surfacing the error.
    if (err instanceof ReuseDetectedError) {
      await deps.sessions.save({ ...session, family: err.revokedState });
    }
    throw err;
  }
}
