import { prisma } from "@/lib/prisma";

const RETENTION_DAYS = 7;
const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

async function main() {
  const result = await prisma.rateLimitEvent.deleteMany({
    where: {
      createdAt: { lt: cutoff },
    },
  });

  console.log(`Deleted ${result.count} rate limit events older than ${RETENTION_DAYS} days.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
