import type { PrismaClient } from "@prisma/client";
import type { IdentityResolver, VerifiedIdentity } from "./ports";

// Resolves a verified identity to an app account using the existing User/Account
// tables, keyed strictly by (provider, subject). Invariants from the contract:
//   • Never merge accounts by email alone — a brand-new (provider, subject) always
//     becomes a new account, even if some other account shares the email.
//   • Apple private-relay addresses are never written as a user email.
//   • The app account id is the User id (what the access token's subject carries).
//
// User.email is unique for the website, so for an app-created account we only
// adopt the token email when it is a real address that no user already holds;
// otherwise the account is emailless and identified purely by its Account row.

const PRISMA_UNIQUE_VIOLATION = "P2002";

function accountType(provider: VerifiedIdentity["provider"]): string {
  return provider === "email" ? "email" : "oidc";
}

export function createPrismaIdentityResolver(prisma: PrismaClient): IdentityResolver {
  async function findAccount(provider: string, subject: string) {
    return prisma.account.findUnique({
      where: { provider_providerAccountId: { provider, providerAccountId: subject } },
    });
  }

  return {
    async resolve(identity: VerifiedIdentity): Promise<{ accountId: string; isNew: boolean }> {
      const { provider, subject } = identity;

      const existing = await findAccount(provider, subject);
      if (existing) return { accountId: existing.userId, isNew: false };

      // Adopt the email only if it is real and unclaimed; never a private relay.
      let email: string | null = null;
      if (identity.email && !identity.emailIsPrivateRelay) {
        const taken = await prisma.user.findUnique({ where: { email: identity.email } });
        if (!taken) email = identity.email;
      }

      try {
        const user = await prisma.user.create({
          data: {
            email,
            emailVerified: email ? new Date() : null,
            accounts: {
              create: { type: accountType(provider), provider, providerAccountId: subject },
            },
          },
        });
        return { accountId: user.id, isNew: true };
      } catch (err) {
        // A concurrent exchange created the same (provider, subject) first — adopt it.
        if (err && typeof err === "object" && "code" in err && err.code === PRISMA_UNIQUE_VIOLATION) {
          const raced = await findAccount(provider, subject);
          if (raced) return { accountId: raced.userId, isNew: false };
        }
        throw err;
      }
    },
  };
}
