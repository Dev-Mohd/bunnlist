import type { PrismaClient } from "@prisma/client";
import { z } from "zod";

// User-submitted coffee suggestions from the app (pending review). Text only for
// now; image upload is a later step.

export const SubmissionRequest = z.object({
  name: z.string().trim().min(2).max(120),
  roasterName: z.string().trim().min(2).max(120),
  originName: z.string().trim().max(80).optional(),
  note: z.string().trim().max(500).optional(),
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
      originName: data.originName ?? null,
      note: data.note ?? null,
    },
    select: { id: true },
  });
  return { id: row.id };
}
