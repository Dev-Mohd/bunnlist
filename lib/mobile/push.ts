import { connect } from "node:http2";
import { createSign } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

// Push notifications through Apple (APNs, token auth). Configured by environment:
// APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (the .p8 contents) and
// APNS_BUNDLE_ID. Without them nothing is sent and nothing fails.

export const NOTIFICATION_KINDS = ["newFollower", "submissionApproved", "submissionRejected", "reviewHelpful", "recipeLiked", "weeklySummary", "announcements"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NotificationSettingsUpdate = z.object({
  newFollower: z.boolean().optional(),
  submissionApproved: z.boolean().optional(),
  submissionRejected: z.boolean().optional(),
  reviewHelpful: z.boolean().optional(),
  recipeLiked: z.boolean().optional(),
  weeklySummary: z.boolean().optional(),
  announcements: z.boolean().optional(),
});

export type NotificationSettings = Record<NotificationKind, boolean>;

export async function getNotificationSettings(prisma: PrismaClient, accountId: string): Promise<NotificationSettings> {
  const row = await prisma.mobileNotificationSettings.findUnique({ where: { accountId } });
  return {
    newFollower: row?.newFollower ?? true,
    submissionApproved: row?.submissionApproved ?? true,
    submissionRejected: row?.submissionRejected ?? true,
    reviewHelpful: row?.reviewHelpful ?? true,
    recipeLiked: row?.recipeLiked ?? true,
    weeklySummary: row?.weeklySummary ?? true,
    announcements: row?.announcements ?? true,
  };
}

export async function updateNotificationSettings(
  prisma: PrismaClient, accountId: string, patch: z.infer<typeof NotificationSettingsUpdate>,
): Promise<NotificationSettings> {
  await prisma.mobileNotificationSettings.upsert({ where: { accountId }, update: patch, create: { accountId, ...patch } });
  return getNotificationSettings(prisma, accountId);
}

export const DeviceRegistration = z.object({
  token: z.string().regex(/^[0-9a-f]{32,200}$/i),
  environment: z.enum(["sandbox", "production"]).default("production"),
});

/** Ties the token to this account (a phone that changed accounts moves over). */
export async function registerDevice(prisma: PrismaClient, accountId: string, input: z.infer<typeof DeviceRegistration>) {
  const token = input.token.toLowerCase();
  await prisma.mobilePushDevice.upsert({
    where: { token },
    update: { accountId, environment: input.environment },
    create: { token, accountId, environment: input.environment },
  });
  return { ok: true as const };
}

export async function unregisterDevice(prisma: PrismaClient, accountId: string, token: string) {
  await prisma.mobilePushDevice.deleteMany({ where: { accountId, token: token.toLowerCase() } });
  return { ok: true as const };
}

export interface PushMessage { title: string; body: string; data?: Record<string, string> }

/** Sends one notification; resolves to the APNs status (410/400 BadDeviceToken mean the token is dead). */
export type PushSender = (device: { token: string; environment: string }, message: PushMessage) => Promise<{ status: number; reason?: string }>;

/**
 * Notifies an account on all its phones, if it wants this kind. Never throws:
 * a failed notification must not fail the action that caused it. Dead tokens are removed.
 */
export async function notify(
  prisma: PrismaClient, accountId: string, kind: NotificationKind, message: PushMessage, sender: PushSender | null = apnsSender(),
): Promise<number> {
  if (!sender) return 0;
  try {
    const [settings, devices] = await Promise.all([
      getNotificationSettings(prisma, accountId),
      prisma.mobilePushDevice.findMany({ where: { accountId } }),
    ]);
    if (!settings[kind] || devices.length === 0) return 0;
    let sent = 0;
    for (const device of devices) {
      const result = await sender(device, { ...message, data: { kind, ...message.data } }).catch(() => ({ status: 0 } as { status: number; reason?: string }));
      if (result.status === 200) sent += 1;
      else if (result.status === 410 || result.reason === "BadDeviceToken" || result.reason === "Unregistered") {
        await prisma.mobilePushDevice.deleteMany({ where: { token: device.token } });
      }
    }
    return sent;
  } catch (error) {
    console.error("push failed", error);
    return 0;
  }
}

// --- APNs ---------------------------------------------------------------------

let cachedJwt: { token: string; at: number } | null = null;

function apnsJwt(keyId: string, teamId: string, privateKey: string, now = Date.now()): string {
  // Apple accepts a token for an hour; refresh well before.
  if (cachedJwt && now - cachedJwt.at < 40 * 60 * 1000) return cachedJwt.token;
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const unsigned = `${b64({ alg: "ES256", kid: keyId })}.${b64({ iss: teamId, iat: Math.floor(now / 1000) })}`;
  const signature = createSign("SHA256").update(unsigned).sign({ key: privateKey, dsaEncoding: "ieee-p1363" }).toString("base64url");
  cachedJwt = { token: `${unsigned}.${signature}`, at: now };
  return cachedJwt.token;
}

/** The real sender, or null when APNs isn't configured. */
export function apnsSender(env: Record<string, string | undefined> = process.env): PushSender | null {
  const { APNS_KEY_ID: keyId, APNS_TEAM_ID: teamId, APNS_BUNDLE_ID: bundleId } = env;
  const privateKey = env.APNS_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!keyId || !teamId || !bundleId || !privateKey) return null;
  return (device, message) => new Promise((resolve, reject) => {
    const host = device.environment === "sandbox" ? "https://api.sandbox.push.apple.com" : "https://api.push.apple.com";
    const client = connect(host);
    client.on("error", reject);
    const req = client.request({
      ":method": "POST",
      ":path": `/3/device/${device.token}`,
      authorization: `bearer ${apnsJwt(keyId, teamId, privateKey)}`,
      "apns-topic": bundleId,
      "apns-push-type": "alert",
      "content-type": "application/json",
    });
    let status = 0;
    let body = "";
    req.on("response", (headers) => { status = Number(headers[":status"]); });
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      client.close();
      let reason: string | undefined;
      try { reason = body ? JSON.parse(body).reason : undefined; } catch { /* empty body on success */ }
      resolve({ status, reason });
    });
    req.on("error", (e) => { client.close(); reject(e); });
    req.setTimeout(8000, () => { req.close(); client.close(); reject(new Error("apns timeout")); });
    req.end(JSON.stringify({ aps: { alert: { title: message.title, body: message.body }, sound: "default" }, ...message.data }));
  });
}
