import type { PrismaClient } from "@prisma/client";
import type { RefreshFamilyState } from "./tokens";
import type { SessionStore, StoredSession } from "./ports";

// Prisma-backed SessionStore. A MobileSession row is one refresh-token family:
// only the current hash and the consumed hashes are stored — never the plaintext
// refresh token. Mapping is split into pure functions so it is unit-testable
// without a database.

export interface MobileSessionRow {
  id: string;
  accountId: string;
  deviceId: string;
  currentHash: string;
  issuedAt: Date;
  consumedHashes: string[];
  revoked: boolean;
}

export function rowToSession(row: MobileSessionRow): StoredSession {
  return {
    sessionId: row.id,
    accountId: row.accountId,
    deviceId: row.deviceId,
    family: {
      currentHash: row.currentHash,
      issuedAt: row.issuedAt.getTime(),
      consumedHashes: row.consumedHashes,
      revoked: row.revoked,
    },
  };
}

export function familyToRow(family: RefreshFamilyState): {
  currentHash: string;
  issuedAt: Date;
  consumedHashes: string[];
  revoked: boolean;
} {
  return {
    currentHash: family.currentHash,
    issuedAt: new Date(family.issuedAt),
    consumedHashes: family.consumedHashes,
    revoked: family.revoked,
  };
}

export function createPrismaSessionStore(prisma: PrismaClient): SessionStore {
  return {
    async create(session: StoredSession): Promise<void> {
      await prisma.mobileSession.create({
        data: {
          id: session.sessionId,
          accountId: session.accountId,
          deviceId: session.deviceId,
          ...familyToRow(session.family),
        },
      });
    },
    async get(sessionId: string): Promise<StoredSession | undefined> {
      const row = await prisma.mobileSession.findUnique({ where: { id: sessionId } });
      return row ? rowToSession(row) : undefined;
    },
    async save(session: StoredSession): Promise<void> {
      await prisma.mobileSession.update({
        where: { id: session.sessionId },
        data: familyToRow(session.family),
      });
    },
  };
}
