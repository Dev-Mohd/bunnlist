-- AlterTable
ALTER TABLE "MobileProfile" ALTER COLUMN "username" DROP NOT NULL,
ADD COLUMN     "avatarPath" TEXT,
ADD COLUMN     "bio" TEXT,
ADD COLUMN     "displayName" TEXT,
ADD COLUMN     "onboardedAt" TIMESTAMP(3);
