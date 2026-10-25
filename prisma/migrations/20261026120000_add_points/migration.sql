-- AlterTable
ALTER TABLE "MobileProfile" ADD COLUMN     "hideFromLeaderboard" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "MobilePointEvent" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "refId" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "day" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobilePointEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobilePointEvent_accountId_kind_refId_key" ON "MobilePointEvent"("accountId", "kind", "refId");

-- CreateIndex
CREATE INDEX "MobilePointEvent_accountId_day_idx" ON "MobilePointEvent"("accountId", "day");

-- CreateIndex
CREATE INDEX "MobilePointEvent_createdAt_idx" ON "MobilePointEvent"("createdAt");

-- Keep Supabase's public Data API closed (see 20261025120000_enable_rls).
ALTER TABLE "MobilePointEvent" ENABLE ROW LEVEL SECURITY;
