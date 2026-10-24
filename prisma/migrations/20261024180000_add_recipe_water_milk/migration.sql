-- AlterTable
ALTER TABLE "MobileRecipe" ADD COLUMN     "beverageTds" DOUBLE PRECISION,
ADD COLUMN     "milkDrink" TEXT,
ADD COLUMN     "milkGrams" DOUBLE PRECISION,
ADD COLUMN     "milkType" TEXT,
ADD COLUMN     "waterBrand" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "waterTdsPpm" INTEGER,
ADD COLUMN     "waterType" TEXT;
