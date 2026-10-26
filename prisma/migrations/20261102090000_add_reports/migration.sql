-- CreateTable: reports on people's content, reviewed in the app's admin console.
CREATE TABLE "MobileReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "details" TEXT,
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileReport_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MobileReport_status_createdAt_idx" ON "MobileReport"("status", "createdAt");
CREATE INDEX "MobileReport_targetType_targetId_idx" ON "MobileReport"("targetType", "targetId");
CREATE INDEX "MobileReport_reporterId_idx" ON "MobileReport"("reporterId");

-- Keep Supabase's public Data API closed (see 20261025120000_enable_rls).
ALTER TABLE "MobileReport" ENABLE ROW LEVEL SECURITY;
