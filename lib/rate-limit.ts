import { Prisma, RateLimitAction } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const TEN_MINUTES_MS = 10 * 60 * 1000;

const LIMITS: Record<RateLimitAction, { limit: number; windowMs: number }> = {
  CREATE_REVIEW: { limit: 3, windowMs: TEN_MINUTES_MS },
  UPDATE_REVIEW: { limit: 3, windowMs: TEN_MINUTES_MS },
  CREATE_COFFEE_LOT: { limit: 10, windowMs: TEN_MINUTES_MS },
};

export class RateLimitExceededError extends Error {
  constructor(message = "Too many attempts. Please try again later.") {
    super(message);
    this.name = "RateLimitExceededError";
  }
}

type CheckRateLimitInput = {
  action: RateLimitAction;
  userId?: string | null;
  ipHash?: string | null;
  targetId?: string | null;
};

type RateLimitClient = Prisma.TransactionClient | typeof prisma;

export async function checkRateLimit(
  input: CheckRateLimitInput,
  client: RateLimitClient = prisma,
): Promise<{ allowed: boolean; retryAfter?: number }> {
  const config = LIMITS[input.action];
  const now = Date.now();
  const windowStart = new Date(Date.now() - config.windowMs);

  if (!input.userId && !input.ipHash) {
    throw new Error("Rate limit requires either userId or ipHash.");
  }

  const identityWhere = input.userId
    ? { userId: input.userId }
    : { ipHash: input.ipHash };

  const attempts = await client.rateLimitEvent.findMany({
    where: {
      action: input.action,
      createdAt: { gte: windowStart },
      ...identityWhere,
    },
    select: { createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  if (attempts.length >= config.limit) {
    const oldestAttempt = attempts[0]?.createdAt.getTime() ?? now;
    return {
      allowed: false,
      retryAfter: Math.max(1, Math.ceil((oldestAttempt + config.windowMs - now) / 1000)),
    };
  }

  await client.rateLimitEvent.create({
    data: {
      action: input.action,
      userId: input.userId ?? null,
      ipHash: input.ipHash ?? null,
      targetId: input.targetId ?? null,
    },
  });

  return { allowed: true };
}
