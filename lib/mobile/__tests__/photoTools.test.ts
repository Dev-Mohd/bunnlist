import { describe, it, expect, vi } from "vitest";
import sharp from "sharp";
import type { PrismaClient } from "@prisma/client";
import { cutout, foregroundMask, photoTool } from "../photoTools";

/** A light backdrop with a near-white "bag": a rectangle only a faint outline sets apart. */
function bagOnWhite(w = 300, h = 300, backdrop = 246, bag = 250): Buffer {
  const px = Buffer.alloc(w * h * 3, backdrop);
  for (let y = 60; y < 240; y++) for (let x = 90; x < 210; x++) {
    const outline = y === 60 || y === 239 || x === 90 || x === 209;
    px.fill(outline ? 200 : bag, (y * w + x) * 3, (y * w + x) * 3 + 3);
    if (!outline && y > 120 && y < 150 && x > 110 && x < 190) px.fill(40, (y * w + x) * 3, (y * w + x) * 3 + 3);
  }
  return px;
}

describe("foregroundMask", () => {
  it("keeps a white bag whole on a white backdrop, outline and all", () => {
    const mask = foregroundMask(bagOnWhite(), 300, 300, 50);
    const inside = mask[150 * 300 + 100] + mask[70 * 300 + 150] + mask[230 * 300 + 200];
    expect(inside).toBe(3);
    expect(mask[10 * 300 + 10] + mask[280 * 300 + 280]).toBe(0);
    const share = mask.reduce((a, b) => a + b, 0) / (300 * 300);
    expect(share).toBeGreaterThan(0.22);
    expect(share).toBeLessThan(0.26);
  });
});

describe("cutout", () => {
  const jpeg = () => sharp(bagOnWhite(), { raw: { width: 300, height: 300, channels: 3 } }).jpeg({ quality: 95 }).toBuffer();

  it("centres the cut bag on a white 900 square", async () => {
    const r = await cutout(await jpeg(), { sensitivity: 50, removeBackground: true });
    const meta = await sharp(r.jpeg).metadata();
    expect([meta.width, meta.height]).toEqual([900, 900]);
    expect(r.warningAr).toBeNull();
    const { data } = await sharp(r.jpeg).raw().toBuffer({ resolveWithObject: true });
    expect(data[0]).toBeGreaterThan(250);
  });

  it("crops before cutting, and can keep the backdrop", async () => {
    const r = await cutout(await jpeg(), { sensitivity: 50, removeBackground: false, crop: { x: 0.25, y: 0.15, w: 0.5, h: 0.7 } });
    expect(r.foreground).toBe(1);
    expect((await sharp(r.jpeg).metadata()).width).toBe(900);
  });

  it("warns when nothing comes off a busy photo", async () => {
    const noise = Buffer.alloc(200 * 200 * 3);
    for (let i = 0; i < noise.length; i++) noise[i] = (i * 7919) % 251;
    const busy = await sharp(noise, { raw: { width: 200, height: 200, channels: 3 } }).jpeg().toBuffer();
    const r = await cutout(busy, { sensitivity: 50, removeBackground: true });
    expect(r.warningAr).not.toBeNull();
  });
});

describe("photoTool", () => {
  it("deletes a suggestion's photo, remembering the original, and restores it", async () => {
    let extras: Record<string, unknown> = { descriptionAr: "x" };
    let photoPath: string | null = "imports/a.jpg";
    const prisma = {
      mobileCoffeeSubmission: {
        findUnique: vi.fn(async () => ({ photoPath, extras })),
        update: vi.fn(async ({ data }: { data: { photoPath: string | null; extras: Record<string, unknown> } }) => {
          photoPath = data.photoPath; extras = data.extras;
        }),
      },
    } as unknown as PrismaClient;
    const store = { put: vi.fn(), publish: vi.fn(), signedUrl: vi.fn(async (p: string) => `https://s/${p}`) };
    await photoTool(prisma, store, { action: "delete", kind: "submission", id: "s1" });
    expect(photoPath).toBeNull();
    expect(extras).toMatchObject({ photoEdited: true, originalPhotoPath: "imports/a.jpg", descriptionAr: "x" });
    expect(await photoTool(prisma, store, { action: "restore", kind: "submission", id: "s1" })).toEqual({ imageUrl: "https://s/imports/a.jpg" });
    expect(photoPath).toBe("imports/a.jpg");
    expect(extras).toEqual({ descriptionAr: "x" });
  });
});
