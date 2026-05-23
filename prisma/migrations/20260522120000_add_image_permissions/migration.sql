-- CreateEnum
CREATE TYPE "CoffeeImageType" AS ENUM ('OFFICIAL', 'PLACEHOLDER', 'USER_UPLOADED', 'NONE');

-- CreateEnum
CREATE TYPE "ImagePermissionStatus" AS ENUM ('APPROVED', 'PENDING', 'REJECTED', 'PLACEHOLDER_ONLY');

-- CreateEnum
CREATE TYPE "CoffeeImageSource" AS ENUM ('ROASTERY_WEBSITE', 'ROASTERY_PROVIDED', 'INSTAGRAM', 'USER_UPLOAD', 'PLACEHOLDER');

-- AlterTable
ALTER TABLE "CoffeeLot"
ADD COLUMN "imageUrl" TEXT,
ADD COLUMN "imageType" "CoffeeImageType" NOT NULL DEFAULT 'NONE',
ADD COLUMN "imagePermissionStatus" "ImagePermissionStatus" NOT NULL DEFAULT 'PLACEHOLDER_ONLY',
ADD COLUMN "imageSource" "CoffeeImageSource" NOT NULL DEFAULT 'PLACEHOLDER',
ADD COLUMN "imageCredit" TEXT,
ADD COLUMN "imageSourceUrl" TEXT,
ADD COLUMN "imagePermissionNote" TEXT,
ADD COLUMN "imageApprovedAt" TIMESTAMP(3);
