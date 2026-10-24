import type { PrismaClient } from "@prisma/client";
import type { AccountDeletionStore } from "./accountService";

// Prisma-backed account-deletion store. Reads any Apple refresh tokens held for
// the account (none are stored yet — the current Sign in with Apple flow sends an
// identity token, not an auth code — but this is ready for when they are), and
// purges all of the account's data in one transaction. Deleting the User cascades
// to Account/Session/Review via the schema's onDelete: Cascade; the mobile-only
// tables (no FK to User) are deleted explicitly.

export function createPrismaAccountDeletionStore(prisma: PrismaClient): AccountDeletionStore {
  return {
    async appleRefreshTokens(accountId: string): Promise<string[]> {
      const rows = await prisma.account.findMany({
        where: { userId: accountId, provider: "apple" },
        select: { refresh_token: true },
      });
      return rows.map((r) => r.refresh_token).filter((t): t is string => !!t);
    },

    async purge(accountId: string): Promise<void> {
      const user = await prisma.user.findUnique({ where: { id: accountId }, select: { email: true } });

      await prisma.$transaction(async (tx) => {
        await tx.mobileSession.deleteMany({ where: { accountId } });
        await tx.mobileIdempotency.deleteMany({ where: { ownerId: accountId } });
        // Mobile content has no FK to User, so purge it explicitly.
        await tx.mobileBrewExperience.deleteMany({ where: { accountId } });
        await tx.mobileCollectionEntry.deleteMany({ where: { accountId } });
        await tx.mobileCoffeeSubmission.deleteMany({ where: { accountId } });
        if (user?.email) {
          await tx.mobileEmailOtp.deleteMany({ where: { email: user.email } });
        }
        // Cascades to Account, Session, Review, etc.
        await tx.user.delete({ where: { id: accountId } });
      });
    },
  };
}
