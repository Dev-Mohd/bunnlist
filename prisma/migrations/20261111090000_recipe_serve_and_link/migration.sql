-- Roaster recipes: hot or iced, and xBloom machine recipes kept as their share
-- link (no dose of their own, so the dose may be empty).
ALTER TABLE "MobileRoasterRecipe" ADD COLUMN "serve" TEXT NOT NULL DEFAULT 'HOT';
ALTER TABLE "MobileRoasterRecipe" ADD COLUMN "link" TEXT;
ALTER TABLE "MobileRoasterRecipe" ALTER COLUMN "doseG" DROP NOT NULL;
