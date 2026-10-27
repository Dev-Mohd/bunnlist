-- Admin pin/hide for the app home's trending coffees.
CREATE TABLE "MobileTrendingOverride" (
    "lotId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileTrendingOverride_pkey" PRIMARY KEY ("lotId")
);

-- Keep Supabase's public Data API closed (see 20261025120000_enable_rls).
ALTER TABLE "MobileTrendingOverride" ENABLE ROW LEVEL SECURITY;
