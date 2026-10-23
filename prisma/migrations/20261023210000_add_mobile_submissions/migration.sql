-- CreateTable
CREATE TABLE "MobileCoffeeSubmission" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roasterName" TEXT NOT NULL,
    "originName" TEXT,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileCoffeeSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MobileCoffeeSubmission_accountId_idx" ON "MobileCoffeeSubmission"("accountId");

-- CreateIndex
CREATE INDEX "MobileCoffeeSubmission_status_idx" ON "MobileCoffeeSubmission"("status");
