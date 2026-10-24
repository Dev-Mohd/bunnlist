import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "./errors";
import { BREW_METHOD_CODES, canTransition, EXPERIENCE_STATES, type ExperienceState } from "./experiences";

// Brew recipes from the app. Mirrors BunnListCore's Recipe: an optional lot (none = a
// general recipe), per-step water additions with the total derived, and the same
// publish validation. Drafts always save; publishing (and editing a published
// recipe) must pass validation. Same lifecycle as experiences; deleted is final.

export type RecipeState = ExperienceState;
export const RECIPE_STATES = EXPERIENCE_STATES;

export const STEP_KINDS = ["bloom", "pour", "wait", "swirl", "serve"] as const;
export type StepKind = (typeof STEP_KINDS)[number];
const addsWater = (kind: StepKind) => kind === "bloom" || kind === "pour";

const grams = z.number().positive().max(10000).nullable().optional();

export const RecipeStepInput = z.object({
  kind: z.enum(STEP_KINDS),
  addedWaterGrams: z.number().max(10000).nullable().optional(),
  seconds: z.number().int().min(0).max(36000).nullable().optional(),
  note: z.string().max(300).default(""),
});
export type RecipeStepInput = z.infer<typeof RecipeStepInput>;

export const RecipeUpsert = z.object({
  clientId: z.string().min(1).max(100),
  lotSlug: z.string().min(1).max(200).nullable().optional(),
  title: z.string().max(80).default(""),
  methodCode: z.enum(BREW_METHOD_CODES),
  temperature: z.enum(["hot", "iced"]).default("hot"),
  doseGrams: grams,
  hotWaterGrams: grams,
  iceGrams: grams,
  yieldGrams: grams,
  waterTempC: z.number().min(0).max(100).nullable().optional(),
  grinder: z.string().max(60).default(""),
  grindSetting: z.string().max(60).default(""),
  notes: z.string().max(2000).default(""),
  steps: z.array(RecipeStepInput).max(20).default([]),
  sourceId: z.string().min(1).max(100).nullable().optional(),
  publish: z.boolean().default(false),
});
export type RecipeUpsert = z.infer<typeof RecipeUpsert>;

export const RecipeStateChange = z.object({ state: z.enum(RECIPE_STATES) });

export type RecipeProblem =
  | "missingTitle"
  | "missingHotWater"
  | "pourSumDoesNotMatchHotWater"
  | "negativeOrZeroWater"
  | "missingEspressoDose"
  | "missingEspressoYield"
  | "waterOnNonPourStep";

export interface RecipeFields {
  title: string;
  methodCode: string;
  doseGrams?: number | null;
  hotWaterGrams?: number | null;
  yieldGrams?: number | null;
  steps: { kind: StepKind; addedWaterGrams?: number | null }[];
}

const MATCH_TOLERANCE_GRAMS = 1;

/** Same rules, in the same order, as Recipe.validate() in the app. */
export function validateRecipe(r: RecipeFields): RecipeProblem[] {
  const problems: RecipeProblem[] = [];
  if (!r.title.trim()) problems.push("missingTitle");
  if (r.steps.some((s) => !addsWater(s.kind) && s.addedWaterGrams != null)) problems.push("waterOnNonPourStep");
  const pours = r.steps.filter((s) => addsWater(s.kind) && s.addedWaterGrams != null).map((s) => s.addedWaterGrams as number);
  if (pours.some((g) => g <= 0)) problems.push("negativeOrZeroWater");

  if (r.methodCode === "ESPRESSO") {
    if (!(r.doseGrams && r.doseGrams > 0)) problems.push("missingEspressoDose");
    if (!(r.yieldGrams && r.yieldGrams > 0)) problems.push("missingEspressoYield");
  } else {
    if (!(r.hotWaterGrams && r.hotWaterGrams > 0)) {
      problems.push("missingHotWater");
      return problems;
    }
    const poured = pours.reduce((a, b) => a + b, 0);
    if (Math.abs(poured - r.hotWaterGrams) > MATCH_TOLERANCE_GRAMS) problems.push("pourSumDoesNotMatchHotWater");
  }
  return problems;
}

function notPublishable(problems: RecipeProblem[]): ApiError {
  return ApiError.unprocessable(`not_publishable:${problems.join(",")}`);
}

export interface MobileRecipeLot { slug: string; nameAr: string; roasterNameAr: string }

export interface MobileRecipe {
  id: string;
  clientId: string;
  title: string;
  methodCode: string;
  temperature: "hot" | "iced";
  lot: MobileRecipeLot | null;
  doseGrams: number | null;
  hotWaterGrams: number | null;
  iceGrams: number | null;
  yieldGrams: number | null;
  waterTempC: number | null;
  grinder: string;
  grindSetting: string;
  notes: string;
  steps: { kind: StepKind; addedWaterGrams: number | null; seconds: number | null; note: string }[];
  sourceId: string | null;
  sourceVersion: number | null;
  version: number;
  state: RecipeState;
  authorName: string;
  isMine: boolean;
  publishedAt: string | null;
  updatedAt: string;
}

type RecipeRow = {
  id: string; accountId: string; clientId: string; lotId: string | null; title: string; methodCode: string;
  temperature: string; doseGrams: number | null; hotWaterGrams: number | null; iceGrams: number | null;
  yieldGrams: number | null; waterTempC: number | null; grinder: string; grindSetting: string; notes: string;
  steps: unknown; sourceId: string | null; sourceVersion: number | null; version: number; state: string;
  publishedAt: Date | null; updatedAt: Date;
};

export function normalizeSteps(raw: unknown): MobileRecipe["steps"] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((s) => {
    const parsed = RecipeStepInput.safeParse(s);
    if (!parsed.success) return [];
    const { kind, addedWaterGrams, seconds, note } = parsed.data;
    return [{ kind, addedWaterGrams: addedWaterGrams ?? null, seconds: seconds ?? null, note }];
  });
}

export function mapRecipe(
  row: RecipeRow, viewerId: string | null, lot: MobileRecipeLot | null, authorName: string,
): MobileRecipe {
  return {
    id: row.id,
    clientId: row.clientId,
    title: row.title,
    methodCode: row.methodCode,
    temperature: row.temperature === "iced" ? "iced" : "hot",
    lot,
    doseGrams: row.doseGrams,
    hotWaterGrams: row.hotWaterGrams,
    iceGrams: row.iceGrams,
    yieldGrams: row.yieldGrams,
    waterTempC: row.waterTempC,
    grinder: row.grinder,
    grindSetting: row.grindSetting,
    notes: row.notes,
    steps: normalizeSteps(row.steps),
    sourceId: row.sourceId,
    sourceVersion: row.sourceVersion,
    version: row.version,
    state: row.state as RecipeState,
    authorName,
    isMine: viewerId !== null && row.accountId === viewerId,
    publishedAt: row.publishedAt ? row.publishedAt.toISOString() : null,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Attach lot summaries and author names in two batched queries. */
async function present(prisma: PrismaClient, rows: RecipeRow[], viewerId: string | null): Promise<MobileRecipe[]> {
  if (rows.length === 0) return [];
  const lotIds = [...new Set(rows.map((r) => r.lotId).filter((id): id is string => !!id))];
  const userIds = [...new Set(rows.map((r) => r.accountId))];
  const [lots, users] = await Promise.all([
    lotIds.length
      ? prisma.coffeeLot.findMany({
          where: { id: { in: lotIds }, publishedAt: { not: null } },
          select: { id: true, slug: true, nameAr: true, roaster: { select: { nameAr: true } } },
        })
      : Promise.resolve([]),
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }),
  ]);
  const lotById = new Map(lots.map((l) => [l.id, { slug: l.slug, nameAr: l.nameAr, roasterNameAr: l.roaster?.nameAr ?? "" }]));
  const nameById = new Map(users.map((u) => [u.id, u.name?.trim() || "مستخدم"]));
  return rows.map((r) =>
    mapRecipe(r, viewerId, r.lotId ? lotById.get(r.lotId) ?? null : null, nameById.get(r.accountId) ?? "مستخدم"),
  );
}

async function lotIdForSlug(prisma: PrismaClient, slug: string): Promise<string> {
  const lot = await prisma.coffeeLot.findFirst({ where: { slug, publishedAt: { not: null } }, select: { id: true } });
  if (!lot) throw ApiError.unprocessable("lot_not_found");
  return lot.id;
}

export async function listMyRecipes(prisma: PrismaClient, accountId: string): Promise<MobileRecipe[]> {
  const rows = await prisma.mobileRecipe.findMany({
    where: { accountId, state: { not: "deleted" } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
  return present(prisma, rows as RecipeRow[], accountId);
}

/** Published recipes from everyone, newest first; optionally only those for one lot. */
export async function exploreRecipes(
  prisma: PrismaClient, viewerId: string | null, lotSlug?: string | null,
): Promise<MobileRecipe[]> {
  const lotId = lotSlug ? await lotIdForSlug(prisma, lotSlug) : undefined;
  const rows = await prisma.mobileRecipe.findMany({
    where: { state: "published", ...(lotId ? { lotId } : {}) },
    orderBy: { publishedAt: "desc" },
    take: 50,
  });
  return present(prisma, rows as RecipeRow[], viewerId);
}

/** Create, or edit by clientId (bumps version). `publish` also publishes a draft. */
export async function saveRecipe(prisma: PrismaClient, accountId: string, input: RecipeUpsert): Promise<MobileRecipe> {
  const lotId = input.lotSlug ? await lotIdForSlug(prisma, input.lotSlug) : null;
  const steps = input.steps.map((s) => ({
    kind: s.kind, addedWaterGrams: s.addedWaterGrams ?? null, seconds: s.seconds ?? null, note: s.note.trim(),
  }));
  const fields = {
    lotId,
    title: input.title.trim(),
    methodCode: input.methodCode,
    temperature: input.temperature,
    doseGrams: input.doseGrams ?? null,
    hotWaterGrams: input.hotWaterGrams ?? null,
    iceGrams: input.iceGrams ?? null,
    yieldGrams: input.yieldGrams ?? null,
    waterTempC: input.waterTempC ?? null,
    grinder: input.grinder.trim(),
    grindSetting: input.grindSetting.trim(),
    notes: input.notes.trim(),
    steps,
  };
  const problems = validateRecipe(fields);

  const existing = await prisma.mobileRecipe.findUnique({
    where: { accountId_clientId: { accountId, clientId: input.clientId } },
  });

  let row;
  if (!existing) {
    let source: { sourceId: string; sourceVersion: number } | null = null;
    if (input.sourceId) {
      const original = await prisma.mobileRecipe.findUnique({ where: { id: input.sourceId } });
      const visible = original && (original.state === "published" || original.accountId === accountId);
      if (!visible) throw ApiError.unprocessable("source_not_found");
      source = { sourceId: original.id, sourceVersion: original.version };
    }
    if (input.publish && problems.length) throw notPublishable(problems);
    row = await prisma.mobileRecipe.create({
      data: {
        accountId, clientId: input.clientId, ...fields, ...(source ?? {}),
        state: input.publish ? "published" : "draft",
        publishedAt: input.publish ? new Date() : null,
      },
    });
  } else {
    const from = existing.state as RecipeState;
    if (from === "deleted") throw ApiError.conflict("recipe_deleted");
    const publishing = input.publish && canTransition(from, "published");
    // A published recipe must stay valid; drafts may be saved incomplete.
    if ((publishing || from === "published") && problems.length) throw notPublishable(problems);
    row = await prisma.mobileRecipe.update({
      where: { id: existing.id },
      data: {
        ...fields,
        version: { increment: 1 },
        revision: { increment: 1 },
        ...(publishing ? { state: "published", publishedAt: new Date() } : {}),
      },
    });
  }
  const [mapped] = await present(prisma, [row as RecipeRow], accountId);
  return mapped;
}

export async function changeRecipeState(
  prisma: PrismaClient, accountId: string, id: string, to: RecipeState,
): Promise<MobileRecipe> {
  const existing = await prisma.mobileRecipe.findUnique({ where: { id } });
  // Someone else's recipe reads as missing, never as forbidden.
  if (!existing || existing.accountId !== accountId) throw ApiError.unprocessable("recipe_not_found");
  if (!canTransition(existing.state as RecipeState, to)) throw ApiError.conflict("invalid_transition");
  if (to === "published") {
    const problems = validateRecipe({
      ...existing, steps: normalizeSteps(existing.steps),
    });
    if (problems.length) throw notPublishable(problems);
  }
  const row = await prisma.mobileRecipe.update({
    where: { id },
    data: {
      state: to,
      revision: { increment: 1 },
      ...(to === "published" ? { publishedAt: new Date() } : {}),
    },
  });
  const [mapped] = await present(prisma, [row as RecipeRow], accountId);
  return mapped;
}
