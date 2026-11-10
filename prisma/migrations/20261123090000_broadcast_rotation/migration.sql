-- Repeating notifications: the admin's list of messages, sent one at a time every
-- few days by the daily cron. Additive; nothing is sent until an admin turns it on.
-- Rollback: DROP TABLE "MobileBroadcastRotationItem"; DROP TABLE "MobileBroadcastRotation";
CREATE TABLE "MobileBroadcastRotation" (
    "id" TEXT NOT NULL DEFAULT 'main',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "everyDays" INTEGER NOT NULL DEFAULT 2,
    "audience" TEXT NOT NULL DEFAULT 'all',
    "lastRunAt" TIMESTAMP(3),
    "lastItemId" TEXT,
    "updatedBy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileBroadcastRotation_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "MobileBroadcastRotationItem" (
    "id" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileBroadcastRotationItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MobileBroadcastRotationItem_position_idx" ON "MobileBroadcastRotationItem"("position");
ALTER TABLE "MobileBroadcastRotation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileBroadcastRotationItem" ENABLE ROW LEVEL SECURITY;
