-- The weekly challenge (set by admins), who finished it, comments on brews and
-- recipes, and a notification switch for comments. Additive.
CREATE TABLE "MobileChallenge" (
    "id" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "subtitleAr" TEXT,
    "emoji" TEXT,
    "action" TEXT NOT NULL,
    "originCode" TEXT,
    "process" TEXT,
    "roasterSlug" TEXT,
    "flavorFamily" TEXT,
    "target" INTEGER NOT NULL DEFAULT 1,
    "points" INTEGER NOT NULL DEFAULT 50,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileChallenge_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MobileChallenge_startsAt_endsAt_idx" ON "MobileChallenge"("startsAt", "endsAt");

CREATE TABLE "MobileChallengeCompletion" (
    "challengeId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileChallengeCompletion_pkey" PRIMARY KEY ("challengeId", "accountId")
);
CREATE INDEX "MobileChallengeCompletion_challengeId_idx" ON "MobileChallengeCompletion"("challengeId");

CREATE TABLE "MobileComment" (
    "id" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MobileComment_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MobileComment_targetType_targetId_createdAt_idx" ON "MobileComment"("targetType", "targetId", "createdAt");
CREATE INDEX "MobileComment_accountId_createdAt_idx" ON "MobileComment"("accountId", "createdAt");

ALTER TABLE "MobileNotificationSettings" ADD COLUMN "comments" BOOLEAN NOT NULL DEFAULT true;

-- Keep Supabase's public Data API closed (see 20261025120000_enable_rls).
ALTER TABLE "MobileChallenge" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileChallengeCompletion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileComment" ENABLE ROW LEVEL SECURITY;
