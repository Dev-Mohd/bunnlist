import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { approveSubmission, ApproveRequest, discovererName, rejectSubmission, requireAdmin, slugify } from "../admin";
import type { PhotoStore } from "../suggestionPhotos";

const approve: ApproveRequest = ApproveRequest.parse({
  nameAr: "سويت بلند", name: "Sweet Blend", roasterNameAr: "ثري بين", roasterName: "3 Bean Coffee Roastery",
  originCode: "et", originNameAr: "إثيوبيا", process: "WASHED", roastLevel: "medium", flavorNotes: ["شوكولاتة"],
});

function store(): PhotoStore & { publish: ReturnType<typeof vi.fn> } {
  return {
    put: vi.fn(), signedUrl: vi.fn(),
    publish: vi.fn().mockResolvedValue("https://x.supabase.co/storage/v1/object/public/coffee-images/lots/a.jpg"),
  };
}

function fakePrisma(opts: { status?: string; photoPath?: string | null; slugTaken?: string[] } = {}) {
  const taken = new Set(opts.slugTaken ?? []);
  const m = {
    mobileCoffeeSubmission: {
      findUnique: vi.fn().mockResolvedValue(
        opts.status === undefined ? { id: "s1", status: "PENDING", photoPath: opts.photoPath ?? "submissions/s1.jpg" }
          : { id: "s1", status: opts.status, photoPath: null }),
      update: vi.fn().mockResolvedValue({}),
      findFirst: vi.fn(),
    },
    originCountry: { findUnique: vi.fn().mockResolvedValue(null), create: vi.fn().mockResolvedValue({ id: "o1" }) },
    roaster: { findFirst: vi.fn().mockResolvedValue({ id: "r1" }), findUnique: vi.fn(), create: vi.fn() },
    coffeeLot: {
      findUnique: vi.fn().mockImplementation(({ where }: { where: { slug: string } }) => (taken.has(where.slug) ? { id: "x" } : null)),
      create: vi.fn().mockImplementation(({ data }: { data: { slug: string } }) => ({ id: "lot1", slug: data.slug })),
    },
    user: { findUnique: vi.fn(), findMany: vi.fn().mockResolvedValue([]) },
    mobileProfile: { findMany: vi.fn().mockResolvedValue([]) },
  };
  return { db: m as unknown as PrismaClient, m };
}

describe("slugify", () => {
  it("makes URL-safe slugs from Latin text", () => {
    expect(slugify("3 Bean Coffee Roastery Sweet Blend")).toBe("3-bean-coffee-roastery-sweet-blend");
    expect(slugify("Café Señor")).toBe("cafe-senor");
    expect(slugify("سويت بلند")).toBe("");
  });
});

describe("approveSubmission", () => {
  it("publishes the lot with the photo and links the suggestion", async () => {
    const { db, m: prisma } = fakePrisma({ slugTaken: ["3-bean-coffee-roastery-sweet-blend"] });
    const s = store();
    const result = await approveSubmission(db, s, "s1", approve);
    expect(result.lotSlug).toBe("3-bean-coffee-roastery-sweet-blend-2");
    expect(prisma.originCountry.create).toHaveBeenCalledWith({ data: { isoCode: "ET", nameAr: "إثيوبيا" } });
    const lot = prisma.coffeeLot.create.mock.calls[0][0].data;
    expect(lot.roastLevel).toBe("متوسط");
    expect(lot.imagePermissionStatus).toBe("APPROVED");
    expect(lot.publishedAt).toBeInstanceOf(Date);
    expect(s.publish).toHaveBeenCalledOnce();
    expect(prisma.mobileCoffeeSubmission.update.mock.calls[0][0].data).toMatchObject({ status: "APPROVED", approvedLotId: "lot1" });
  });

  it("publishes without an image when there is no photo", async () => {
    const { db, m: prisma } = fakePrisma({ photoPath: null });
    prisma.mobileCoffeeSubmission.findUnique.mockResolvedValue({ id: "s1", status: "PENDING", photoPath: null });
    const s = store();
    await approveSubmission(db, s, "s1", approve);
    expect(s.publish).not.toHaveBeenCalled();
    expect(prisma.coffeeLot.create.mock.calls[0][0].data.imageUrl).toBeUndefined();
  });

  it("refuses a suggestion that was already reviewed", async () => {
    await expect(approveSubmission(fakePrisma({ status: "APPROVED" }).db, store(), "s1", approve))
      .rejects.toMatchObject({ code: "conflict" });
    await expect(rejectSubmission(fakePrisma({ status: "REJECTED" }).db, "s1")).rejects.toMatchObject({ code: "conflict" });
  });
});

describe("requireAdmin", () => {
  it("lets only ADMIN accounts through", async () => {
    const { db, m: prisma } = fakePrisma();
    prisma.user.findUnique.mockResolvedValueOnce({ role: "ADMIN" });
    await expect(requireAdmin(db, "a")).resolves.toBeUndefined();
    prisma.user.findUnique.mockResolvedValueOnce({ role: "USER" });
    await expect(requireAdmin(db, "u")).rejects.toMatchObject({ code: "forbidden" });
  });
});

describe("discovererName", () => {
  it("names the author while the account exists", async () => {
    const { db, m: prisma } = fakePrisma();
    prisma.mobileCoffeeSubmission.findFirst.mockResolvedValue({ accountId: "u1" });
    prisma.user.findMany.mockResolvedValue([{ id: "u1", name: "محمد" }]);
    expect(await discovererName(db, "lot1")).toBe("محمد");
    prisma.mobileProfile.findMany.mockResolvedValue([{ accountId: "u1", username: "mohd" }]);
    expect(await discovererName(db, "lot1")).toBe("@mohd");
    prisma.mobileCoffeeSubmission.findFirst.mockResolvedValue(null);
    expect(await discovererName(db, "lot1")).toBeNull();
  });
});
