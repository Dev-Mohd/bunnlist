import { RateLimitAction } from "@prisma/client";
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

export async function checkRateLimit(input: CheckRateLimitInput) {
  const config = LIMITS[input.action];
  const windowStart = new Date(Date.now() - config.windowMs);

  if (!input.userId && !input.ipHash) {
    throw new Error("Rate limit requires either userId or ipHash.");
  }

  const identityWhere = input.userId
    ? { userId: input.userId }
    : { ipHash: input.ipHash };

  return prisma.$transaction(async (tx) => {
    const attempts = await tx.rateLimitEvent.count({
      where: {
        action: input.action,
        createdAt: { gte: windowStart },
        ...identityWhere,
      },
    });

    if (attempts >= config.limit) {
      throw new RateLimitExceededError();
    }

    return tx.rateLimitEvent.create({
      data: {
        action: input.action,
        userId: input.userId ?? null,
        ipHash: input.ipHash ?? null,
        targetId: input.targetId ?? null,
      },
    });
  });
}
