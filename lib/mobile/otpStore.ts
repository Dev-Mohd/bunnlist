import type { PrismaClient } from "@prisma/client";
import type { OtpRecord } from "./emailOtp";
import type { OtpStore } from "./emailService";

// Prisma-backed OtpStore for the email login flow. One row per email (the email
// is the primary key), upserted on each fresh request. Pure row<->record mappers
// are split out for unit testing.

export interface MobileEmailOtpRow {
  email: string;
  codeHash: string;
  expiresAt: Date;
  attempts: number;
  lastSentAt: Date;
}

export function rowToRecord(row: MobileEmailOtpRow): OtpRecord {
  return {
    email: row.email,
    codeHash: row.codeHash,
    expiresAt: row.expiresAt.getTime(),
    attempts: row.attempts,
    lastSentAt: row.lastSentAt.getTime(),
  };
}

export function createPrismaOtpStore(prisma: PrismaClient): OtpStore {
  return {
    async get(email: string): Promise<OtpRecord | undefined> {
      const row = await prisma.mobileEmailOtp.findUnique({ where: { email } });
      return row ? rowToRecord(row) : undefined;
    },
    async upsert(record: OtpRecord): Promise<void> {
      const data = {
        codeHash: record.codeHash,
        expiresAt: new Date(record.expiresAt),
        attempts: record.attempts,
        lastSentAt: new Date(record.lastSentAt),
      };
      await prisma.mobileEmailOtp.upsert({
        where: { email: record.email },
        create: { email: record.email, ...data },
        update: data,
      });
    },
    async incrementAttempts(email: string): Promise<void> {
      await prisma.mobileEmailOtp.update({
        where: { email },
        data: { attempts: { increment: 1 } },
      });
    },
    async delete(email: string): Promise<void> {
      await prisma.mobileEmailOtp.deleteMany({ where: { email } });
    },
  };
}
