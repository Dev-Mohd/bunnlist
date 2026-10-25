-- CreateTable: "مفيد" on a review and "أعجبني" on a recipe. ownerId is the
-- author of the liked thing (for notifications and the most-helpful ranking).
CREATE TABLE "MobileLike" (
    "accountId" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileLike_pkey" PRIMARY KEY ("accountId","targetType","targetId")
);
CREATE INDEX "MobileLike_targetType_targetId_idx" ON "MobileLike"("targetType", "targetId");
CREATE INDEX "MobileLike_ownerId_idx" ON "MobileLike"("ownerId");

-- New notification kinds, on by default.
ALTER TABLE "MobileNotificationSettings" ADD COLUMN "reviewHelpful" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "MobileNotificationSettings" ADD COLUMN "recipeLiked" BOOLEAN NOT NULL DEFAULT true;

-- Keep Supabase's public Data API closed (see 20261025120000_enable_rls).
ALTER TABLE "MobileLike" ENABLE ROW LEVEL SECURITY;
