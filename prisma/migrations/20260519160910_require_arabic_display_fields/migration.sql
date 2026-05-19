/*
  Warnings:

  - Made the column `nameAr` on table `CoffeeLot` required. This step will fail if there are existing NULL values in that column.
  - Made the column `nameAr` on table `Roaster` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "CoffeeProcess" ADD VALUE 'WET_HULLED';

-- AlterTable
ALTER TABLE "CoffeeLot" ADD COLUMN     "descriptionAr" TEXT,
ALTER COLUMN "nameAr" SET NOT NULL;

-- AlterTable
ALTER TABLE "Roaster" ADD COLUMN     "cityAr" TEXT,
ALTER COLUMN "nameAr" SET NOT NULL;
