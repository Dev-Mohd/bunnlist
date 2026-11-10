import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "./errors";
import { notify, pushSender, type PushSender } from "./push";

// «مبدع مؤسس»: the first 100 creators an admin invites get a numbered, permanent badge,
// and only they can show their accounts elsewhere (TikTok, Instagram, YouTube, X) on
// their profile and recipes. Numbers go up in grant order and are never reused, so a
// revoked number stays empty and the cap still means "100 ever".

export const FOUNDER_LIMIT = 100;

export const SOCIAL_KEYS = ["tiktok", "instagram", "youtube", "x"] as const;
export type SocialKey = (typeof SOCIAL_KEYS)[number];
export type Socials = Partial<Record<SocialKey, string>>;

const HOSTS: Record<SocialKey, RegExp> = {
  tiktok: /^(?:https?:\/\/)?(?:www\.|m\.)?tiktok\.com\/@?/i,
  instagram: /^(?:https?:\/\/)?(?:www\.)?instagram\.com\//i,
  youtube: /^(?:https?:\/\/)?(?:www\.|m\.)?youtube\.com\/(?:@|c\/|user\/)?/i,
  x: /^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\//i,
};

/** A handle from what someone typed: "@name", "name" or a profile link. Null when it isn't one. */
export function socialHandle(key: SocialKey, input: string): string | null {
  let text = input.trim().replace(HOSTS[key], "").replace(/^@+/, "");
  text = text.split(/[/?#]/)[0] ?? "";
  if (!text) return null;
  const max = key === "x" ? 15 : 30;
  return /^[A-Za-z0-9._-]+$/.test(text) && text.length <= max ? text : null;
}

/** The stored socials, cleaned: only known keys with valid handles. */
export function readSocials(value: unknown): Socials {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Socials = {};
  for (const key of SOCIAL_KEYS) {
    const raw = (value as Record<string, unknown>)[key];
    if (typeof raw === "string") {
      const handle = socialHandle(key, raw);
      if (handle) out[key] = handle;
    }
  }
  return out;
}

/** PATCH body part: each key a handle/link to set, or "" / null to clear. */
export const SocialsUpdate = z.object(
  Object.fromEntries(SOCIAL_KEYS.map((k) => [k, z.string().max(200).nullable().optional()])) as Record<SocialKey, z.ZodOptional<z.ZodNullable<z.ZodString>>>,
);
export type SocialsUpdate = z.infer<typeof SocialsUpdate>;

/** Applies a socials patch to the current ones; an invalid handle is refused, not dropped. */
export function mergeSocials(current: unknown, patch: SocialsUpdate): Socials {
  const next: Socials = readSocials(current);
  for (const key of SOCIAL_KEYS) {
    if (!(key in patch)) continue;
    const value = patch[key];
    if (value === null || value === undefined || value.trim() === "") { delete next[key]; continue; }
    const handle = socialHandle(key, value);
    if (!handle) throw ApiError.unprocessable(`invalid_${key}`);
    next[key] = handle;
  }
  return next;
}

/** What the apps show next to a name: the founder number, or null. */
export type FounderBadge = { number: number } | null;
export function founderBadge(profile: { founderNumber?: number | null } | null | undefined): FounderBadge {
  return profile?.founderNumber ? { number: profile.founderNumber } : null;
}

/** A founder's socials for others to see; nobody else's are shown. */
export function publicSocials(profile: { founderNumber?: number | null; socials?: unknown } | null | undefined): Socials | null {
  return profile?.founderNumber ? readSocials(profile.socials) : null;
}

export interface FounderStats { limit: number; taken: number; remaining: number }

/** How many founder numbers are handed out, by the highest number given (revoked ones stay used). */
export async function founderStats(prisma: PrismaClient): Promise<FounderStats> {
  const top = await prisma.mobileProfile.aggregate({ _max: { founderNumber: true } });
  const taken = Math.min(top._max.founderNumber ?? 0, FOUNDER_LIMIT);
  return { limit: FOUNDER_LIMIT, taken, remaining: FOUNDER_LIMIT - taken };
}

/**
 * Makes an account a founder with the next number. Already one: returns its number unchanged.
 * All 100 given: refuses. Two admins at once can't get the same number (unique index; retried).
 */
export async function grantFounder(
  prisma: PrismaClient, accountId: string, now = new Date(), sender: PushSender | null = pushSender(),
): Promise<{ number: number; alreadyFounder: boolean }> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const profile = await prisma.mobileProfile.findUnique({ where: { accountId }, select: { founderNumber: true } });
    if (profile?.founderNumber) return { number: profile.founderNumber, alreadyFounder: true };
    const { taken } = await founderStats(prisma);
    if (taken >= FOUNDER_LIMIT) throw ApiError.unprocessable("founders_full");
    const number = taken + 1;
    try {
      await prisma.mobileProfile.upsert({
        where: { accountId },
        update: { founderNumber: number, founderAt: now },
        create: { accountId, founderNumber: number, founderAt: now },
      });
    } catch {
      continue; // someone else took this number a moment ago
    }
    await notify(prisma, accountId, "announcements", {
      title: "مبروك، صرت مبدع مؤسس ☕",
      body: `رقمك #${String(number).padStart(2, "0")} من ${FOUNDER_LIMIT}. أضف حساباتك في ملفك، وتطلع على وصفاتك.`,
      data: { kind: "founder" },
    }, sender);
    return { number, alreadyFounder: false };
  }
  throw ApiError.conflict("try_again");
}

/** Takes the badge back. The number isn't given to anyone else; the socials are cleared. */
export async function revokeFounder(prisma: PrismaClient, accountId: string): Promise<void> {
  await prisma.mobileProfile.updateMany({ where: { accountId }, data: { founderNumber: null, founderAt: null, socials: {} } });
}

/** Founder numbers for a set of accounts (for names shown in feeds, lists and recipes). */
export async function founderNumbers(prisma: PrismaClient, accountIds: string[]): Promise<Map<string, number>> {
  const ids = [...new Set(accountIds)];
  if (ids.length === 0) return new Map();
  const rows = await prisma.mobileProfile.findMany({
    where: { accountId: { in: ids }, founderNumber: { not: null } }, select: { accountId: true, founderNumber: true },
  });
  return new Map(rows.map((r) => [r.accountId, r.founderNumber as number]));
}
