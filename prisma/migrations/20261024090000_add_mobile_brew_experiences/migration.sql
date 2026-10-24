-- CreateTable
CREATE TABLE "MobileBrewExperience" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "methodCode" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "brewedAt" TIMESTAMP(3) NOT NULL,
    "note" TEXT NOT NULL DEFAULT '',
    "state" TEXT NOT NULL DEFAULT 'draft',
    "revision" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileBrewExperience_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MobileBrewExperience_accountId_clientId_key" ON "MobileBrewExperience"("accountId", "clientId");

-- CreateIndex
CREATE INDEX "MobileBrewExperience_accountId_lotId_idx" ON "MobileBrewExperience"("accountId", "lotId");

-- CreateIndex
CREATE INDEX "MobileBrewExperience_lotId_state_idx" ON "MobileBrewExperience"("lotId", "state");
