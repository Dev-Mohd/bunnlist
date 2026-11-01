-- What a person likes, picked at signup: flavour families and brew methods. Additive.
ALTER TABLE "MobileProfile" ADD COLUMN IF NOT EXISTS "tastePrefs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "MobileProfile" ADD COLUMN IF NOT EXISTS "brewPrefs" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
