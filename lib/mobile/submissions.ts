import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

// User-submitted coffee suggestions from the app (pending review). Names come in
// Arabic (name, roasterName) and, optionally, as printed in Latin script (nameEn,
// roasterNameEn). Text only for now; image upload is a later step.

export const SUBMISSION_PROCESSES = [
  "NATURAL", "WASHED", "HONEY", "ANAEROBIC", "WET_HULLED", "CARBONIC_MACERATION", "EXPERIMENTAL", "OTHER",
] as const;

export const SubmissionRequest = z.object({
  name: z.string().trim().min(2).max(120),
  roasterName: z.string().trim().min(2).max(120),
  nameEn: z.string().trim().max(120).optional(),
  roasterNameEn: z.string().trim().max(120).optional(),
  originName: z.string().trim().max(80).optional(),
  process: z.enum(SUBMISSION_PROCESSES).optional(),
  roastLevel: z.enum(["light", "medium", "dark"]).optional(),
  flavorNotes: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  note: z.string().trim().max(1000).optional(),
});
export type SubmissionRequest = z.infer<typeof SubmissionRequest>;

export async function createSubmission(
  prisma: PrismaClient,
  accountId: string,
  input: SubmissionRequest,
): Promise<{ id: string }> {
  const data = SubmissionRequest.parse(input);
  const row = await prisma.mobileCoffeeSubmission.create({
    data: {
      accountId,
      name: data.name,
      roasterName: data.roasterName,
      originName: data.originName || null,
      nameEn: data.nameEn || null,
      roasterNameEn: data.roasterNameEn || null,
      process: data.process ?? null,
      roastLevel: data.roastLevel ?? null,
      flavorNotes: data.flavorNotes ?? [],
      note: data.note || null,
    },
    select: { id: true },
  });
  return { id: row.id };
}
