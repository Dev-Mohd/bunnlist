-- Duplicate coffees: pairs an admin said are different coffees (so they aren't
-- offered again), and the slugs of coffees merged into another, so old links
-- and shares still open the coffee that stayed.
CREATE TABLE "MobileDuplicateDismissal" (
    "lotA" TEXT NOT NULL,
    "lotB" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileDuplicateDismissal_pkey" PRIMARY KEY ("lotA","lotB")
);

CREATE TABLE "MobileLotRedirect" (
    "fromSlug" TEXT NOT NULL,
    "toLotId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileLotRedirect_pkey" PRIMARY KEY ("fromSlug")
);

CREATE INDEX "MobileLotRedirect_toLotId_idx" ON "MobileLotRedirect"("toLotId");

-- Keep Supabase's public Data API closed (see 20261025120000_enable_rls).
ALTER TABLE "MobileDuplicateDismissal" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileLotRedirect" ENABLE ROW LEVEL SECURITY;
