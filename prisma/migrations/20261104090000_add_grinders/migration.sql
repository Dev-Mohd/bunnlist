-- «مطحنتي» on the profile.
ALTER TABLE "MobileProfile" ADD COLUMN "grinderId" TEXT;

-- CreateTable: the grinder guide.
CREATE TABLE "MobileGrinder" (
    "id" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "variant" TEXT,
    "category" TEXT NOT NULL,
    "adjustment" TEXT,
    "rangeMin" DOUBLE PRECISION,
    "rangeMax" DOUBLE PRECISION,
    "clicksPerRotation" INTEGER,
    "micronsPerStep" DOUBLE PRECISION,
    "zeroGuideAr" TEXT,
    "notesAr" TEXT,
    "sources" JSONB NOT NULL DEFAULT '[]',
    "imageUrl" TEXT,
    "imageCredit" TEXT,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileGrinder_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "MobileGrinder_category_sortOrder_idx" ON "MobileGrinder"("category", "sortOrder");

-- Keep Supabase's public Data API closed (see 20261025120000_enable_rls).
ALTER TABLE "MobileGrinder" ENABLE ROW LEVEL SECURITY;
