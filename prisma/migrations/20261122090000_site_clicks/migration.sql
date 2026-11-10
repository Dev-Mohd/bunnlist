-- Counts of taps on the site's download buttons (bunnlist.com/get): one row per day,
-- button and platform. No person, device or address is stored. Additive.
-- Rollback: DROP TABLE "SiteClick";
CREATE TABLE "SiteClick" (
    "id" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SiteClick_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SiteClick_day_source_platform_key" ON "SiteClick"("day", "source", "platform");
CREATE INDEX "SiteClick_day_idx" ON "SiteClick"("day");
ALTER TABLE "SiteClick" ENABLE ROW LEVEL SECURITY;
