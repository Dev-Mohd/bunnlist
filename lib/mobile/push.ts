import { connect } from "node:http2";
import { createSign } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { hashKey } from "./rateLimit";

// Push notifications through Apple (APNs, token auth) for iPhones and Firebase
// Cloud Messaging (HTTP v1) for Android. Configured by environment:
// APNS_KEY_ID, APNS_TEAM_ID, APNS_PRIVATE_KEY (the .p8 contents), APNS_BUNDLE_ID,
// and FCM_SERVICE_ACCOUNT (the service-account JSON). Without them nothing is sent
// and nothing fails. Android devices are stored with environment "fcm".

export const NOTIFICATION_KINDS = ["newFollower", "submissionApproved", "submissionRejected", "reviewHelpful", "recipeLiked", "weeklySummary", "announcements", "comments"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export const NotificationSettingsUpdate = z.object({
  newFollower: z.boolean().optional(),
  submissionApproved: z.boolean().optional(),
  submissionRejected: z.boolean().optional(),
  reviewHelpful: z.boolean().optional(),
  recipeLiked: z.boolean().optional(),
  weeklySummary: z.boolean().optional(),
  announcements: z.boolean().optional(),
  comments: z.boolean().optional(),
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
    comments: row?.comments ?? true,
  };
}

export async function updateNotificationSettings(
  prisma: PrismaClient, accountId: string, patch: z.infer<typeof NotificationSettingsUpdate>,
): Promise<NotificationSettings> {
  await prisma.mobileNotificationSettings.upsert({ where: { accountId }, update: patch, create: { accountId, ...patch } });
  return getNotificationSettings(prisma, accountId);
}

const APNS_TOKEN = /^[0-9a-f]{32,200}$/i;
const FCM_TOKEN = /^[A-Za-z0-9:_-]{32,4096}$/;

export const DeviceRegistration = z.object({
  token: z.string().max(4096),
  environment: z.enum(["sandbox", "production", "fcm"]).default("production"),
}).refine((d) => (d.environment === "fcm" ? FCM_TOKEN : APNS_TOKEN).test(d.token), { message: "invalid token", path: ["token"] });

export const DeviceUnregistration = z.object({ token: z.string().max(4096).regex(FCM_TOKEN) });

/** APNs tokens are hex (case-free); FCM tokens are case-sensitive and kept as sent. */
function normalizeToken(token: string): string {
  return APNS_TOKEN.test(token) ? token.toLowerCase() : token;
}

/** Ties the token to this account (a phone that changed accounts moves over). */
export async function registerDevice(prisma: PrismaClient, accountId: string, input: z.infer<typeof DeviceRegistration>) {
  const token = input.environment === "fcm" ? input.token : input.token.toLowerCase();
  await prisma.mobilePushDevice.upsert({
    where: { token },
    update: { accountId, environment: input.environment },
    create: { token, accountId, environment: input.environment },
  });
  return { ok: true as const };
}

export async function unregisterDevice(prisma: PrismaClient, accountId: string, token: string) {
  await prisma.mobilePushDevice.deleteMany({ where: { accountId, token: { in: [...new Set([token, normalizeToken(token)])] } } });
  return { ok: true as const };
}

export interface PushMessage { title: string; body: string; data?: Record<string, string> }

/** Sends one notification; resolves to the provider's status (410, BadDeviceToken or Unregistered mean the token is dead). */
export type PushSender = (device: { token: string; environment: string }, message: PushMessage) => Promise<{ status: number; reason?: string }>;

/**
 * Notifies an account on all its phones, if it wants this kind. Never throws:
 * a failed notification must not fail the action that caused it. Dead tokens are removed.
 */
export async function notify(
  prisma: PrismaClient, accountId: string, kind: NotificationKind, message: PushMessage, sender: PushSender | null = pushSender(),
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

// --- Not twice -----------------------------------------------------------------

/** How long the same person doing the same thing to the same target stays one notification. */
export const NOTIFY_WINDOWS = {
  follow: 24 * 60 * 60 * 1000,   // follow / request, unfollow, follow again…
  accepted: 24 * 60 * 60 * 1000,
  like: 24 * 60 * 60 * 1000,     // like, unlike, like again…
  comment: 10 * 60 * 1000,       // a burst of comments on one post
} as const;

const ONCE_BUCKET = "notify_once";

/**
 * True for the first call with this key in the window, false for the rest (a repeat tap, a toggle,
 * or a parallel request). Records first, then checks it's the earliest event, so two at once can't both win.
 */
export async function firstInWindow(prisma: PrismaClient, key: string, windowMs: number, now = new Date()): Promise<boolean> {
  const hashed = hashKey(`${ONCE_BUCKET}:${key}`);
  const mine = await prisma.mobileRateEvent.create({ data: { bucket: ONCE_BUCKET, key: hashed, createdAt: now }, select: { id: true } });
  const first = await prisma.mobileRateEvent.findFirst({
    where: { bucket: ONCE_BUCKET, key: hashed, createdAt: { gte: new Date(now.getTime() - windowMs) } },
    orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    select: { id: true },
  });
  if (first?.id === mine.id) return true;
  // Only the one that went out counts, so repeats don't keep pushing the window forward.
  await prisma.mobileRateEvent.deleteMany({ where: { id: mine.id } });
  return false;
}

/** `notify`, but only the first time `key` comes up in the window. Never throws. */
export async function notifyOnce(
  prisma: PrismaClient, accountId: string, kind: NotificationKind, message: PushMessage,
  once: { key: string; windowMs: number }, sender: PushSender | null = pushSender(),
): Promise<number> {
  try {
    if (!(await firstInWindow(prisma, `${accountId}:${kind}:${once.key}`, once.windowMs))) return 0;
  } catch (error) {
    console.error("notify dedupe failed", error);
  }
  return notify(prisma, accountId, kind, message, sender);
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

// --- Routing ------------------------------------------------------------------

/** Sends each device through its own provider; null when neither is configured. */
export function pushSender(env: Record<string, string | undefined> = process.env): PushSender | null {
  const apns = apnsSender(env);
  const fcm = fcmSender(env);
  if (!apns && !fcm) return null;
  return async (device, message) => {
    const sender = device.environment === "fcm" ? fcm : apns;
    return sender ? sender(device, message) : { status: 0, reason: "NotConfigured" };
  };
}

// --- FCM (HTTP v1) --------------------------------------------------------------

interface ServiceAccount { project_id: string; client_email: string; private_key: string; token_uri?: string }

function readServiceAccount(raw: string | undefined): ServiceAccount | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf8"));
    if (!parsed.project_id || !parsed.client_email || !parsed.private_key) return null;
    return { ...parsed, private_key: String(parsed.private_key).replace(/\\n/g, "\n") };
  } catch {
    return null;
  }
}

let cachedAccess: { token: string; expiresAt: number; email: string } | null = null;

/** A signed service-account assertion for Google's token endpoint. */
export function fcmAssertion(account: ServiceAccount, now = Date.now()): string {
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const iat = Math.floor(now / 1000);
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: account.token_uri ?? "https://oauth2.googleapis.com/token",
    iat,
    exp: iat + 3600,
  })}`;
  const signature = createSign("RSA-SHA256").update(unsigned).sign(account.private_key).toString("base64url");
  return `${unsigned}.${signature}`;
}

async function fcmAccessToken(account: ServiceAccount, fetcher: typeof fetch): Promise<string> {
  const now = Date.now();
  if (cachedAccess && cachedAccess.email === account.client_email && cachedAccess.expiresAt - now > 5 * 60 * 1000) return cachedAccess.token;
  const res = await fetcher(account.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: fcmAssertion(account, now) }),
  });
  if (!res.ok) throw new Error(`fcm auth ${res.status}`);
  const json = (await res.json()) as { access_token: string; expires_in?: number };
  cachedAccess = { token: json.access_token, expiresAt: now + (json.expires_in ?? 3600) * 1000, email: account.client_email };
  return json.access_token;
}

/** The FCM sender, or null when FCM_SERVICE_ACCOUNT isn't set. Data values must be strings. */
export function fcmSender(env: Record<string, string | undefined> = process.env, fetcher: typeof fetch = fetch): PushSender | null {
  const account = readServiceAccount(env.FCM_SERVICE_ACCOUNT);
  if (!account) return null;
  return async (device, message) => {
    const access = await fcmAccessToken(account, fetcher);
    const res = await fetcher(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
      method: "POST",
      headers: { authorization: `Bearer ${access}`, "content-type": "application/json" },
      body: JSON.stringify({
        message: {
          token: device.token,
          notification: { title: message.title, body: message.body },
          data: message.data ?? {},
          android: { priority: "high", notification: { channel_id: "general", sound: "default" } },
        },
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) return { status: 200 };
    let code: string | undefined;
    try {
      const err = (await res.json()) as { error?: { status?: string; details?: { errorCode?: string }[] } };
      code = err.error?.details?.find((d) => d.errorCode)?.errorCode ?? err.error?.status;
    } catch { /* not JSON */ }
    // A token that's gone (app removed, data cleared) or malformed won't recover.
    const dead = res.status === 404 || code === "UNREGISTERED" || (res.status === 400 && code === "INVALID_ARGUMENT");
    return { status: res.status, reason: dead ? "Unregistered" : code };
  };
}
