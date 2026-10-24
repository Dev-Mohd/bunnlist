-- AlterTable
ALTER TABLE "MobileCoffeeSubmission" ADD COLUMN     "approvedLotId" TEXT,
ADD COLUMN     "reviewNote" TEXT,
ADD COLUMN     "reviewedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "MobileCoffeeSubmission_approvedLotId_idx" ON "MobileCoffeeSubmission"("approvedLotId");
