-- «حضّر» brew log: optional details on a brew experience (additive, all nullable).
ALTER TABLE "MobileBrewExperience" ADD COLUMN "recipeId" TEXT;
ALTER TABLE "MobileBrewExperience" ADD COLUMN "recipeTitle" TEXT;
ALTER TABLE "MobileBrewExperience" ADD COLUMN "recipeSource" TEXT;
ALTER TABLE "MobileBrewExperience" ADD COLUMN "grinderId" TEXT;
ALTER TABLE "MobileBrewExperience" ADD COLUMN "grindSetting" TEXT;
ALTER TABLE "MobileBrewExperience" ADD COLUMN "doseGrams" DOUBLE PRECISION;
ALTER TABLE "MobileBrewExperience" ADD COLUMN "waterGrams" DOUBLE PRECISION;
ALTER TABLE "MobileBrewExperience" ADD COLUMN "brewSeconds" INTEGER;
ALTER TABLE "MobileBrewExperience" ADD COLUMN "taste" TEXT;
