-- «قوائمي»: named lists of coffees and their items. Additive.
CREATE TABLE IF NOT EXISTS "MobileList" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "note" TEXT,
    "emoji" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MobileList_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "MobileList_accountId_idx" ON "MobileList"("accountId");

CREATE TABLE IF NOT EXISTS "MobileListItem" (
    "listId" TEXT NOT NULL,
    "lotId" TEXT NOT NULL,
    "note" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MobileListItem_pkey" PRIMARY KEY ("listId", "lotId")
);
CREATE INDEX IF NOT EXISTS "MobileListItem_lotId_idx" ON "MobileListItem"("lotId");

ALTER TABLE "MobileList" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MobileListItem" ENABLE ROW LEVEL SECURITY;
