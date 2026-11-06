-- CreateEnum
CREATE TYPE "CleanupStatus" AS ENUM ('OK', 'PARTIAL');

-- AlterTable
ALTER TABLE "Setting"
ADD COLUMN "periodName" TEXT NOT NULL DEFAULT 'Periode 1',
ADD COLUMN "periodStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Period" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalMembers" INTEGER NOT NULL,
    "verifiedCount" INTEGER NOT NULL,
    "pendingCount" INTEGER NOT NULL,
    "rejectedCount" INTEGER NOT NULL,
    "unpaidCount" INTEGER NOT NULL,
    "verifiedTotal" INTEGER NOT NULL,
    "receiptCount" INTEGER NOT NULL,
    "cleanupStatus" "CleanupStatus" NOT NULL DEFAULT 'OK',

    CONSTRAINT "Period_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Period_closedAt_idx" ON "Period"("closedAt");
