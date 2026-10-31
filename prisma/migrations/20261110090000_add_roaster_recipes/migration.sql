-- A roaster's own brew recipe for a coffee (dose, water, temperature, time, pours),
-- read from its product page text. Shown on the coffee page instead of the description.
CREATE TABLE "MobileRoasterRecipe" (
    "id" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL,
    "tool" TEXT,
    "doseG" DOUBLE PRECISION NOT NULL,
    "waterMl" INTEGER,
    "tempC" INTEGER,
    "timeSec" INTEGER,
    "grind" TEXT,
    "ratio" DOUBLE PRECISION,
    "steps" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileRoasterRecipe_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MobileRoasterRecipe_lotId_idx" ON "MobileRoasterRecipe"("lotId");

-- Keep Supabase's public Data API closed (see 20261025120000_enable_rls).
ALTER TABLE "MobileRoasterRecipe" ENABLE ROW LEVEL SECURITY;
