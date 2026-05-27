import { prisma } from "@/lib/prisma";

function getLimit() {
  const limitArg = process.argv.find((arg) => arg.startsWith("--limit="))?.split("=")[1];
  const parsed = Number(limitArg ?? 30);
  if (!Number.isFinite(parsed) || parsed < 1) return 30;
  return Math.min(Math.floor(parsed), 100);
}

async function main() {
  const lots = await prisma.coffeeLot.findMany({
    where: {
      OR: [
        { imageUrl: { not: null } },
        { imagePath: { not: null } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: getLimit(),
    select: {
      slug: true,
      name: true,
      nameAr: true,
      imageUrl: true,
      imagePath: true,
      storedImageUrl: true,
      imagePermissionStatus: true,
      roaster: {
        select: {
          name: true,
          nameAr: true,
        },
      },
      originCountry: {
        select: {
          nameAr: true,
          nameEn: true,
          isoCode: true,
        },
      },
    },
  });

  console.table(
    lots.map((lot) => ({
      slug: lot.slug,
      nameAr: lot.nameAr,
      name: lot.name,
      roastery: lot.roaster.nameAr ?? lot.roaster.name,
      country: lot.originCountry.nameAr ?? lot.originCountry.nameEn ?? lot.originCountry.isoCode,
      imageUrl: lot.imageUrl,
      imagePath: lot.imagePath,
      storedImageUrl: lot.storedImageUrl,
      imagePermissionStatus: lot.imagePermissionStatus,
    })),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
