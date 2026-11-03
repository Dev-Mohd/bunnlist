-- Blocking another user: neither sees the other's activity or comments, and they
-- can't follow or comment on each other. Additive.
CREATE TABLE IF NOT EXISTS "MobileBlock" (
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileBlock_pkey" PRIMARY KEY ("blockerId", "blockedId")
);
CREATE INDEX IF NOT EXISTS "MobileBlock_blockedId_idx" ON "MobileBlock"("blockedId");
ALTER TABLE "MobileBlock" ENABLE ROW LEVEL SECURITY;
