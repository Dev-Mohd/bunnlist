import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { attachSuggestionPhoto, decodeJpeg, photoPath, type PhotoStore } from "../suggestionPhotos";

const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)]).toString("base64");
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47]), Buffer.alloc(200, 1)]).toString("base64");

function fakePrisma(submission: { accountId: string; status: string } | null) {
  return {
    mobileCoffeeSubmission: {
      findUnique: vi.fn().mockResolvedValue(submission && { id: "s1", ...submission }),
      update: vi.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaClient & { mobileCoffeeSubmission: { update: ReturnType<typeof vi.fn> } };
}

describe("decodeJpeg", () => {
  it("accepts JPEG bytes and rejects other formats or oversize files", () => {
    expect(decodeJpeg(jpeg).length).toBe(204);
    expect(() => decodeJpeg(png)).toThrow();
    const big = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(2 * 1024 * 1024)]).toString("base64");
    expect(() => decodeJpeg(big)).toThrow();
  });
});

describe("attachSuggestionPhoto", () => {
  const store = (): PhotoStore & { put: ReturnType<typeof vi.fn> } => ({ put: vi.fn().mockResolvedValue(undefined) });

  it("stores the photo for the author's pending suggestion", async () => {
    const prisma = fakePrisma({ accountId: "acc", status: "PENDING" });
    const s = store();
    const result = await attachSuggestionPhoto(prisma, s, "acc", "s1", jpeg);
    expect(result.photoPath).toBe(photoPath("s1"));
    expect(s.put).toHaveBeenCalledWith("submissions/s1.jpg", expect.any(Buffer));
    expect(prisma.mobileCoffeeSubmission.update).toHaveBeenCalledOnce();
  });

  it("hides other people's suggestions and refuses closed ones", async () => {
    await expect(attachSuggestionPhoto(fakePrisma({ accountId: "other", status: "PENDING" }), store(), "acc", "s1", jpeg))
      .rejects.toMatchObject({ code: "unprocessable" });
    await expect(attachSuggestionPhoto(fakePrisma(null), store(), "acc", "s1", jpeg))
      .rejects.toMatchObject({ code: "unprocessable" });
    await expect(attachSuggestionPhoto(fakePrisma({ accountId: "acc", status: "APPROVED" }), store(), "acc", "s1", jpeg))
      .rejects.toMatchObject({ code: "conflict" });
  });

  it("does not touch storage when the image is not a JPEG", async () => {
    const s = store();
    await expect(attachSuggestionPhoto(fakePrisma({ accountId: "acc", status: "PENDING" }), s, "acc", "s1", png)).rejects.toThrow();
    expect(s.put).not.toHaveBeenCalled();
  });
});
