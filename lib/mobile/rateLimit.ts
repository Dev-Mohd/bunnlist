import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { ApiError } from "./errors";

// Simple sliding-window limits kept in the database (serverless instances share
// nothing in memory). Keys are hashed, so no raw IP or email is stored here.

export const LIMITS = {
  /** Sign-in codes sent from one device (IP). */
  otpRequestIp: { bucket: "otp_request_ip", limit: 10, windowMs: 60 * 60 * 1000 },
  /** Wrong codes for one email, across every code sent to it. */
  otpFailEmail: { bucket: "otp_fail_email", limit: 20, windowMs: 24 * 60 * 60 * 1000 },
  /** «ساعدني أختار» runs by a guest (IP) / a signed-in account. */
  advisorIp: { bucket: "advisor_ip", limit: 30, windowMs: 60 * 60 * 1000 },
  advisorAccount: { bucket: "advisor_account", limit: 60, windowMs: 60 * 60 * 1000 },
} as const;
export type Limit = (typeof LIMITS)[keyof typeof LIMITS];

const RETENTION_MS = 2 * 24 * 60 * 60 * 1000;

export function hashKey(value: string): string {
  return createHash("sha256").update(`bunnlist-rl:${value.trim().toLowerCase()}`).digest("hex");
}

/** The caller's IP as Vercel reports it (it sets x-forwarded-for itself), or null. */
export function clientIp(req: Request): string | null {
  const fwd = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return fwd || req.headers.get("x-real-ip")?.trim() || null;
}

/** How many events this key has in the window. */
export async function countRecent(prisma: PrismaClient, l: Limit, key: string, now = new Date()): Promise<number> {
  return prisma.mobileRateEvent.count({
    where: { bucket: l.bucket, key: hashKey(key), createdAt: { gte: new Date(now.getTime() - l.windowMs) } },
  });
}

export async function record(prisma: PrismaClient, l: Limit, key: string, now = new Date()): Promise<void> {
  await prisma.mobileRateEvent.create({ data: { bucket: l.bucket, key: hashKey(key), createdAt: now } });
  // Now and then, drop old events so the table stays small.
  if (Math.random() < 0.02) {
    await prisma.mobileRateEvent.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - RETENTION_MS) } } }).catch(() => undefined);
  }
}

/** Throws 429 when the key is at its limit; otherwise counts this use. A missing key passes. */
export async function hit(prisma: PrismaClient, l: Limit, key: string | null, reason: string, now = new Date()): Promise<void> {
  if (!key) return;
  // Record first, then count: parallel requests each see the others' events.
  await record(prisma, l, key, now);
  if ((await countRecent(prisma, l, key, now)) > l.limit) throw ApiError.rateLimited(reason);
}
