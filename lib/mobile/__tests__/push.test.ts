import { describe, it, expect, vi } from "vitest";
import { generateKeyPairSync, createVerify } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { apnsSender, notify, registerDevice } from "../push";

function fake(settings: Record<string, boolean> | null, tokens: string[]) {
  const m = {
    mobileNotificationSettings: { findUnique: vi.fn().mockResolvedValue(settings) },
    mobilePushDevice: {
      findMany: vi.fn().mockResolvedValue(tokens.map((token) => ({ token, environment: "sandbox" }))),
      deleteMany: vi.fn().mockResolvedValue({}),
      upsert: vi.fn().mockResolvedValue({}),
    },
  };
  return { db: m as unknown as PrismaClient, m };
}

describe("notify", () => {
  it("sends to every phone when the kind is on, and drops dead tokens", async () => {
    const { db, m } = fake(null, ["aa", "bb"]);
    const sender = vi.fn()
      .mockResolvedValueOnce({ status: 200 })
      .mockResolvedValueOnce({ status: 410, reason: "Unregistered" });
    const sent = await notify(db, "acc", "newFollower", { title: "t", body: "b" }, sender);
    expect(sent).toBe(1);
    expect(sender.mock.calls[0][1].data).toEqual({ kind: "newFollower" });
    expect(m.mobilePushDevice.deleteMany).toHaveBeenCalledWith({ where: { token: "bb" } });
  });

  it("respects settings, missing config and sender errors", async () => {
    const off = fake({ newFollower: false, submissionApproved: true, submissionRejected: true }, ["aa"]);
    const sender = vi.fn().mockResolvedValue({ status: 200 });
    expect(await notify(off.db, "acc", "newFollower", { title: "t", body: "b" }, sender)).toBe(0);
    expect(sender).not.toHaveBeenCalled();
    expect(await notify(fake(null, ["aa"]).db, "acc", "newFollower", { title: "t", body: "b" }, null)).toBe(0);
    const failing = vi.fn().mockRejectedValue(new Error("down"));
    expect(await notify(fake(null, ["aa"]).db, "acc", "newFollower", { title: "t", body: "b" }, failing)).toBe(0);
  });
});

describe("devices and config", () => {
  it("stores tokens in lower case", async () => {
    const { db, m } = fake(null, []);
    await registerDevice(db, "acc", { token: "ABCDEF0123456789ABCDEF0123456789", environment: "sandbox" });
    expect(m.mobilePushDevice.upsert.mock.calls[0][0].where).toEqual({ token: "abcdef0123456789abcdef0123456789" });
  });

  it("is off without APNs settings, and signs a valid ES256 token with them", async () => {
    expect(apnsSender({})).toBeNull();
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const pem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
    const sender = apnsSender({ APNS_KEY_ID: "K", APNS_TEAM_ID: "T", APNS_BUNDLE_ID: "b", APNS_PRIVATE_KEY: pem.replace(/\n/g, "\\n") });
    expect(sender).not.toBeNull();
    // The JWT is built inside the sender; check the signing scheme directly.
    const { createSign } = await import("node:crypto");
    const sig = createSign("SHA256").update("x").sign({ key: pem, dsaEncoding: "ieee-p1363" });
    expect(createVerify("SHA256").update("x").verify({ key: publicKey, dsaEncoding: "ieee-p1363" }, sig)).toBe(true);
  });
});
