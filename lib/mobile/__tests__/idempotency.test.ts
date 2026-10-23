import { describe, it, expect } from "vitest";
import { beginIdempotent, RESPONSE_CACHE_TTL_MS, type IdempotencyRecord } from "../idempotency";
import { ApiError } from "../errors";

const t0 = 1_800_000_000_000;

describe("beginIdempotent", () => {
  it("proceeds when there is no record", () => {
    expect(beginIdempotent(undefined, "h1", t0)).toEqual({ kind: "proceed" });
  });

  it("reports inProgress for a reserved-but-incomplete record", () => {
    const rec: IdempotencyRecord = { state: "reserved", payloadHash: "h1" };
    expect(beginIdempotent(rec, "h1", t0)).toEqual({ kind: "inProgress" });
  });

  it("replays a completed record within the cache window", () => {
    const rec: IdempotencyRecord = { state: "completed", payloadHash: "h1", resourceId: "r1", response: "body", completedAt: t0 };
    expect(beginIdempotent(rec, "h1", t0 + 1000)).toEqual({ kind: "replay", resourceId: "r1", response: "body" });
  });

  it("replays identity but drops the body after the cache TTL", () => {
    const rec: IdempotencyRecord = { state: "completed", payloadHash: "h1", resourceId: "r1", response: "body", completedAt: t0 };
    expect(beginIdempotent(rec, "h1", t0 + RESPONSE_CACHE_TTL_MS + 1)).toEqual({ kind: "replay", resourceId: "r1", response: null });
  });

  it("conflicts on the same key with a different payload", () => {
    const rec: IdempotencyRecord = { state: "completed", payloadHash: "h1", resourceId: "r1", response: "body", completedAt: t0 };
    expect(() => beginIdempotent(rec, "DIFFERENT", t0)).toThrow(ApiError);
    try { beginIdempotent(rec, "DIFFERENT", t0); } catch (e) { expect((e as ApiError).status).toBe(409); }
  });

  it("does not recreate a deleted resource", () => {
    const rec: IdempotencyRecord = { state: "deleted", payloadHash: "h1", resourceId: "r1" };
    expect(() => beginIdempotent(rec, "h1", t0)).toThrow(ApiError);
    try { beginIdempotent(rec, "h1", t0); } catch (e) { expect((e as ApiError).reason).toBe("resource_deleted"); }
  });
});
