-- Who can see a person's followers, whom they follow, and their activity
-- (discoveries and published recipes) on their public profile:
-- 'everyone', 'followers' (people who follow them) or 'me'.
ALTER TABLE "MobileProfile" ADD COLUMN "followersVisibility" TEXT NOT NULL DEFAULT 'everyone';
ALTER TABLE "MobileProfile" ADD COLUMN "followingVisibility" TEXT NOT NULL DEFAULT 'everyone';
ALTER TABLE "MobileProfile" ADD COLUMN "activityVisibility" TEXT NOT NULL DEFAULT 'everyone';
