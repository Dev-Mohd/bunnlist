-- AlterTable
ALTER TABLE "MobileRecipe" ADD COLUMN     "brewer" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "filterType" TEXT,
ADD COLUMN     "grindLevel" TEXT,
ADD COLUMN     "grindMicrons" INTEGER,
ADD COLUMN     "grinderModel" TEXT,
ADD COLUMN     "restDays" INTEGER,
ADD COLUMN     "roastLevel" TEXT;
