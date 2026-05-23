-- Future image storage audit fields. Disabled workflow for now.
ALTER TABLE "CoffeeLot"
ADD COLUMN "originalImageUrl" TEXT,
ADD COLUMN "storedImageUrl" TEXT,
ADD COLUMN "imageStorageProvider" TEXT,
ADD COLUMN "imageStoredAt" TIMESTAMP(3);
