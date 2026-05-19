-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "BrewMethod" AS ENUM ('ESPRESSO', 'V60', 'CHEMEX', 'AEROPRESS', 'FRENCH_PRESS', 'COLD_BREW', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PUBLISHED', 'HIDDEN', 'FLAGGED');

-- CreateEnum
CREATE TYPE "CoffeeProcess" AS ENUM ('NATURAL', 'WASHED', 'HONEY', 'ANAEROBIC', 'CARBONIC_MACERATION', 'EXPERIMENTAL', 'OTHER');

-- CreateEnum
CREATE TYPE "RateLimitAction" AS ENUM ('CREATE_REVIEW', 'UPDATE_REVIEW', 'CREATE_COFFEE_LOT');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "locale" TEXT NOT NULL DEFAULT 'ar',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Roaster" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "country" TEXT,
    "website" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Roaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OriginCountry" (
    "id" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "nameEn" TEXT,
    "isoCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OriginCountry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoffeeLot" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roasterId" TEXT NOT NULL,
    "originCountryId" TEXT NOT NULL,
    "region" TEXT,
    "farm" TEXT,
    "producer" TEXT,
    "variety" TEXT,
    "process" "CoffeeProcess" NOT NULL,
    "processLabel" TEXT,
    "roastLevel" TEXT,
    "altitudeMeters" INTEGER,
    "flavorNotes" TEXT[],
    "recommendedBrewMethods" "BrewMethod"[],
    "imagePath" TEXT,
    "description" TEXT,
    "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "CoffeeLot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoffeeLotBrewStat" (
    "id" TEXT NOT NULL,
    "coffeeLotId" TEXT NOT NULL,
    "brewMethod" "BrewMethod" NOT NULL,
    "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "wouldBuyAgain" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CoffeeLotBrewStat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "coffeeLotId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "brewMethod" "BrewMethod" NOT NULL,
    "wouldBuyAgain" BOOLEAN NOT NULL,
    "body" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PUBLISHED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimitEvent" (
    "id" TEXT NOT NULL,
    "action" "RateLimitAction" NOT NULL,
    "userId" TEXT,
    "ipHash" TEXT,
    "targetId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RateLimitEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Roaster_slug_key" ON "Roaster"("slug");

-- CreateIndex
CREATE INDEX "Roaster_name_idx" ON "Roaster"("name");

-- CreateIndex
CREATE UNIQUE INDEX "OriginCountry_isoCode_key" ON "OriginCountry"("isoCode");

-- CreateIndex
CREATE INDEX "OriginCountry_nameAr_idx" ON "OriginCountry"("nameAr");

-- CreateIndex
CREATE UNIQUE INDEX "CoffeeLot_slug_key" ON "CoffeeLot"("slug");

-- CreateIndex
CREATE INDEX "CoffeeLot_roasterId_idx" ON "CoffeeLot"("roasterId");

-- CreateIndex
CREATE INDEX "CoffeeLot_originCountryId_idx" ON "CoffeeLot"("originCountryId");

-- CreateIndex
CREATE INDEX "CoffeeLot_process_idx" ON "CoffeeLot"("process");

-- CreateIndex
CREATE INDEX "CoffeeLot_averageRating_idx" ON "CoffeeLot"("averageRating");

-- CreateIndex
CREATE INDEX "CoffeeLot_reviewCount_idx" ON "CoffeeLot"("reviewCount");

-- CreateIndex
CREATE INDEX "CoffeeLot_createdAt_idx" ON "CoffeeLot"("createdAt");

-- CreateIndex
CREATE INDEX "CoffeeLotBrewStat_brewMethod_idx" ON "CoffeeLotBrewStat"("brewMethod");

-- CreateIndex
CREATE INDEX "CoffeeLotBrewStat_averageRating_idx" ON "CoffeeLotBrewStat"("averageRating");

-- CreateIndex
CREATE UNIQUE INDEX "CoffeeLotBrewStat_coffeeLotId_brewMethod_key" ON "CoffeeLotBrewStat"("coffeeLotId", "brewMethod");

-- CreateIndex
CREATE INDEX "Review_coffeeLotId_status_idx" ON "Review"("coffeeLotId", "status");

-- CreateIndex
CREATE INDEX "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX "Review_brewMethod_idx" ON "Review"("brewMethod");

-- CreateIndex
CREATE INDEX "Review_rating_idx" ON "Review"("rating");

-- CreateIndex
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_coffeeLotId_userId_key" ON "Review"("coffeeLotId", "userId");

-- CreateIndex
CREATE INDEX "RateLimitEvent_action_userId_createdAt_idx" ON "RateLimitEvent"("action", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "RateLimitEvent_action_ipHash_createdAt_idx" ON "RateLimitEvent"("action", "ipHash", "createdAt");

-- CreateIndex
CREATE INDEX "RateLimitEvent_targetId_idx" ON "RateLimitEvent"("targetId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoffeeLot" ADD CONSTRAINT "CoffeeLot_roasterId_fkey" FOREIGN KEY ("roasterId") REFERENCES "Roaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoffeeLot" ADD CONSTRAINT "CoffeeLot_originCountryId_fkey" FOREIGN KEY ("originCountryId") REFERENCES "OriginCountry"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoffeeLot" ADD CONSTRAINT "CoffeeLot_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoffeeLotBrewStat" ADD CONSTRAINT "CoffeeLotBrewStat_coffeeLotId_fkey" FOREIGN KEY ("coffeeLotId") REFERENCES "CoffeeLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_coffeeLotId_fkey" FOREIGN KEY ("coffeeLotId") REFERENCES "CoffeeLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RateLimitEvent" ADD CONSTRAINT "RateLimitEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
