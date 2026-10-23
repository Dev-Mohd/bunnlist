import { describe, it, expect } from "vitest";
import { mergeFlags, defaultFlags, CollectionUpdate } from "../collection";

describe("mergeFlags", () => {
  it("applies only the provided fields over the existing flags", () => {
    const existing = { owned: true, favorite: false, wantsToTry: true, tried: false };
    expect(mergeFlags(existing, { favorite: true, wantsToTry: false })).toEqual({
      owned: true, favorite: true, wantsToTry: false, tried: false,
    });
  });

  it("starts from all-false defaults when there is no existing entry", () => {
    expect(mergeFlags(undefined, { owned: true })).toEqual({
      owned: true, favorite: false, wantsToTry: false, tried: false,
    });
  });

  it("defaultFlags are all false", () => {
    expect(defaultFlags()).toEqual({ owned: false, favorite: false, wantsToTry: false, tried: false });
  });
});

describe("CollectionUpdate", () => {
  it("accepts a partial set of boolean flags", () => {
    expect(CollectionUpdate.safeParse({ owned: true }).success).toBe(true);
    expect(CollectionUpdate.safeParse({}).success).toBe(true);
    expect(CollectionUpdate.safeParse({ favorite: true, tried: false }).success).toBe(true);
  });
  it("rejects non-boolean values", () => {
    expect(CollectionUpdate.safeParse({ owned: "yes" }).success).toBe(false);
    expect(CollectionUpdate.safeParse({ unknown: true }).success).toBe(true); // extra keys ignored
  });
});
