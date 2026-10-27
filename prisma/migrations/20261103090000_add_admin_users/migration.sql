-- Announcements from the team can be turned off like any other notification.
ALTER TABLE "MobileNotificationSettings" ADD COLUMN "announcements" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable: accounts barred from posting by an admin.
CREATE TABLE "MobileSuspension" (
    "accountId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "until" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileSuspension_pkey" PRIMARY KEY ("accountId")
);

-- CreateTable: a log of admin broadcasts.
CREATE TABLE "MobileBroadcast" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "accounts" INTEGER NOT NULL,
    "delivered" INTEGER NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileBroadcast_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MobileBroadcast_createdAt_idx" ON "MobileBroadcast"("createdAt");

-- Keep Supabase's public Data API closed (see 20261025120000_enable_rls).
ALTER TABLE "MobileSuspension" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileBroadcast" ENABLE ROW LEVEL SECURITY;
