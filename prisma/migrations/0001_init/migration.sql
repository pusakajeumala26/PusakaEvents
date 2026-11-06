-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('L', 'P');

-- CreateEnum
CREATE TYPE "PayStatus" AS ENUM ('BELUM', 'MENUNGGU', 'TERVERIFIKASI', 'DITOLAK');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('DAFTAR', 'IMPOR', 'UPLOAD', 'KIRIM_ULANG', 'DISETUJUI', 'DITOLAK');

-- CreateTable
CREATE TABLE "Member" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "countryCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "subject" TEXT NOT NULL DEFAULT '',
    "gender" "Gender" NOT NULL,
    "passwordHash" TEXT,
    "status" "PayStatus" NOT NULL DEFAULT 'BELUM',
    "rejectReason" TEXT,
    "receiptKey" TEXT,
    "receiptAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberEvent" (
    "id" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "EventType" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Setting" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "letingName" TEXT NOT NULL DEFAULT 'Pusaka Jeumala',
    "amount" INTEGER NOT NULL DEFAULT 10000,
    "target" INTEGER NOT NULL DEFAULT 36,
    "deadline" TIMESTAMP(3),
    "registrationOpen" BOOLEAN NOT NULL DEFAULT true,
    "bankName" TEXT NOT NULL DEFAULT 'BSI',
    "accountNumber" TEXT NOT NULL DEFAULT '7366090325',
    "accountName" TEXT NOT NULL DEFAULT 'Raisya Zumara',
    "adminPasswordHash" TEXT,
    "adminPwVersion" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Setting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Member_createdAt_idx" ON "Member"("createdAt");

-- CreateIndex
CREATE INDEX "Member_status_idx" ON "Member"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Member_countryCode_phone_key" ON "Member"("countryCode", "phone");

-- CreateIndex
CREATE INDEX "MemberEvent_memberId_createdAt_idx" ON "MemberEvent"("memberId", "createdAt");

-- AddForeignKey
ALTER TABLE "MemberEvent" ADD CONSTRAINT "MemberEvent_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
