-- Following a roaster (its new coffees reach the home). Additive.
CREATE TABLE IF NOT EXISTS "MobileRoasterFollow" (
    "accountId" TEXT NOT NULL,
    "roasterId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileRoasterFollow_pkey" PRIMARY KEY ("accountId", "roasterId")
);
CREATE INDEX IF NOT EXISTS "MobileRoasterFollow_roasterId_idx" ON "MobileRoasterFollow"("roasterId");
ALTER TABLE "MobileRoasterFollow" ENABLE ROW LEVEL SECURITY;
