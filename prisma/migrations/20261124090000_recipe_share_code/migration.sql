-- A recipe's share code: its owner asks for one, and anyone holding it can open the recipe
-- and copy it into their own. Additive; existing rows keep NULL. The table already has RLS on.
-- Rollback: DROP INDEX "MobileRecipe_shareCode_key"; ALTER TABLE "MobileRecipe" DROP COLUMN "shareCode";
ALTER TABLE "MobileRecipe" ADD COLUMN "shareCode" TEXT;
CREATE UNIQUE INDEX "MobileRecipe_shareCode_key" ON "MobileRecipe"("shareCode");
