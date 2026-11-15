-- «دعاني»: a new account names, once, the founder who invited it. Additive; existing rows keep NULL.
-- The table already has RLS on.
-- Rollback: DROP INDEX "MobileProfile_invitedById_idx"; ALTER TABLE "MobileProfile" DROP COLUMN "invitedAt", DROP COLUMN "invitedById";
ALTER TABLE "MobileProfile" ADD COLUMN "invitedById" TEXT, ADD COLUMN "invitedAt" TIMESTAMP(3);
CREATE INDEX "MobileProfile_invitedById_idx" ON "MobileProfile"("invitedById");
