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
    prisma.mobileProfile.findMany({ where: { accountId: { in: ids } }, select: { accountId: true, username: true } }),
    prisma.user.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } }),
  ]);
  const handle = new Map(profiles.map((p) => [p.accountId, `@${p.username}`]));
  const name = new Map(users.map((u) => [u.id, u.name?.trim() || "مستخدم"]));
  return new Map(ids.flatMap((id) => {
    const display = handle.get(id) ?? name.get(id);
    return display ? [[id, display] as [string, string]] : [];
  }));
}
