import { describe, it, expect } from "vitest";
import { average, MobileReviewRequest } from "../reviews";

describe("average", () => {
  it("returns 0 for no ratings", () => {
    expect(average([])).toBe(0);
  });
  it("rounds to two decimals", () => {
    expect(average([5, 4, 4])).toBe(4.33);
    expect(average([5, 4])).toBe(4.5);
  });
});

describe("MobileReviewRequest", () => {
  it("accepts a valid review", () => {
    const r = MobileReviewRequest.safeParse({ rating: 4, brewMethod: "V60", wouldBuyAgain: true, body: "لذيذ" });
    expect(r.success).toBe(true);
  });
  it("rejects an out-of-range rating", () => {
    expect(MobileReviewRequest.safeParse({ rating: 6, brewMethod: "V60", wouldBuyAgain: true }).success).toBe(false);
    expect(MobileReviewRequest.safeParse({ rating: 0, brewMethod: "V60", wouldBuyAgain: true }).success).toBe(false);
  });
  it("rejects an unknown brew method", () => {
    expect(MobileReviewRequest.safeParse({ rating: 4, brewMethod: "POUR", wouldBuyAgain: true }).success).toBe(false);
  });
  it("rejects a too-long body", () => {
    expect(MobileReviewRequest.safeParse({ rating: 4, brewMethod: "V60", wouldBuyAgain: true, body: "x".repeat(501) }).success).toBe(false);
  });
});
