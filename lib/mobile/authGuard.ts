import { ApiError } from "./errors";
import { verifyAccessToken } from "./tokens";

// Reads and verifies the caller's access token from the Authorization header.
// Used by authenticated mobile endpoints (e.g. account deletion). The token is a
// short-lived HS256 JWT whose subject is the account id.

export function extractBearer(header: string | null): string {
  if (!header) throw ApiError.unauthorized("missing_token");
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  const token = match?.[1]?.trim();
  if (!token) throw ApiError.unauthorized("missing_token");
  return token;
}

/** Verifies the bearer access token and returns the authenticated account id. */
export async function authenticate(req: Request, secret: string): Promise<string> {
  const token = extractBearer(req.headers.get("authorization"));
  const claims = await verifyAccessToken(token, secret);
  return claims.sub;
}
