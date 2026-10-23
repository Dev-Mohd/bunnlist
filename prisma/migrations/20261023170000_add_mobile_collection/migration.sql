-- CreateTable
CREATE TABLE "MobileCollectionEntry" (
    "accountId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "owned" BOOLEAN NOT NULL DEFAULT false,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "wantsToTry" BOOLEAN NOT NULL DEFAULT false,
    "tried" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileCollectionEntry_pkey" PRIMARY KEY ("accountId","lotId")
);

-- CreateIndex
CREATE INDEX "MobileCollectionEntry_accountId_idx" ON "MobileCollectionEntry"("accountId");
