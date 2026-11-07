import { describe, it, expect, vi } from "vitest";
import { generateKeyPairSync, createVerify, createPublicKey } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { apnsSender, DeviceRegistration, fcmAssertion, fcmSender, firstInWindow, notify, notifyOnce, NOTIFY_WINDOWS, pushSender, registerDevice } from "../push";

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

describe("android (fcm)", () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const account = { project_id: "proj", client_email: "svc@proj.iam.gserviceaccount.com", private_key: privateKey.export({ type: "pkcs8", format: "pem" }).toString() };
  const fcmToken = "dQw4w9WgXcQ:APA91bH-abc_DEF123" + "x".repeat(120);

  it("keeps fcm tokens as sent, and rejects malformed ones", async () => {
    const { db, m } = fake(null, []);
    await registerDevice(db, "acc", DeviceRegistration.parse({ token: fcmToken, environment: "fcm" }));
    expect(m.mobilePushDevice.upsert.mock.calls[0][0].where).toEqual({ token: fcmToken });
    expect(m.mobilePushDevice.upsert.mock.calls[0][0].create.environment).toBe("fcm");
    expect(DeviceRegistration.safeParse({ token: "has space", environment: "fcm" }).success).toBe(false);
    expect(DeviceRegistration.safeParse({ token: fcmToken, environment: "production" }).success).toBe(false);
  });

  it("is off without a service account, and sends through HTTP v1 with one", async () => {
    expect(fcmSender({})).toBeNull();
    expect(fcmSender({ FCM_SERVICE_ACCOUNT: "not json" })).toBeNull();
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: "AT", expires_in: 3600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response("{}", { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { status: "NOT_FOUND", details: [{ errorCode: "UNREGISTERED" }] } }), { status: 404 }));
    const sender = fcmSender({ FCM_SERVICE_ACCOUNT: JSON.stringify(account) }, fetcher as unknown as typeof fetch)!;
    expect(await sender({ token: fcmToken, environment: "fcm" }, { title: "t", body: "b", data: { kind: "newFollower" } })).toEqual({ status: 200 });
    const [url, init] = fetcher.mock.calls[1];
    expect(url).toBe("https://fcm.googleapis.com/v1/projects/proj/messages:send");
    expect(init.headers.authorization).toBe("Bearer AT");
    expect(JSON.parse(init.body).message).toMatchObject({ token: fcmToken, notification: { title: "t", body: "b" }, data: { kind: "newFollower" } });
    // The access token is reused; a gone token is reported dead.
    expect(await sender({ token: fcmToken, environment: "fcm" }, { title: "t", body: "b" })).toEqual({ status: 404, reason: "Unregistered" });
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it("signs a verifiable RS256 assertion", () => {
    const jwt = fcmAssertion(account, 1_700_000_000_000);
    const [h, p, sig] = jwt.split(".");
    expect(JSON.parse(Buffer.from(p, "base64url").toString()).scope).toBe("https://www.googleapis.com/auth/firebase.messaging");
    const pub = createPublicKey(account.private_key);
    expect(createVerify("RSA-SHA256").update(`${h}.${p}`).verify(pub, Buffer.from(sig, "base64url"))).toBe(true);
  });

  it("routes each device to its provider", async () => {
    expect(pushSender({})).toBeNull();
    const sender = pushSender({ FCM_SERVICE_ACCOUNT: JSON.stringify(account) })!;
    expect(await sender({ token: "aa", environment: "production" }, { title: "t", body: "b" })).toEqual({ status: 0, reason: "NotConfigured" });
  });
});

describe("not twice", () => {
  // A tiny in-memory mobileRateEvent with createdAt/id ordering.
  function events() {
    const rows: { id: string; bucket: string; key: string; createdAt: Date }[] = [];
    let n = 0;
    const db = {
      mobileRateEvent: {
        create: vi.fn(async ({ data }: { data: { bucket: string; key: string; createdAt: Date } }) => {
          const row = { id: `e${String(++n).padStart(4, "0")}`, ...data }; rows.push(row); return { id: row.id };
        }),
        findFirst: vi.fn(async ({ where }: { where: { bucket: string; key: string; createdAt: { gte: Date } } }) => {
          const hits = rows.filter((r) => r.bucket === where.bucket && r.key === where.key && r.createdAt >= where.createdAt.gte)
            .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
          return hits[0] ? { id: hits[0].id } : null;
        }),
        deleteMany: vi.fn(async ({ where }: { where: { id: string } }) => {
          const i = rows.findIndex((r) => r.id === where.id); if (i >= 0) rows.splice(i, 1); return { count: i >= 0 ? 1 : 0 };
        }),
      },
      mobileNotificationSettings: { findUnique: vi.fn().mockResolvedValue(null) },
      mobilePushDevice: { findMany: vi.fn().mockResolvedValue([{ token: "aa", environment: "production" }]), deleteMany: vi.fn() },
    };
    return db as unknown as PrismaClient;
  }

  it("lets the first through and holds repeats in the window, per key", async () => {
    const db = events();
    const t0 = new Date("2026-11-07T10:00:00Z");
    expect(await firstInWindow(db, "follow:a:b", NOTIFY_WINDOWS.follow, t0)).toBe(true);
    expect(await firstInWindow(db, "follow:a:b", NOTIFY_WINDOWS.follow, new Date(t0.getTime() + 60_000))).toBe(false);
    expect(await firstInWindow(db, "follow:c:b", NOTIFY_WINDOWS.follow, t0)).toBe(true);
    expect(await firstInWindow(db, "follow:a:b", NOTIFY_WINDOWS.follow, new Date(t0.getTime() + NOTIFY_WINDOWS.follow + 1000))).toBe(true);
  });

  it("sends one notification for a double tap", async () => {
    const db = events();
    const sender = vi.fn().mockResolvedValue({ status: 200 });
    const once = { key: "follow:x", windowMs: NOTIFY_WINDOWS.follow };
    const sent = await Promise.all([
      notifyOnce(db, "owner", "newFollower", { title: "t", body: "b" }, once, sender),
      notifyOnce(db, "owner", "newFollower", { title: "t", body: "b" }, once, sender),
    ]);
    expect(sent.reduce((a, b) => a + b, 0)).toBe(1);
    expect(sender).toHaveBeenCalledTimes(1);
  });
});
