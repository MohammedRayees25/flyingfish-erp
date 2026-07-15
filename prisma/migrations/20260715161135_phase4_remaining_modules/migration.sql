-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('NEW', 'CONTACTED', 'INTERESTED', 'BOOKED', 'COMPLETED', 'LOST');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- AlterTable
ALTER TABLE "certification_courses" ADD COLUMN     "price" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "dive_logs" ADD COLUMN     "boatId" UUID,
ADD COLUMN     "bottomTimeMin" INTEGER,
ADD COLUMN     "cylinderType" TEXT,
ADD COLUMN     "entryTime" TIMESTAMP(3),
ADD COLUMN     "equipmentUsed" TEXT,
ADD COLUMN     "exitTime" TIMESTAMP(3),
ADD COLUMN     "maxDepth" DOUBLE PRECISION,
ADD COLUMN     "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "problems" TEXT,
ADD COLUMN     "weightsUsedKg" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "guest_certifications" ADD COLUMN     "examPassedAt" DATE,
ADD COLUMN     "issueDate" DATE,
ADD COLUMN     "openWaterDivesCompleted" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "openWaterDivesRequired" INTEGER NOT NULL DEFAULT 4,
ADD COLUMN     "poolCompletedAt" DATE,
ADD COLUMN     "theoryCompletedAt" DATE;

-- AlterTable
ALTER TABLE "social_media_posts" ADD COLUMN     "isReel" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "saves" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "shares" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "snack_items" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "costPerUnit" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "reorderLevel" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "snack_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snack_purchases" (
    "id" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitCost" DECIMAL(10,2) NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "vendor" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "snack_purchases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snack_consumptions" (
    "id" UUID NOT NULL,
    "itemId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "quantity" INTEGER NOT NULL,
    "guestId" UUID,
    "boatId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "snack_consumptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dive_log_guests" (
    "id" UUID NOT NULL,
    "diveLogId" UUID NOT NULL,
    "guestId" UUID NOT NULL,

    CONSTRAINT "dive_log_guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_follower_snapshots" (
    "id" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "date" DATE NOT NULL,
    "followers" INTEGER NOT NULL,

    CONSTRAINT "social_follower_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leads" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "source" TEXT,
    "stage" "LeadStage" NOT NULL DEFAULT 'NEW',
    "assignedToId" UUID,
    "followUpAt" TIMESTAMP(3),
    "isRepeatCustomer" BOOLEAN NOT NULL DEFAULT false,
    "referredById" UUID,
    "guestId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" UUID NOT NULL,
    "companyName" TEXT NOT NULL DEFAULT 'Flying Fish Scuba School',
    "logoUrl" TEXT,
    "address" TEXT,
    "gstNumber" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_items" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "dailyRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "snack_items_name_key" ON "snack_items"("name");

-- CreateIndex
CREATE INDEX "snack_purchases_date_idx" ON "snack_purchases"("date");

-- CreateIndex
CREATE INDEX "snack_consumptions_date_idx" ON "snack_consumptions"("date");

-- CreateIndex
CREATE UNIQUE INDEX "dive_log_guests_diveLogId_guestId_key" ON "dive_log_guests"("diveLogId", "guestId");

-- CreateIndex
CREATE UNIQUE INDEX "social_follower_snapshots_platform_date_key" ON "social_follower_snapshots"("platform", "date");

-- CreateIndex
CREATE INDEX "leads_stage_idx" ON "leads"("stage");

-- CreateIndex
CREATE INDEX "leads_followUpAt_idx" ON "leads"("followUpAt");

-- CreateIndex
CREATE UNIQUE INDEX "rental_items_name_key" ON "rental_items"("name");

-- CreateIndex
CREATE INDEX "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "snack_purchases" ADD CONSTRAINT "snack_purchases_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "snack_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snack_consumptions" ADD CONSTRAINT "snack_consumptions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "snack_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snack_consumptions" ADD CONSTRAINT "snack_consumptions_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "snack_consumptions" ADD CONSTRAINT "snack_consumptions_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "boats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dive_logs" ADD CONSTRAINT "dive_logs_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "boats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dive_log_guests" ADD CONSTRAINT "dive_log_guests_diveLogId_fkey" FOREIGN KEY ("diveLogId") REFERENCES "dive_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dive_log_guests" ADD CONSTRAINT "dive_log_guests_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leads" ADD CONSTRAINT "leads_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
