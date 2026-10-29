-- Private accounts: following needs the owner's approval, and their activity is
-- for followers only.
ALTER TABLE "MobileProfile" ADD COLUMN "isPrivate" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "MobileFollowRequest" (
    "requesterId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileFollowRequest_pkey" PRIMARY KEY ("requesterId","targetId")
);

CREATE INDEX "MobileFollowRequest_targetId_idx" ON "MobileFollowRequest"("targetId");

-- Keep Supabase's public Data API closed (see 20261025120000_enable_rls).
ALTER TABLE "MobileFollowRequest" ENABLE ROW LEVEL SECURITY;
