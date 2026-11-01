-- «ساعدني أختار» runs (answers, AI use for the daily cap, picks). Additive.
CREATE TABLE IF NOT EXISTS "MobileAdvisorRun" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "usedAi" BOOLEAN NOT NULL DEFAULT false,
    "picks" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileAdvisorRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileAdvisorRun_accountId_createdAt_idx" ON "MobileAdvisorRun"("accountId", "createdAt");
ALTER TABLE "MobileAdvisorRun" ENABLE ROW LEVEL SECURITY;
