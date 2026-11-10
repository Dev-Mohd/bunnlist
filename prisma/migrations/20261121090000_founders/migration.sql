-- «مبدع مؤسس» (founder badge, first 100 creators) and founders' social handles.
-- Additive only: three nullable/defaulted columns and a unique index on MobileProfile.
-- Rollback:
--   DROP INDEX IF EXISTS "MobileProfile_founderNumber_key";
--   ALTER TABLE "MobileProfile" DROP COLUMN IF EXISTS "founderNumber", DROP COLUMN IF EXISTS "founderAt", DROP COLUMN IF EXISTS "socials";

ALTER TABLE "MobileProfile" ADD COLUMN "founderNumber" INTEGER;
ALTER TABLE "MobileProfile" ADD COLUMN "founderAt" TIMESTAMP(3);
ALTER TABLE "MobileProfile" ADD COLUMN "socials" JSONB NOT NULL DEFAULT '{}';

CREATE UNIQUE INDEX "MobileProfile_founderNumber_key" ON "MobileProfile"("founderNumber");
