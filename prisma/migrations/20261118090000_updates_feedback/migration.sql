-- «تحديثات BunnList» posts from the team (users comment under them) and the
-- suggestions/experiences inbox, with the team's reply. Additive.
CREATE TABLE IF NOT EXISTS "MobileUpdate" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MobileUpdate_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileUpdate_createdAt_idx" ON "MobileUpdate"("createdAt");
ALTER TABLE "MobileUpdate" ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS "MobileFeedback" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),
    "reply" TEXT,
    "repliedAt" TIMESTAMP(3),
    "repliedBy" TEXT,

    CONSTRAINT "MobileFeedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileFeedback_accountId_createdAt_idx" ON "MobileFeedback"("accountId", "createdAt");
CREATE INDEX IF NOT EXISTS "MobileFeedback_createdAt_idx" ON "MobileFeedback"("createdAt");
ALTER TABLE "MobileFeedback" ENABLE ROW LEVEL SECURITY;
