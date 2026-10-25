import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { checkUsername, displayNames, normalizeUsername, setUsername, usernameProblem } from "../profile";

describe("usernames", () => {
  it("normalizes a leading @ and case", () => {
    expect(normalizeUsername("  @Mohd_Coffee ")).toBe("mohd_coffee");
  });
  it("enforces the format", () => {
    expect(usernameProblem("mohd")).toBeNull();
    expect(usernameProblem("m.coffee_1")).toBeNull();
    expect(usernameProblem("mo")).toBe("too_short");
    expect(usernameProblem("a".repeat(21))).toBe("too_long");
    expect(usernameProblem("1mohd")).toBe("must_start_with_letter");
    expect(usernameProblem("محمد")).toBe("must_start_with_letter");
    expect(usernameProblem("mo hd")).toBe("invalid_chars");
    expect(usernameProblem("mo..hd")).toBe("invalid_chars");
    expect(usernameProblem("mohd.")).toBe("invalid_chars");
    expect(usernameProblem("admin")).toBe("reserved");
  });
});

function fakePrisma(owner: string | null) {
  const m = {
    mobileProfile: {
      findUnique: vi.fn().mockResolvedValue(owner ? { accountId: owner } : null),
      upsert: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([{ accountId: "a1", username: "mohd" }]),
    },
    user: { findMany: vi.fn().mockResolvedValue([{ id: "a1", name: "محمد" }, { id: "a2", name: null }]) },
  };
  return { db: m as unknown as PrismaClient, m };
}

describe("claiming", () => {
  it("reports taken names and lets the owner keep theirs", async () => {
    expect((await checkUsername(fakePrisma("other").db, "me", "Mohd")).problem).toBe("taken");
    expect((await checkUsername(fakePrisma("me").db, "me", "mohd")).available).toBe(true);
  });
  it("saves a valid free name and refuses taken or invalid ones", async () => {
    const { db, m } = fakePrisma(null);
    await expect(setUsername(db, "me", "@Mohd")).resolves.toEqual({ username: "mohd" });
    expect(m.mobileProfile.upsert).toHaveBeenCalledOnce();
    await expect(setUsername(fakePrisma("other").db, "me", "mohd")).rejects.toMatchObject({ code: "conflict" });
    await expect(setUsername(fakePrisma(null).db, "me", "x")).rejects.toMatchObject({ code: "unprocessable" });
  });
});

describe("displayNames", () => {
  it("prefers @username, then the account name, then a generic label", async () => {
    const names = await displayNames(fakePrisma(null).db, ["a1", "a2", "gone"]);
    expect(names.get("a1")).toBe("@mohd");
    expect(names.get("a2")).toBe("مستخدم");
    expect(names.has("gone")).toBe(false);
  });
});
