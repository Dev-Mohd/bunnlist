-- Suggestions from a curated batch (not a person): where the data came from, how
-- sure the extraction was, and the extra lot details to carry over on approval.
ALTER TABLE "MobileCoffeeSubmission" ADD COLUMN "importKey" TEXT;
ALTER TABLE "MobileCoffeeSubmission" ADD COLUMN "sourceUrl" TEXT;
ALTER TABLE "MobileCoffeeSubmission" ADD COLUMN "sourceConfidence" DOUBLE PRECISION;
ALTER TABLE "MobileCoffeeSubmission" ADD COLUMN "extras" JSONB;
CREATE UNIQUE INDEX "MobileCoffeeSubmission_importKey_key" ON "MobileCoffeeSubmission"("importKey");

-- CreateTable: labels on a published lot ("luxury", "infused", "decaf"), kept
-- beside the website's CoffeeLot rather than in it.
CREATE TABLE "MobileLotTag" (
    "lotId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileLotTag_pkey" PRIMARY KEY ("lotId","tag")
);
CREATE INDEX "MobileLotTag_tag_idx" ON "MobileLotTag"("tag");

-- Keep Supabase's public Data API closed (see 20261025120000_enable_rls).
ALTER TABLE "MobileLotTag" ENABLE ROW LEVEL SECURITY;
