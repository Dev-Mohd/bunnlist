import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "./errors";

// Public @usernames for app accounts. Shown wherever the app names a person
// (discoverer credit, recipe authors, reviews) instead of the raw account id.
// 3-20 characters: lowercase Latin letters, digits, "_" and "."; starts with a
// letter; no "..", no trailing dot. Unique regardless of case.

const RESERVED = new Set([
  "admin", "administrator", "support", "help", "bunnlist", "bunn", "official", "root", "system",
  "moderator", "mod", "staff", "team", "null", "undefined", "me", "settings", "api",
]);

export type UsernameProblem = "too_short" | "too_long" | "must_start_with_letter" | "invalid_chars" | "reserved";

export function normalizeUsername(input: string): string {
  return input.trim().replace(/^@+/, "").toLowerCase();
}

export function usernameProblem(username: string): UsernameProblem | null {
  if (username.length < 3) return "too_short";
  if (username.length > 20) return "too_long";
  if (!/^[a-z]/.test(username)) return "must_start_with_letter";
  if (!/^[a-z0-9_.]+$/.test(username) || username.includes("..") || username.endsWith(".")) return "invalid_chars";
  if (RESERVED.has(username)) return "reserved";
  return null;
}

export const UsernameRequest = z.object({ username: z.string().max(40) });

export async function getUsername(prisma: PrismaClient, accountId: string): Promise<string | null> {
  const profile = await prisma.mobileProfile.findUnique({ where: { accountId }, select: { username: true } });
  return profile?.username ?? null;
}

export async function checkUsername(
  prisma: PrismaClient, accountId: string, input: string,
): Promise<{ username: string; available: boolean; problem: UsernameProblem | "taken" | null }> {
  const username = normalizeUsername(input);
  const problem = usernameProblem(username);
  if (problem) return { username, available: false, problem };
  const owner = await prisma.mobileProfile.findUnique({ where: { username }, select: { accountId: true } });
  const taken = !!owner && owner.accountId !== accountId;
  return { username, available: !taken, problem: taken ? "taken" : null };
}

export async function setUsername(prisma: PrismaClient, accountId: string, input: string): Promise<{ username: string }> {
  const { username, problem } = await checkUsername(prisma, accountId, input);
  if (problem === "taken") throw ApiError.conflict("username_taken");
  if (problem) throw ApiError.unprocessable(problem);
  try {
    await prisma.mobileProfile.upsert({
      where: { accountId }, update: { username }, create: { accountId, username },
    });
  } catch {
    // Lost a race for the same name.
    throw ApiError.conflict("username_taken");
  }
  return { username };
}

/** How the app names each account: "@username", else the account's name, else "مستخدم". */
export async function displayNames(prisma: PrismaClient, accountIds: string[]): Promise<Map<string, string>> {
  const ids = [...new Set(accountIds)];
  if (ids.length === 0) return new Map();
  const [profiles, users] = await Promise.all([
    prisma.mobileProfile.findMany({
      where: { accountId: { in: ids } }, select: { accountId: true, username: true, displayName: true },
    }),
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
  ]);
  const handle = new Map(profiles.flatMap((p) => {
    const shown = p.username ? `@${p.username}` : p.displayName?.trim();
    return shown ? [[p.accountId, shown] as [string, string]] : [];
  }));
  const name = new Map(users.map((u) => [u.id, u.name?.trim() || "مستخدم"]));
  return new Map(ids.flatMap((id) => {
    const display = handle.get(id) ?? name.get(id);
    return display ? [[id, display] as [string, string]] : [];
  }));
}

// --- Profile details and first-run setup ---------------------------------------

export const ProfileUpdate = z.object({
  displayName: z.string().trim().min(1).max(40).optional(),
  bio: z.string().trim().max(160).optional(),
});
export type ProfileUpdate = z.infer<typeof ProfileUpdate>;

export interface MobileProfileView {
  username: string | null;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null;
  onboarded: boolean;
}

/** Public URL of an avatar object, or null without a configured Supabase URL. */
export function avatarUrl(path: string | null): string | null {
  const base = (process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL)?.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
  return path && base ? `${base}/storage/v1/object/public/${AVATAR_BUCKET}/${path}` : null;
}

export const AVATAR_BUCKET = "avatars";

export async function getProfile(prisma: PrismaClient, accountId: string): Promise<MobileProfileView> {
  const [profile, user] = await Promise.all([
    prisma.mobileProfile.findUnique({ where: { accountId } }),
    prisma.user.findUnique({ where: { id: accountId }, select: { name: true } }),
  ]);
  return {
    username: profile?.username ?? null,
    displayName: profile?.displayName ?? (user?.name?.trim() || null),
    bio: profile?.bio ?? null,
    avatarUrl: avatarUrl(profile?.avatarPath ?? null),
    onboarded: !!profile?.onboardedAt,
  };
}

export async function updateProfile(prisma: PrismaClient, accountId: string, patch: ProfileUpdate): Promise<MobileProfileView> {
  const data = {
    ...(patch.displayName !== undefined ? { displayName: patch.displayName } : {}),
    ...(patch.bio !== undefined ? { bio: patch.bio || null } : {}),
  };
  await prisma.mobileProfile.upsert({ where: { accountId }, update: data, create: { accountId, ...data } });
  return getProfile(prisma, accountId);
}

export async function markOnboarded(prisma: PrismaClient, accountId: string): Promise<{ onboarded: true }> {
  const now = new Date();
  await prisma.mobileProfile.upsert({ where: { accountId }, update: { onboardedAt: now }, create: { accountId, onboardedAt: now } });
  return { onboarded: true };
}

/** A Latin seed for a suggested username from the account's name or email. */
export function usernameSeed(name: string | null | undefined, email: string | null | undefined): string {
  const clean = (text: string) => text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "_").replace(/^[^a-z]+/, "").replace(/_+$/, "").slice(0, 14);
  const fromName = clean(name ?? "");
  if (fromName.length >= 3) return fromName;
  const fromEmail = clean((email ?? "").split("@")[0]);
  // Apple's private relay addresses are random: prefer a friendly default then.
  if (fromEmail.length >= 3 && !(email ?? "").endsWith("privaterelay.appleid.com")) return fromEmail;
  return "coffee";
}

/** A valid, currently free username suggestion (the caller's own counts as free). */
export async function suggestUsername(prisma: PrismaClient, accountId: string, random = Math.random): Promise<{ username: string }> {
  const user = await prisma.user.findUnique({ where: { id: accountId }, select: { name: true, email: true } });
  const seed = usernameSeed(user?.name, user?.email);
  const candidates = [seed, ...Array.from({ length: 8 }, (_, i) => `${seed}${Math.floor(random() * 10 ** (2 + Math.min(i, 3)))}`)];
  for (const candidate of candidates) {
    const { available, problem } = await checkUsername(prisma, accountId, candidate);
    if (available && !problem) return { username: candidate };
  }
  return { username: `coffee${Date.now().toString().slice(-6)}` };
}
