-- Rate-limit events for sign-in codes and the advisor (hashed keys). Additive.
CREATE TABLE IF NOT EXISTS "MobileRateEvent" (
    "id" TEXT NOT NULL,
    "bucket" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileRateEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileRateEvent_bucket_key_createdAt_idx" ON "MobileRateEvent"("bucket", "key", "createdAt");
CREATE INDEX IF NOT EXISTS "MobileRateEvent_createdAt_idx" ON "MobileRateEvent"("createdAt");
ALTER TABLE "MobileRateEvent" ENABLE ROW LEVEL SECURITY;
