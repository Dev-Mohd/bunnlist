-- «رسائل BunnList»: one-way messages from the team to one account (warnings, a points
-- reset, a suspension, good news). Additive; rollback: DROP TABLE "MobileTeamMessage";
CREATE TABLE IF NOT EXISTS "MobileTeamMessage" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'general',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "MobileTeamMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileTeamMessage_accountId_createdAt_idx" ON "MobileTeamMessage"("accountId", "createdAt");
ALTER TABLE "MobileTeamMessage" ENABLE ROW LEVEL SECURITY;
