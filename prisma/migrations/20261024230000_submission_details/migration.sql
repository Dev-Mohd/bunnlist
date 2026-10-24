-- AlterTable
ALTER TABLE "MobileCoffeeSubmission" ADD COLUMN     "flavorNotes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "nameEn" TEXT,
ADD COLUMN     "process" TEXT,
ADD COLUMN     "roastLevel" TEXT,
ADD COLUMN     "roasterNameEn" TEXT;
