import { describe, it, expect, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { createPrismaIdentityResolver } from "../resolver";
import type { VerifiedIdentity } from "../ports";

function fake(opts: { linked?: string; owner?: string } = {}) {
  const m = {
    account: {
      findUnique: vi.fn().mockResolvedValue(opts.linked ? { userId: opts.linked } : null),
      create: vi.fn().mockResolvedValue({}),
    },
    user: {
      findFirst: vi.fn().mockResolvedValue(opts.owner ? { id: opts.owner } : null),
      findUnique: vi.fn().mockResolvedValue(opts.owner ? { id: opts.owner } : null),
      create: vi.fn().mockResolvedValue({ id: "new" }),
    },
  };
  return { prisma: m as unknown as PrismaClient, m };
}

const google = (over: Partial<VerifiedIdentity> = {}): VerifiedIdentity => ({
  provider: "google", subject: "g-1", email: "Mo@Example.com", emailIsPrivateRelay: false, emailVerified: true, ...over,
});

describe("identity resolver", () => {
  it("returns the linked account for a known sign-in method", async () => {
    const { prisma, m } = fake({ linked: "u1", owner: "u9" });
    expect(await createPrismaIdentityResolver(prisma).resolve(google())).toEqual({ accountId: "u1", isNew: false });
    expect(m.account.create).not.toHaveBeenCalled();
  });

  it("joins a new method to the account that already holds the verified email", async () => {
    const { prisma, m } = fake({ owner: "u1" });
    expect(await createPrismaIdentityResolver(prisma).resolve(google())).toEqual({ accountId: "u1", isNew: false });
    expect(m.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { email: { equals: "mo@example.com", mode: "insensitive" } },
    }));
    expect(m.account.create).toHaveBeenCalledWith({
      data: { userId: "u1", type: "oidc", provider: "google", providerAccountId: "g-1" },
    });
    expect(m.user.create).not.toHaveBeenCalled();
  });

  it("never links on an unverified address or an Apple relay", async () => {
    for (const identity of [google({ emailVerified: false }), google({ provider: "apple", emailIsPrivateRelay: true })]) {
      const { prisma, m } = fake({ owner: "u1" });
      const r = await createPrismaIdentityResolver(prisma).resolve(identity);
      expect(r).toEqual({ accountId: "new", isNew: true });
      expect(m.account.create).not.toHaveBeenCalled();
      // The address is someone else's, so the new account doesn't take it.
      expect(m.user.create.mock.calls[0][0].data.email).toBeNull();
    }
  });

  it("starts a new account when nobody holds the address", async () => {
    const { prisma, m } = fake();
    expect(await createPrismaIdentityResolver(prisma).resolve(google({ email: "new@example.com" }))).toEqual({ accountId: "new", isNew: true });
    expect(m.user.create.mock.calls[0][0].data.email).toBe("new@example.com");
  });
});
