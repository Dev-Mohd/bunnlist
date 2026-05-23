-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'REVIEWED', 'SAVED', 'REJECTED');

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "normalizedUrl" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "httpStatus" INTEGER,
    "rawHtmlSize" INTEGER,
    "rawText" TEXT,
    "errorMessage" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportedCoffee" (
    "id" TEXT NOT NULL,
    "importJobId" TEXT NOT NULL,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "coffeeName" TEXT,
    "roasteryName" TEXT,
    "originCountry" TEXT,
    "region" TEXT,
    "farmName" TEXT,
    "producerName" TEXT,
    "process" TEXT,
    "variety" TEXT,
    "tastingNotes" TEXT[],
    "roastLevel" TEXT,
    "brewMethods" TEXT[],
    "price" DECIMAL(10,2),
    "currency" TEXT,
    "weightGrams" INTEGER,
    "productUrl" TEXT,
    "imageUrl" TEXT,
    "availability" TEXT,
    "descriptionSummary" TEXT,
    "confidence" JSONB,
    "savedCoffeeLotId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImportedCoffee_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ImportJob_normalizedUrl_idx" ON "ImportJob"("normalizedUrl");

-- CreateIndex
CREATE INDEX "ImportJob_status_idx" ON "ImportJob"("status");

-- CreateIndex
CREATE INDEX "ImportJob_createdAt_idx" ON "ImportJob"("createdAt");

-- CreateIndex
CREATE INDEX "ImportJob_createdById_idx" ON "ImportJob"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "ImportedCoffee_importJobId_key" ON "ImportedCoffee"("importJobId");

-- CreateIndex
CREATE INDEX "ImportedCoffee_status_idx" ON "ImportedCoffee"("status");

-- CreateIndex
CREATE INDEX "ImportedCoffee_createdAt_idx" ON "ImportedCoffee"("createdAt");

-- CreateIndex
CREATE INDEX "ImportedCoffee_savedCoffeeLotId_idx" ON "ImportedCoffee"("savedCoffeeLotId");

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedCoffee" ADD CONSTRAINT "ImportedCoffee_importJobId_fkey" FOREIGN KEY ("importJobId") REFERENCES "ImportJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportedCoffee" ADD CONSTRAINT "ImportedCoffee_savedCoffeeLotId_fkey" FOREIGN KEY ("savedCoffeeLotId") REFERENCES "CoffeeLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
