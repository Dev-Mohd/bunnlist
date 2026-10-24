import { describe, it, expect } from "vitest";
import { canTransition, ExperienceUpsert, ExperienceStateChange, mapExperience } from "../experiences";

describe("canTransition", () => {
  it("follows draft -> published <-> unpublished", () => {
    expect(canTransition("draft", "published")).toBe(true);
    expect(canTransition("published", "unpublished")).toBe(true);
    expect(canTransition("unpublished", "published")).toBe(true);
  });
  it("rejects skipping or reversing to draft", () => {
    expect(canTransition("draft", "unpublished")).toBe(false);
    expect(canTransition("published", "draft")).toBe(false);
    expect(canTransition("unpublished", "draft")).toBe(false);
  });
  it("allows delete from any live state and nothing out of deleted", () => {
    for (const s of ["draft", "published", "unpublished"] as const) expect(canTransition(s, "deleted")).toBe(true);
    for (const s of ["draft", "published", "unpublished", "deleted"] as const) expect(canTransition("deleted", s)).toBe(false);
  });
  it("treats a no-op as not a transition", () => {
    expect(canTransition("published", "published")).toBe(false);
  });
});

describe("ExperienceUpsert", () => {
  const valid = { clientId: "c1", methodCode: "V60", stars: 4, brewedAt: "2026-10-24T08:00:00Z" };
  it("accepts a minimal experience and defaults note/publish", () => {
    const r = ExperienceUpsert.parse(valid);
    expect(r.note).toBe("");
    expect(r.publish).toBe(false);
  });
  it("rejects out-of-range stars, unknown methods and bad dates", () => {
    expect(ExperienceUpsert.safeParse({ ...valid, stars: 0 }).success).toBe(false);
    expect(ExperienceUpsert.safeParse({ ...valid, stars: 6 }).success).toBe(false);
    expect(ExperienceUpsert.safeParse({ ...valid, stars: 3.5 }).success).toBe(false);
    expect(ExperienceUpsert.safeParse({ ...valid, methodCode: "MOKA" }).success).toBe(false);
    expect(ExperienceUpsert.safeParse({ ...valid, brewedAt: "yesterday" }).success).toBe(false);
    expect(ExperienceUpsert.safeParse({ ...valid, note: "x".repeat(2001) }).success).toBe(false);
  });
  it("accepts a timezone offset in brewedAt", () => {
    expect(ExperienceUpsert.safeParse({ ...valid, brewedAt: "2026-10-24T11:00:00+03:00" }).success).toBe(true);
  });
});

describe("ExperienceStateChange", () => {
  it("accepts only known states", () => {
    expect(ExperienceStateChange.safeParse({ state: "published" }).success).toBe(true);
    expect(ExperienceStateChange.safeParse({ state: "hidden" }).success).toBe(false);
  });
});

describe("mapExperience", () => {
  it("serializes dates and hides account/lot ids", () => {
    const out = mapExperience({
      id: "e1", clientId: "c1", lotId: "l1", accountId: "a1", methodCode: "V60", stars: 5,
      brewedAt: new Date("2026-10-24T08:00:00Z"), note: "حلو", state: "draft", revision: 0,
      updatedAt: new Date("2026-10-24T09:00:00Z"),
    });
    expect(out).toEqual({
      id: "e1", clientId: "c1", methodCode: "V60", stars: 5, brewedAt: "2026-10-24T08:00:00.000Z",
      note: "حلو", state: "draft", revision: 0, updatedAt: "2026-10-24T09:00:00.000Z",
    });
  });
});
