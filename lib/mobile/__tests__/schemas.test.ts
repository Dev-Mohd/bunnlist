import { describe, it, expect } from "vitest";
import { ExchangeRequest, RefreshRequest, EmailVerifyRequest } from "../schemas";
import { ApiError, statusForCode } from "../errors";

describe("schemas", () => {
  it("accepts a valid exchange request", () => {
    const r = ExchangeRequest.safeParse({ provider: "apple", credential: "jwt...", deviceId: "device-1" });
    expect(r.success).toBe(true);
  });

  it("rejects an unknown provider", () => {
    const r = ExchangeRequest.safeParse({ provider: "facebook", credential: "x", deviceId: "d" });
    expect(r.success).toBe(false);
  });

  it("rejects a missing refresh token", () => {
    expect(RefreshRequest.safeParse({}).success).toBe(false);
  });

  it("requires a 6-digit numeric code", () => {
    expect(EmailVerifyRequest.safeParse({ email: "a@b.com", code: "12345", deviceId: "d" }).success).toBe(false);
    expect(EmailVerifyRequest.safeParse({ email: "a@b.com", code: "123456", deviceId: "d" }).success).toBe(true);
    expect(EmailVerifyRequest.safeParse({ email: "not-an-email", code: "123456", deviceId: "d" }).success).toBe(false);
  });
});

describe("error contract", () => {
  it("maps codes to the agreed HTTP statuses", () => {
    expect(statusForCode("unauthorized")).toBe(401);
    expect(statusForCode("forbidden")).toBe(403);
    expect(statusForCode("conflict")).toBe(409);
    expect(statusForCode("unprocessable")).toBe(422);
    expect(statusForCode("rateLimited")).toBe(429);
  });

  it("hides the reason unless explicitly set", () => {
    expect(ApiError.unauthorized().toBody()).toEqual({ error: "unauthorized" });
    expect(ApiError.conflict("payload_mismatch").toBody()).toEqual({ error: "conflict", reason: "payload_mismatch" });
  });
});
