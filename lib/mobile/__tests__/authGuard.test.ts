import { describe, it, expect } from "vitest";
import { extractBearer, authenticate } from "../authGuard";
import { signAccessToken } from "../tokens";
import { ApiError } from "../errors";

const secret = "test-secret-at-least-32-bytes-long-string";
const t0 = 1_800_000_000_000;

describe("extractBearer", () => {
  it("returns the token from a Bearer header", () => {
    expect(extractBearer("Bearer abc.def.ghi")).toBe("abc.def.ghi");
  });

  it("is case-insensitive on the scheme", () => {
    expect(extractBearer("bearer xyz")).toBe("xyz");
  });

  it("rejects a missing header", () => {
    expect(() => extractBearer(null)).toThrow(ApiError);
  });

  it("rejects a non-Bearer scheme", () => {
    expect(() => extractBearer("Basic abc")).toThrow(ApiError);
  });

  it("rejects an empty token", () => {
    expect(() => extractBearer("Bearer   ")).toThrow(ApiError);
  });
});

describe("authenticate", () => {
  it("resolves the account id from a valid access token", async () => {
    const jwt = await signAccessToken({ accountId: "acct-9", sessionId: "sess-9" }, secret, t0 + Date.now());
    const req = new Request("https://x/api", { headers: { authorization: `Bearer ${jwt}` } });
    await expect(authenticate(req, secret)).resolves.toBe("acct-9");
  });

  it("rejects a tampered/invalid token with 401", async () => {
    const req = new Request("https://x/api", { headers: { authorization: "Bearer not.a.jwt" } });
    await expect(authenticate(req, secret)).rejects.toBeInstanceOf(ApiError);
  });
});
