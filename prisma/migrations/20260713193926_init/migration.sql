-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'FOUNDER', 'MANAGER', 'INSTRUCTOR', 'MARKETING', 'ACCOUNTANT');

-- CreateEnum
CREATE TYPE "SwimmingStatus" AS ENUM ('NON_SWIMMER', 'WEAK_SWIMMER', 'COMPETENT_SWIMMER', 'STRONG_SWIMMER');

-- CreateEnum
CREATE TYPE "CertificationLevel" AS ENUM ('NONE', 'OPEN_WATER', 'ADVANCED_OPEN_WATER', 'RESCUE', 'DIVEMASTER', 'INSTRUCTOR', 'OTHER');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('BOAT_RIDE', 'SHORT_DIVE', 'LONG_DIVE', 'LONG_DOUBLE_DIVE', 'FUN_DIVE', 'DIVE_GOA', 'SEI', 'FLYING_FISH', 'PADI_OWD', 'SSI_OWD', 'PADI_AOW', 'SSI_AOW', 'EANX', 'RESCUE', 'REACT_RIGHT', 'PPB', 'ADVANCED_ADVENTURE', 'WRECK_SPECIALTY');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'ONLINE_GATEWAY', 'OTHER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY');

-- CreateEnum
CREATE TYPE "CertificationAgency" AS ENUM ('PADI', 'SSI', 'OTHER');

-- CreateEnum
CREATE TYPE "CertificationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'PENDING_CARD', 'ISSUED');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('REVENUE', 'EXPENSE');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('BOAT', 'TEMPO', 'FREELANCER', 'SNACKS', 'SALARY', 'MARKETING', 'EQUIPMENT', 'MAINTENANCE', 'OTHER');

-- CreateEnum
CREATE TYPE "RevenueCategory" AS ENUM ('BOOKING', 'COURSE', 'MERCHANDISE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReviewSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');

-- CreateEnum
CREATE TYPE "ReviewReplyStatus" AS ENUM ('PENDING', 'REPLIED', 'NOT_NEEDED');

-- CreateEnum
CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'YOUTUBE', 'FACEBOOK', 'LINKEDIN', 'EXPLURGER', 'GOOGLE_BUSINESS');

-- CreateEnum
CREATE TYPE "FollowUpType" AS ENUM ('REPEAT_GUEST', 'BIRTHDAY', 'CERTIFICATION_REMINDER', 'GENERAL');

-- CreateEnum
CREATE TYPE "FollowUpChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'CALL');

-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'DONE', 'SNOOZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('UPCOMING_COURSE', 'PENDING_PAYMENT', 'PENDING_FREELANCER_PAYMENT', 'PENDING_CERTIFICATION', 'DAILY_REMINDER', 'GENERAL');

-- CreateEnum
CREATE TYPE "VendorPaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'INSTRUCTOR',
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "nationality" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "medicalDeclaration" BOOLEAN NOT NULL DEFAULT false,
    "medicalNotes" TEXT,
    "swimmingStatus" "SwimmingStatus" NOT NULL DEFAULT 'COMPETENT_SWIMMER',
    "certificationLevel" "CertificationLevel" NOT NULL DEFAULT 'NONE',
    "previousDives" INTEGER NOT NULL DEFAULT 0,
    "dateOfBirth" DATE,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dive_sites" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dive_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boats" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "guestId" UUID NOT NULL,
    "instructorId" UUID,
    "boatId" UUID,
    "diveSiteId" UUID,
    "activityType" "ActivityType" NOT NULL,
    "date" DATE NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'PENDING',
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "guestId" UUID NOT NULL,
    "bookingId" UUID,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "dueDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boat_sharing_entries" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "boatId" UUID,
    "boatVendorName" TEXT,
    "boatAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "tempoAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ffGuests" INTEGER NOT NULL DEFAULT 0,
    "dgGuests" INTEGER NOT NULL DEFAULT 0,
    "seiGuests" INTEGER NOT NULL DEFAULT 0,
    "totalGuests" INTEGER NOT NULL DEFAULT 0,
    "vendorPaymentStatus" "VendorPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "outstandingAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boat_sharing_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boat_sharing_splits" (
    "id" UUID NOT NULL,
    "entryId" UUID NOT NULL,
    "partyName" TEXT NOT NULL,
    "guestCount" INTEGER NOT NULL DEFAULT 0,
    "amountDue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "boat_sharing_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_attendance" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "staff_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freelancers" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "dayRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "freelancers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freelancer_attendance" (
    "id" UUID NOT NULL,
    "freelancerId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,

    CONSTRAINT "freelancer_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "freelancer_payments" (
    "id" UUID NOT NULL,
    "freelancerId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" DATE,
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "freelancer_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "snack_logs" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "snackBoxCount" INTEGER NOT NULL DEFAULT 0,
    "buffetCount" INTEGER NOT NULL DEFAULT 0,
    "cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "snack_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dive_logs" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "diveSiteId" UUID,
    "visibility" INTEGER,
    "current" TEXT,
    "temperature" DOUBLE PRECISION,
    "weather" TEXT,
    "marineLifeSeen" TEXT,
    "instructorId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dive_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "certification_courses" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "agency" "CertificationAgency" NOT NULL,
    "track" TEXT,

    CONSTRAINT "certification_courses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guest_certifications" (
    "id" UUID NOT NULL,
    "guestId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "instructorId" UUID,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "CertificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "certificateNumber" TEXT,
    "startDate" DATE,
    "completionDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guest_certifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance_transactions" (
    "id" UUID NOT NULL,
    "type" "TransactionType" NOT NULL,
    "expenseCategory" "ExpenseCategory",
    "revenueCategory" "RevenueCategory",
    "amount" DECIMAL(10,2) NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT,
    "guestId" UUID,
    "bookingId" UUID,
    "boatSharingEntryId" UUID,
    "freelancerId" UUID,
    "createdById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "finance_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "google_reviews" (
    "id" UUID NOT NULL,
    "reviewerName" TEXT NOT NULL,
    "guestId" UUID,
    "rating" INTEGER NOT NULL,
    "reviewText" TEXT,
    "reviewDate" DATE NOT NULL,
    "replyStatus" "ReviewReplyStatus" NOT NULL DEFAULT 'PENDING',
    "instructorMentionedId" UUID,
    "sentiment" "ReviewSentiment",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "google_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "social_media_posts" (
    "id" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "postDate" DATE NOT NULL,
    "url" TEXT,
    "caption" TEXT,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "leadsGenerated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_media_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "follow_ups" (
    "id" UUID NOT NULL,
    "guestId" UUID NOT NULL,
    "type" "FollowUpType" NOT NULL,
    "channel" "FollowUpChannel" NOT NULL DEFAULT 'WHATSAPP',
    "dueDate" DATE NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING',
    "assignedToId" UUID,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "follow_ups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "targetUserId" UUID,
    "targetRole" "UserRole",
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "entityType" TEXT,
    "entityId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seasons" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_ops_logs" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "weather" TEXT,
    "visibility" INTEGER,
    "seaCondition" TEXT,
    "notes" TEXT,

    CONSTRAINT "daily_ops_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "guests_phone_idx" ON "guests"("phone");

-- CreateIndex
CREATE INDEX "guests_email_idx" ON "guests"("email");

-- CreateIndex
CREATE INDEX "guests_fullName_idx" ON "guests"("fullName");

-- CreateIndex
CREATE UNIQUE INDEX "dive_sites_name_key" ON "dive_sites"("name");

-- CreateIndex
CREATE INDEX "bookings_date_idx" ON "bookings"("date");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_guestId_idx" ON "bookings"("guestId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE INDEX "payments_guestId_idx" ON "payments"("guestId");

-- CreateIndex
CREATE INDEX "boat_sharing_entries_date_idx" ON "boat_sharing_entries"("date");

-- CreateIndex
CREATE INDEX "staff_attendance_date_idx" ON "staff_attendance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "staff_attendance_userId_date_key" ON "staff_attendance"("userId", "date");

-- CreateIndex
CREATE INDEX "freelancer_attendance_date_idx" ON "freelancer_attendance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "freelancer_attendance_freelancerId_date_key" ON "freelancer_attendance"("freelancerId", "date");

-- CreateIndex
CREATE INDEX "freelancer_payments_status_idx" ON "freelancer_payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "snack_logs_date_key" ON "snack_logs"("date");

-- CreateIndex
CREATE INDEX "dive_logs_date_idx" ON "dive_logs"("date");

-- CreateIndex
CREATE UNIQUE INDEX "certification_courses_name_agency_key" ON "certification_courses"("name", "agency");

-- CreateIndex
CREATE INDEX "guest_certifications_status_idx" ON "guest_certifications"("status");

-- CreateIndex
CREATE INDEX "finance_transactions_date_idx" ON "finance_transactions"("date");

-- CreateIndex
CREATE INDEX "finance_transactions_type_idx" ON "finance_transactions"("type");

-- CreateIndex
CREATE INDEX "google_reviews_reviewDate_idx" ON "google_reviews"("reviewDate");

-- CreateIndex
CREATE INDEX "social_media_posts_platform_postDate_idx" ON "social_media_posts"("platform", "postDate");

-- CreateIndex
CREATE INDEX "follow_ups_dueDate_idx" ON "follow_ups"("dueDate");

-- CreateIndex
CREATE INDEX "follow_ups_status_idx" ON "follow_ups"("status");

-- CreateIndex
CREATE INDEX "notifications_targetUserId_isRead_idx" ON "notifications"("targetUserId", "isRead");

-- CreateIndex
CREATE UNIQUE INDEX "seasons_name_key" ON "seasons"("name");

-- CreateIndex
CREATE UNIQUE INDEX "daily_ops_logs_date_key" ON "daily_ops_logs"("date");

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "boats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_diveSiteId_fkey" FOREIGN KEY ("diveSiteId") REFERENCES "dive_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boat_sharing_entries" ADD CONSTRAINT "boat_sharing_entries_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "boats"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boat_sharing_splits" ADD CONSTRAINT "boat_sharing_splits_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "boat_sharing_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_attendance" ADD CONSTRAINT "staff_attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelancer_attendance" ADD CONSTRAINT "freelancer_attendance_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "freelancers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "freelancer_payments" ADD CONSTRAINT "freelancer_payments_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "freelancers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dive_logs" ADD CONSTRAINT "dive_logs_diveSiteId_fkey" FOREIGN KEY ("diveSiteId") REFERENCES "dive_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dive_logs" ADD CONSTRAINT "dive_logs_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_certifications" ADD CONSTRAINT "guest_certifications_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_certifications" ADD CONSTRAINT "guest_certifications_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "certification_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "guest_certifications" ADD CONSTRAINT "guest_certifications_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_reviews" ADD CONSTRAINT "google_reviews_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "google_reviews" ADD CONSTRAINT "google_reviews_instructorMentionedId_fkey" FOREIGN KEY ("instructorMentionedId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
