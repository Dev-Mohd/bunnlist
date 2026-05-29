import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createMissingDatabaseClient() {
  return new Proxy({} as PrismaClient, {
    get() {
      throw new Error("DATABASE_URL is required to use Prisma.");
    },
  });
}

export const prisma =
  globalForPrisma.prisma ??
  (connectionString
    ? new PrismaClient({
        adapter: new PrismaPg(
          new Pool({
            connectionString,
            ssl: { rejectUnauthorized: false },
          }),
        ),
      })
    : createMissingDatabaseClient());

if (process.env.NODE_ENV !== "production" && connectionString) {
  globalForPrisma.prisma = prisma;
}
