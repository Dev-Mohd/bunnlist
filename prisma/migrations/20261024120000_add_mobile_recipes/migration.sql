-- CreateTable
CREATE TABLE "MobileRecipe" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "lotId" TEXT,
    "title" TEXT NOT NULL,
    "methodCode" TEXT NOT NULL,
    "temperature" TEXT NOT NULL DEFAULT 'hot',
    "doseGrams" DOUBLE PRECISION,
    "hotWaterGrams" DOUBLE PRECISION,
    "iceGrams" DOUBLE PRECISION,
    "yieldGrams" DOUBLE PRECISION,
    "waterTempC" DOUBLE PRECISION,
    "grinder" TEXT NOT NULL DEFAULT '',
    "grindSetting" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "steps" JSONB NOT NULL DEFAULT '[]',
    "sourceId" TEXT,
    "sourceVersion" INTEGER,
    "version" INTEGER NOT NULL DEFAULT 1,
    "state" TEXT NOT NULL DEFAULT 'draft',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobileRecipe_accountId_clientId_key" ON "MobileRecipe"("accountId", "clientId");

-- CreateIndex
CREATE INDEX "MobileRecipe_accountId_idx" ON "MobileRecipe"("accountId");

-- CreateIndex
CREATE INDEX "MobileRecipe_state_publishedAt_idx" ON "MobileRecipe"("state", "publishedAt");

-- CreateIndex
CREATE INDEX "MobileRecipe_lotId_state_idx" ON "MobileRecipe"("lotId", "state");
