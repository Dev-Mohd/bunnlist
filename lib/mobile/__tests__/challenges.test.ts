import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { ChallengeInput, ChallengeUpdate, currentChallenge, lotMatches, progressByAccount } from "../challenges";

const challenge = {
  id: "ch1", titleAr: "جرّب قهوة يمنية", subtitleAr: null, emoji: "🇾🇪", action: "rate", originCode: "YE", process: null,
  roasterSlug: null, flavorFamily: null, target: 2, points: 50,
  startsAt: new Date("2026-11-01T00:00:00Z"), endsAt: new Date("2026-11-08T00:00:00Z"), createdBy: "admin", createdAt: new Date(),
};

describe("lotMatches", () => {
  const lot = { originCode: "YE", process: "NATURAL", roasterSlug: "shovel", flavorNotes: ["توت", "زبيب"] };
  it("checks every filter that is set", () => {
    expect(lotMatches({ originCode: "ye", process: null, roasterSlug: null, flavorFamily: null }, lot)).toBe(true);
    expect(lotMatches({ originCode: "ET", process: null, roasterSlug: null, flavorFamily: null }, lot)).toBe(false);
    expect(lotMatches({ originCode: null, process: "WASHED", roasterSlug: null, flavorFamily: null }, lot)).toBe(false);
    expect(lotMatches({ originCode: null, process: null, roasterSlug: "shovel", flavorFamily: "berry" }, lot)).toBe(true);
    expect(lotMatches({ originCode: null, process: null, roasterSlug: null, flavorFamily: "chocolate" }, lot)).toBe(false);
  });
});

describe("progressByAccount", () => {
  it("counts different coffees per person", () => {
    const p = progressByAccount([
      { accountId: "a", lotId: "1" }, { accountId: "a", lotId: "1" }, { accountId: "a", lotId: "2" }, { accountId: "b", lotId: "1" },
    ]);
    expect(p.get("a")).toBe(2);
    expect(p.get("b")).toBe(1);
  });
});

describe("ChallengeInput", () => {
  it("accepts a good challenge and refuses one that ends before it starts", () => {
    expect(ChallengeInput.safeParse({ titleAr: "تحدي", action: "brew", startsAt: "2026-11-01T00:00:00Z", endsAt: "2026-11-08T00:00:00Z" }).success).toBe(true);
    expect(ChallengeInput.safeParse({ titleAr: "تحدي", action: "brew", startsAt: "2026-11-08T00:00:00Z", endsAt: "2026-11-01T00:00:00Z" }).success).toBe(false);
    expect(ChallengeInput.safeParse({ titleAr: "تحدي", action: "dance", startsAt: "2026-11-01T00:00:00Z", endsAt: "2026-11-08T00:00:00Z" }).success).toBe(false);
  });
  it("leaves fields out of an edit untouched", () => {
    expect(ChallengeUpdate.parse({ titleAr: "جديد" })).toEqual({ titleAr: "جديد" });
  });
});

function fakePrisma(opts: { completed?: boolean } = {}) {
  const m = {
    mobileChallenge: { findFirst: vi.fn().mockResolvedValue(challenge) },
    coffeeLot: {
      findMany: vi.fn().mockResolvedValue([
        { id: "y1", process: "NATURAL", flavorNotes: [], originCountry: { isoCode: "YE" }, roaster: { slug: "r" } },
        { id: "y2", process: "WASHED", flavorNotes: [], originCountry: { isoCode: "YE" }, roaster: { slug: "r" } },
      ]),
    },
    review: {
      findMany: vi.fn().mockResolvedValue([
        { userId: "me", coffeeLotId: "y1" }, { userId: "me", coffeeLotId: "y2" }, { userId: "other", coffeeLotId: "y1" },
      ]),
    },
    mobileChallengeCompletion: {
      findUnique: vi.fn().mockResolvedValue(opts.completed ? { challengeId: "ch1" } : null),
      create: vi.fn().mockResolvedValue({}),
      count: vi.fn().mockResolvedValue(1),
    },
    mobilePointEvent: { create: vi.fn().mockResolvedValue({}), count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) },
  };
  return { db: m as unknown as PrismaClient, m };
}

describe("currentChallenge", () => {
  const now = new Date("2026-11-03T10:00:00Z");

  it("counts joiners and finishes the caller once, paying the challenge's points", async () => {
    const { db, m } = fakePrisma();
    const state = await currentChallenge(db, "me", now);
    expect(state.challenge?.filters.originCode).toBe("YE");
    expect(state.participants).toBe(2);
    expect(state.me).toEqual({ progress: 2, completed: true, justCompleted: true });
    expect(m.mobileChallengeCompletion.create).toHaveBeenCalledWith({ data: { challengeId: "ch1", accountId: "me" } });
    const reward = m.mobilePointEvent.create.mock.calls.find((c) => c[0].data.kind === "challenge");
    expect(reward?.[0].data).toMatchObject({ accountId: "me", refId: "ch1", points: 50 });
  });

  it("doesn't pay again when already finished", async () => {
    const { db, m } = fakePrisma({ completed: true });
    const state = await currentChallenge(db, "me", now);
    expect(state.me?.justCompleted).toBe(false);
    expect(m.mobileChallengeCompletion.create).not.toHaveBeenCalled();
  });

  it("shows no progress to a guest and nothing when no challenge runs", async () => {
    const { db } = fakePrisma();
    expect((await currentChallenge(db, null, now)).me).toBeNull();
    const { db: empty, m } = fakePrisma();
    m.mobileChallenge.findFirst.mockResolvedValue(null);
    expect(await currentChallenge(empty, "me", now)).toEqual({ challenge: null, participants: 0, finished: 0, me: null });
  });
});
