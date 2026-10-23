-- CreateTable
CREATE TABLE "MobileSession" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "currentHash" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "consumedHashes" TEXT[],
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MobileIdempotency" (
    "ownerId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "payloadHash" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "resourceId" TEXT,
    "response" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileIdempotency_pkey" PRIMARY KEY ("ownerId","operation","clientId")
);

-- CreateIndex
CREATE INDEX "MobileSession_accountId_idx" ON "MobileSession"("accountId");
