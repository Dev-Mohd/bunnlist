import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "./errors";

// Brew experiences logged from the app against a published lot. Mirrors the app's
// BrewExperience + ContentLifecycle: stars rate this attempt only (never the lot
// average), and the lifecycle is draft -> published <-> unpublished, with deleted
// reachable from anywhere and final. Creation is idempotent per (account, clientId).

export const EXPERIENCE_STATES = ["draft", "published", "unpublished", "deleted"] as const;
export type ExperienceState = (typeof EXPERIENCE_STATES)[number];

export const BREW_METHOD_CODES = [
  "ESPRESSO", "V60", "CHEMEX", "AEROPRESS", "FRENCH_PRESS", "COLD_BREW", "OTHER",
] as const;

export function canTransition(from: ExperienceState, to: ExperienceState): boolean {
  if (from === to || from === "deleted") return false;
  if (to === "deleted") return true;
  if (from === "draft") return to === "published";
  if (from === "published") return to === "unpublished";
  if (from === "unpublished") return to === "published";
  return false;
}

export const ExperienceUpsert = z.object({
  clientId: z.string().min(1).max(100),
  methodCode: z.enum(BREW_METHOD_CODES),
  stars: z.number().int().min(1).max(5),
  brewedAt: z.iso.datetime({ offset: true }),
  note: z.string().max(2000).default(""),
  publish: z.boolean().default(false),
});
export type ExperienceUpsert = z.infer<typeof ExperienceUpsert>;

export const ExperienceStateChange = z.object({
  state: z.enum(EXPERIENCE_STATES),
});

export interface MobileExperience {
  id: string;
  clientId: string;
  methodCode: string;
  stars: number;
  brewedAt: string;
  note: string;
  state: ExperienceState;
  revision: number;
  updatedAt: string;
}

type Row = {
  id: string; clientId: string; lotId: string; accountId: string; methodCode: string; stars: number;
  brewedAt: Date; note: string; state: string; revision: number; updatedAt: Date;
};

export function mapExperience(row: Row): MobileExperience {
  return {
    id: row.id,
    clientId: row.clientId,
    methodCode: row.methodCode,
    stars: row.stars,
    brewedAt: row.brewedAt.toISOString(),
    note: row.note,
    state: row.state as ExperienceState,
    revision: row.revision,
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function lotIdForSlug(prisma: PrismaClient, slug: string): Promise<string> {
  const lot = await prisma.coffeeLot.findFirst({ where: { slug, publishedAt: { not: null } }, select: { id: true } });
  if (!lot) throw ApiError.unprocessable("lot_not_found");
  return lot.id;
}

export async function listMyExperiences(
  prisma: PrismaClient, accountId: string, slug: string,
): Promise<MobileExperience[]> {
  const lotId = await lotIdForSlug(prisma, slug);
  const rows = await prisma.mobileBrewExperience.findMany({
    where: { accountId, lotId, state: { not: "deleted" } },
    orderBy: [{ brewedAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
  return rows.map(mapExperience);
}

/** Create, or edit by clientId. Publishing a draft is allowed in the same call. */
export async function saveExperience(
  prisma: PrismaClient, accountId: string, slug: string, input: ExperienceUpsert,
): Promise<MobileExperience> {
  const lotId = await lotIdForSlug(prisma, slug);
  const fields = {
    methodCode: input.methodCode,
    stars: input.stars,
    brewedAt: new Date(input.brewedAt),
    note: input.note.trim(),
  };
  const existing = await prisma.mobileBrewExperience.findUnique({
    where: { accountId_clientId: { accountId, clientId: input.clientId } },
  });

  let row: Row;
  if (!existing) {
    row = await prisma.mobileBrewExperience.create({
      data: { accountId, clientId: input.clientId, lotId, ...fields, state: input.publish ? "published" : "draft" },
    });
  } else {
    if (existing.lotId !== lotId) throw ApiError.conflict("client_id_reused");
    const from = existing.state as ExperienceState;
    if (from === "deleted") throw ApiError.conflict("experience_deleted");
    const state = input.publish && canTransition(from, "published") ? "published" : from;
    row = await prisma.mobileBrewExperience.update({
      where: { id: existing.id },
      data: { ...fields, state, revision: { increment: 1 } },
    });
  }

  // Logging a brew means the user tried this coffee.
  await prisma.mobileCollectionEntry.upsert({
    where: { accountId_lotId: { accountId, lotId } },
    update: { tried: true },
    create: { accountId, lotId, tried: true },
  });
  return mapExperience(row);
}

export async function changeExperienceState(
  prisma: PrismaClient, accountId: string, id: string, to: ExperienceState,
): Promise<MobileExperience> {
  const existing = await prisma.mobileBrewExperience.findUnique({ where: { id } });
  // Someone else's experience reads as missing, never as forbidden.
  if (!existing || existing.accountId !== accountId) throw ApiError.unprocessable("experience_not_found");
  if (!canTransition(existing.state as ExperienceState, to)) throw ApiError.conflict("invalid_transition");
  const row = await prisma.mobileBrewExperience.update({
    where: { id },
    data: { state: to, revision: { increment: 1 } },
  });
  return mapExperience(row);
}
