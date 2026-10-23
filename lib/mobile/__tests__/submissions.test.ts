import { describe, it, expect } from "vitest";
import { SubmissionRequest } from "../submissions";

describe("SubmissionRequest", () => {
  it("accepts a valid suggestion", () => {
    const r = SubmissionRequest.safeParse({ name: "يرجاتشيف", roasterName: "كامل ستيب", originName: "إثيوبيا", note: "لذيذة" });
    expect(r.success).toBe(true);
  });
  it("requires name and roaster (min length)", () => {
    expect(SubmissionRequest.safeParse({ name: "ي", roasterName: "كامل" }).success).toBe(false);
    expect(SubmissionRequest.safeParse({ name: "يرجاتشيف" }).success).toBe(false);
  });
  it("allows omitting the optional fields", () => {
    expect(SubmissionRequest.safeParse({ name: "يرجاتشيف", roasterName: "كامل ستيب" }).success).toBe(true);
  });
  it("rejects an over-long note", () => {
    expect(SubmissionRequest.safeParse({ name: "اسم", roasterName: "محمصة", note: "x".repeat(501) }).success).toBe(false);
  });
});
