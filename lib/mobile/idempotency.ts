import { ApiError } from "./errors";

// Server idempotency, mirroring BunnListCore.IdempotencyStore. The response body
// may be evicted after a TTL, but the creation identity (resourceId) is permanent,
// a different payload under the same key conflicts, and a deleted resource is
// never recreated by an old retry. This module is the pure decision function; the
// record itself is persisted by the route/DB layer.

export const RESPONSE_CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24h

export type IdempotencyRecord =
  | { state: "reserved"; payloadHash: string }
  | { state: "completed"; payloadHash: string; resourceId: string; response: string; completedAt: number }
  | { state: "deleted"; payloadHash: string; resourceId: string };

export type BeginOutcome =
  | { kind: "proceed" }
  | { kind: "inProgress" }
  | { kind: "replay"; resourceId: string; response: string | null };

/**
 * Decides what to do when an idempotent operation begins. `existing` is the
 * stored record for (owner, operation, clientId), or undefined if none.
 * Throws ApiError.conflict on a payload mismatch or a tombstoned creation.
 */
export function beginIdempotent(
  existing: IdempotencyRecord | undefined,
  payloadHash: string,
  now: number,
): BeginOutcome {
  if (!existing) return { kind: "proceed" };
  if (existing.payloadHash !== payloadHash) throw ApiError.conflict("payload_mismatch");

  switch (existing.state) {
    case "reserved":
      return { kind: "inProgress" };
    case "deleted":
      throw ApiError.conflict("resource_deleted");
    case "completed": {
      const fresh = now - existing.completedAt <= RESPONSE_CACHE_TTL_MS;
      return { kind: "replay", resourceId: existing.resourceId, response: fresh ? existing.response : null };
    }
  }
}
