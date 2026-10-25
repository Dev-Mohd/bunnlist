-- CreateTable: a phone's APNs token for an account (one row per device token).
CREATE TABLE "MobilePushDevice" (
    "token" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "environment" TEXT NOT NULL DEFAULT 'production',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobilePushDevice_pkey" PRIMARY KEY ("token")
);
CREATE INDEX "MobilePushDevice_accountId_idx" ON "MobilePushDevice"("accountId");

-- CreateTable: which notifications an account wants (all on until changed).
CREATE TABLE "MobileNotificationSettings" (
    "accountId" TEXT NOT NULL,
    "newFollower" BOOLEAN NOT NULL DEFAULT true,
    "submissionApproved" BOOLEAN NOT NULL DEFAULT true,
    "submissionRejected" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileNotificationSettings_pkey" PRIMARY KEY ("accountId")
);

-- Keep Supabase's public Data API closed (see 20261025120000_enable_rls).
ALTER TABLE "MobilePushDevice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileNotificationSettings" ENABLE ROW LEVEL SECURITY;
