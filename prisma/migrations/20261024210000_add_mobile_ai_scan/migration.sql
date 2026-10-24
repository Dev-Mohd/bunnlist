-- CreateTable
CREATE TABLE "MobileAiScan" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "isCoffeeBag" BOOLEAN NOT NULL DEFAULT false,
    "matchedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileAiScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MobileAiScan_accountId_createdAt_idx" ON "MobileAiScan"("accountId", "createdAt");
