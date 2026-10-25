import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { ProfileUpdate, suggestUsername, usernameSeed, displayNames } from "../profile";
import { setAvatar, removeAvatar, type AvatarStore } from "../avatars";

const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(200, 1)]).toString("base64");

function fakePrisma(opts: { taken?: string[]; avatarPath?: string | null; user?: { name: string | null; email: string | null } } = {}) {
  const taken = new Set(opts.taken ?? []);
  const m = {
    mobileProfile: {
      findUnique: vi.fn().mockImplementation(({ where }: { where: { username?: string; accountId?: string } }) => {
        if (where.username !== undefined) return taken.has(where.username) ? { accountId: "other" } : null;
        return { avatarPath: opts.avatarPath ?? null, username: "mohd", displayName: null, bio: null, onboardedAt: null };
      }),
      upsert: vi.fn().mockResolvedValue({}),
      update: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([{ accountId: "a1", username: null, displayName: "محمد" }]),
    },
    user: {
      findUnique: vi.fn().mockResolvedValue(opts.user ?? { name: "Mohd", email: "devmohd@gmail.com" }),
      findMany: vi.fn().mockResolvedValue([]),
    },
  };
  return { db: m as unknown as PrismaClient, m };
}

describe("usernameSeed", () => {
  it("builds a Latin seed from the name, then the email, then a default", () => {
    expect(usernameSeed("Mohammed Ali", "x@y.com")).toBe("mohammed_ali");
    expect(usernameSeed("محمد", "devmohd1413@gmail.com")).toBe("devmohd1413");
    expect(usernameSeed(null, "k8x2@privaterelay.appleid.com")).toBe("coffee");
    expect(usernameSeed("محمد", null)).toBe("coffee");
  });
});

describe("suggestUsername", () => {
  it("returns the seed when free, else adds digits", async () => {
    expect(await suggestUsername(fakePrisma().db, "me")).toEqual({ username: "mohd" });
    const result = await suggestUsername(fakePrisma({ taken: ["mohd"] }).db, "me", () => 0.42);
    expect(result.username).toBe("mohd42");
  });
});

describe("ProfileUpdate", () => {
  it("bounds the display name and bio", () => {
    expect(ProfileUpdate.safeParse({ displayName: "Mohd", bio: "قهوة كل يوم" }).success).toBe(true);
    expect(ProfileUpdate.safeParse({ displayName: "" }).success).toBe(false);
    expect(ProfileUpdate.safeParse({ bio: "x".repeat(161) }).success).toBe(false);
  });
});

describe("displayNames", () => {
  it("falls back to the display name when there is no username", async () => {
    expect((await displayNames(fakePrisma().db, ["a1"])).get("a1")).toBe("محمد");
  });
});

describe("avatars", () => {
  const store = (): AvatarStore & { put: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> } =>
    ({ put: vi.fn().mockResolvedValue(undefined), remove: vi.fn().mockResolvedValue(undefined) });

  it("uploads under a new name and removes the previous picture", async () => {
    const { db, m } = fakePrisma({ avatarPath: "me/old.jpg" });
    const s = store();
    await setAvatar(db, s, "me", jpeg, 1000);
    expect(s.put).toHaveBeenCalledWith("me/rs.jpg", expect.any(Buffer));
    expect(m.mobileProfile.upsert.mock.calls[0][0].update).toEqual({ avatarPath: "me/rs.jpg" });
    expect(s.remove).toHaveBeenCalledWith("me/old.jpg");
  });

  it("refuses without storage and removes on request", async () => {
    await expect(setAvatar(fakePrisma().db, null, "me", jpeg)).rejects.toMatchObject({ code: "forbidden" });
    const { db, m } = fakePrisma({ avatarPath: "me/a.jpg" });
    const s = store();
    await removeAvatar(db, s, "me");
    expect(m.mobileProfile.update).toHaveBeenCalled();
    expect(s.remove).toHaveBeenCalledWith("me/a.jpg");
  });
});
