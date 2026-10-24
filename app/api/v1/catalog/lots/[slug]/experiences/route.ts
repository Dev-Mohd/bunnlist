import { prisma } from "@/lib/prisma";
import { authenticate } from "@/lib/mobile/authGuard";
import { requireAccessSecret } from "@/lib/mobile/deps";
import { handle, readJson } from "@/lib/mobile/respond";
import { parseBody } from "@/lib/mobile/schemas";
import { ExperienceUpsert, listMyExperiences, saveExperience } from "@/lib/mobile/experiences";

// The caller's brew experiences for one lot.
//   GET  /api/v1/catalog/lots/[slug]/experiences — non-deleted, newest brew first
//   POST /api/v1/catalog/lots/[slug]/experiences — create or edit by clientId
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    return { experiences: await listMyExperiences(prisma, accountId, slug) };
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return handle(async () => {
    const accountId = await authenticate(req, requireAccessSecret());
    const input = parseBody(ExperienceUpsert, await readJson(req));
    return saveExperience(prisma, accountId, slug, input);
  });
}
