import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { ApiError } from "./errors";
import { SUBMISSION_PROCESSES } from "./submissions";

// Editing many coffees at once from the review queue (one origin, process or roast
// for a roaster's whole lot), and a roaster's English name, set once for all its
// coffees. Edits to waiting suggestions are remembered in their extras, so a later
// batch import doesn't put the old values back.

export const ADMIN_EXTRAS = ["adminEdited", "photoEdited", "photoCutFailed", "originalPhotoPath"] as const;
const ROAST_AR: Record<string, string> = { light: "فاتح", medium: "متوسط", dark: "غامق" };

export const BulkEditRequest = z.object({
  kind: z.enum(["submission", "lot"]),
  ids: z.array(z.string().min(1)).min(1).max(200),
  set: z.object({
    originCode: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((v) => v.toUpperCase()).optional(),
    originNameAr: z.string().trim().min(2).max(60).optional(),
    process: z.enum(SUBMISSION_PROCESSES).optional(),
    roastLevel: z.enum(["light", "medium", "dark"]).optional(),
    /** Added to each coffee's notes (kept once, up to 12). */
    addNotes: z.array(z.string().trim().min(1).max(40)).max(6).optional(),
  }).refine((s) => Object.values(s).some((v) => v !== undefined), "nothing_to_set")
    .refine((s) => !s.originCode || !!s.originNameAr, "origin_needs_name"),
});
export type BulkEditRequest = z.infer<typeof BulkEditRequest>;

type Extras = Record<string, unknown>;
const asExtras = (v: Prisma.JsonValue | null): Extras => (v && typeof v === "object" && !Array.isArray(v) ? { ...(v as Extras) } : {});

/** The suggestion fields an admin set by hand (the import leaves them). */
export function adminEdited(extras: Prisma.JsonValue | null | unknown): string[] {
  const v = asExtras(extras as Prisma.JsonValue)["adminEdited"];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

const withEdited = (extras: Prisma.JsonValue | null, fields: string[]): Prisma.InputJsonValue =>
  ({ ...asExtras(extras), adminEdited: [...new Set([...adminEdited(extras), ...fields])] }) as Prisma.InputJsonValue;

const mergeNotes = (have: string[], add: string[] | undefined) => (add ? [...new Set([...have, ...add])].slice(0, 12) : have);

export async function bulkEdit(prisma: PrismaClient, req: BulkEditRequest): Promise<{ updated: number }> {
  const { set } = req;
  if (req.kind === "submission") {
    const rows = await prisma.mobileCoffeeSubmission.findMany({
      where: { id: { in: req.ids }, status: "PENDING" }, select: { id: true, flavorNotes: true, extras: true },
    });
    const fields = [
      ...(set.originCode ? ["originName"] : []), ...(set.process ? ["process"] : []),
      ...(set.roastLevel ? ["roastLevel"] : []), ...(set.addNotes ? ["flavorNotes"] : []),
    ];
    await prisma.$transaction(rows.map((r) => prisma.mobileCoffeeSubmission.update({
      where: { id: r.id },
      data: {
        ...(set.originCode ? { originName: set.originNameAr } : {}),
        ...(set.process ? { process: set.process } : {}),
        ...(set.roastLevel ? { roastLevel: set.roastLevel } : {}),
        ...(set.addNotes ? { flavorNotes: mergeNotes(r.flavorNotes, set.addNotes) } : {}),
        extras: withEdited(r.extras, fields),
      },
    })));
    return { updated: rows.length };
  }
  let originCountryId: string | undefined;
  if (set.originCode) {
    const origin = await prisma.originCountry.findUnique({ where: { isoCode: set.originCode } })
      ?? await prisma.originCountry.create({ data: { isoCode: set.originCode, nameAr: set.originNameAr ?? set.originCode } });
    originCountryId = origin.id;
  }
  const lots = await prisma.coffeeLot.findMany({ where: { id: { in: req.ids } }, select: { id: true, flavorNotes: true } });
  await prisma.$transaction(lots.map((l) => prisma.coffeeLot.update({
    where: { id: l.id },
    data: {
      ...(originCountryId ? { originCountryId } : {}),
      ...(set.process ? { process: set.process } : {}),
      ...(set.roastLevel ? { roastLevel: ROAST_AR[set.roastLevel] } : {}),
      ...(set.addNotes ? { flavorNotes: mergeNotes(l.flavorNotes, set.addNotes) } : {}),
    },
  })));
  return { updated: lots.length };
}

export const RoasterNameRequest = z.object({
  roasterAr: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().min(2).max(120),
});

/**
 * Sets a roaster's English name everywhere at once: its published roaster record
 * (the slug stays, so links keep working) and every suggestion under it.
 */
export async function renameRoasterEn(
  prisma: PrismaClient, req: z.infer<typeof RoasterNameRequest>,
): Promise<{ roasters: number; suggestions: number }> {
  const roasters = await prisma.roaster.updateMany({ where: { nameAr: req.roasterAr }, data: { name: req.nameEn } });
  const rows = await prisma.mobileCoffeeSubmission.findMany({
    where: { roasterName: req.roasterAr, status: { in: ["PENDING", "APPROVED", "REJECTED"] } }, select: { id: true, status: true, extras: true },
  });
  if (rows.length === 0 && roasters.count === 0) throw ApiError.unprocessable("roaster_not_found");
  await prisma.$transaction(rows.map((r) => prisma.mobileCoffeeSubmission.update({
    where: { id: r.id },
    data: { roasterNameEn: req.nameEn, ...(r.status === "PENDING" ? { extras: withEdited(r.extras, ["roasterNameEn"]) } : {}) },
  })));
  return { roasters: roasters.count, suggestions: rows.length };
}
