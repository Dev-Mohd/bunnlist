-- More for founders: a recipe pinned on their profile, their recommendations on coffees,
-- and polls only they answer. Additive; RLS is on for the new tables (the API uses the service role).
-- Rollback: DROP TABLE "MobileFounderVote"; DROP TABLE "MobileFounderPoll"; DROP TABLE "MobileFounderPick";
--           ALTER TABLE "MobileProfile" DROP COLUMN "pinnedRecipeId";
ALTER TABLE "MobileProfile" ADD COLUMN "pinnedRecipeId" TEXT;

CREATE TABLE "MobileFounderPick" (
    "accountId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileFounderPick_pkey" PRIMARY KEY ("accountId","lotId")
);
CREATE INDEX "MobileFounderPick_lotId_idx" ON "MobileFounderPick"("lotId");

CREATE TABLE "MobileFounderPoll" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" TEXT[],
    "open" BOOLEAN NOT NULL DEFAULT true,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "MobileFounderPoll_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MobileFounderPoll_open_createdAt_idx" ON "MobileFounderPoll"("open", "createdAt");

CREATE TABLE "MobileFounderVote" (
    "pollId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "option" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileFounderVote_pkey" PRIMARY KEY ("pollId","accountId")
);

ALTER TABLE "MobileFounderPick" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileFounderPoll" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileFounderVote" ENABLE ROW LEVEL SECURITY;
