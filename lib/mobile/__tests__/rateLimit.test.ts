import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { clientIp, hashKey, hit, LIMITS } from "../rateLimit";
import { verifyOtp, type EmailDeps } from "../emailService";

function db(count: number) {
  const m = { mobileRateEvent: { count: vi.fn().mockResolvedValue(count), create: vi.fn().mockResolvedValue({}), deleteMany: vi.fn().mockResolvedValue({}) } };
  return { db: m as unknown as PrismaClient, m };
}

describe("rate limits", () => {
  it("counts a use under the limit and refuses at it", async () => {
    const under = db(LIMITS.otpRequestIp.limit - 1);
    await hit(under.db, LIMITS.otpRequestIp, "1.2.3.4", "too_many_requests");
    expect(under.m.mobileRateEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ bucket: "otp_request_ip", key: hashKey("1.2.3.4") }) });
    const at = db(LIMITS.otpRequestIp.limit);
    await expect(hit(at.db, LIMITS.otpRequestIp, "1.2.3.4", "too_many_requests")).rejects.toMatchObject({ code: "rateLimited", reason: "too_many_requests" });
    expect(at.m.mobileRateEvent.create).not.toHaveBeenCalled();
  });

  it("never stores the raw key", () => {
    expect(hashKey("A@B.com")).toBe(hashKey(" a@b.com "));
    expect(hashKey("a@b.com")).not.toContain("a@b.com");
  });

  it("passes when there is no key", async () => {
    const { db: d, m } = db(999);
    await hit(d, LIMITS.advisorIp, null, "x");
    expect(m.mobileRateEvent.count).not.toHaveBeenCalled();
  });

  it("reads the first forwarded IP", () => {
    expect(clientIp(new Request("http://x", { headers: { "x-forwarded-for": "9.9.9.9, 10.0.0.1" } }))).toBe("9.9.9.9");
    expect(clientIp(new Request("http://x"))).toBeNull();
  });
});

describe("wrong codes across resends", () => {
  const base = (failures: EmailDeps["failures"]) => ({
    otp: { get: vi.fn().mockResolvedValue({ email: "a@b.com", codeHash: "sha256:x", expiresAt: Date.now() + 60000, attempts: 0, lastSentAt: 0 }), upsert: vi.fn(), claimAttempt: vi.fn().mockResolvedValue(true), consume: vi.fn().mockResolvedValue(true) },
    mailer: { sendOtp: vi.fn() },
    auth: {} as EmailDeps["auth"],
    failures,
  }) as unknown as EmailDeps;

  it("refuses once the email hit its daily cap, even with a fresh code", async () => {
    const deps = base({ tooMany: vi.fn().mockResolvedValue(true), recordFailure: vi.fn() });
    await expect(verifyOtp({ email: "a@b.com", code: "123456", deviceId: "d" }, deps, Date.now())).rejects.toMatchObject({ code: "rateLimited" });
    expect(deps.otp.get).not.toHaveBeenCalled();
  });

  it("records each wrong code", async () => {
    const recordFailure = vi.fn();
    const deps = base({ tooMany: vi.fn().mockResolvedValue(false), recordFailure });
    await expect(verifyOtp({ email: "A@b.com", code: "000000", deviceId: "d" }, deps, Date.now())).rejects.toMatchObject({ code: "unauthorized" });
    expect(recordFailure).toHaveBeenCalledWith("a@b.com");
  });
});
