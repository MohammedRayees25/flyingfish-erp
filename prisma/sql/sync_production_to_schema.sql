-- =============================================================================
-- Flying Fish Scuba School ERP — full production schema sync
--
-- Idempotent, additive-only. Brings a production database (in any partially
-- migrated state) fully in line with the current prisma/schema.prisma:
--   1. Creates every enum type if it doesn't already exist
--   2. Creates every table if it doesn't already exist (with every column)
--   3. Renames legacy lowercase-folded columns to their correct camelCase
--      name where one exists and the correct name doesn't (preserves data --
--      this is the fix for columns silently created without quoted
--      identifiers at some point, e.g. by a manual/unquoted ALTER TABLE)
--   4. Adds every column to every table if it's still missing
--   5. Creates every index if it doesn't already exist
--   6. Adds every foreign key if it doesn't already exist
--   7. Runs verification queries so you can confirm the result
--
-- Contains no DROP, TRUNCATE, or other destructive statement. Every write is
-- guarded so re-running this script is always safe. Generated from
-- prisma/schema.prisma via `prisma migrate diff --from-empty`, then made
-- idempotent -- this is not a substitute for prisma/migrations/*, it's a
-- one-off repair script for a database Prisma Migrate doesn't have full
-- tracked history for. Run prisma/sql/check_migration_state.sql first if
-- you haven't already, to see what's actually missing before running this.
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Schema
-- ---------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS "public";

-- ---------------------------------------------------------------------------
-- 2. Enum types
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE "UserRole" AS ENUM ('SUPER_ADMIN', 'FOUNDER', 'MANAGER', 'INSTRUCTOR', 'MARKETING', 'ACCOUNTANT');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SwimmingStatus" AS ENUM ('NON_SWIMMER', 'WEAK_SWIMMER', 'COMPETENT_SWIMMER', 'STRONG_SWIMMER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CertificationLevel" AS ENUM ('NONE', 'OPEN_WATER', 'ADVANCED_OPEN_WATER', 'RESCUE', 'DIVEMASTER', 'INSTRUCTOR', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ActivityType" AS ENUM ('BOAT_RIDE', 'SHORT_DIVE', 'LONG_DIVE', 'LONG_DOUBLE_DIVE', 'FUN_DIVE', 'DIVE_GOA', 'SEI', 'FLYING_FISH', 'PADI_OWD', 'SSI_OWD', 'PADI_AOW', 'SSI_AOW', 'EANX', 'RESCUE', 'REACT_RIGHT', 'PPB', 'ADVANCED_ADVENTURE', 'WRECK_SPECIALTY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "BookingStatus" AS ENUM ('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'CARD', 'UPI', 'BANK_TRANSFER', 'ONLINE_GATEWAY', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'REFUNDED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'HALF_DAY', 'LEAVE', 'HOLIDAY');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CertificationAgency" AS ENUM ('PADI', 'SSI', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CertificationStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'PENDING_CARD', 'ISSUED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "TransactionType" AS ENUM ('REVENUE', 'EXPENSE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ExpenseCategory" AS ENUM ('BOAT', 'TEMPO', 'FREELANCER', 'SNACKS', 'SALARY', 'MARKETING', 'EQUIPMENT', 'MAINTENANCE', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "RevenueCategory" AS ENUM ('BOOKING', 'COURSE', 'MERCHANDISE', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReviewSentiment" AS ENUM ('POSITIVE', 'NEUTRAL', 'NEGATIVE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "ReviewReplyStatus" AS ENUM ('PENDING', 'REPLIED', 'NOT_NEEDED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "SocialPlatform" AS ENUM ('INSTAGRAM', 'YOUTUBE', 'FACEBOOK', 'LINKEDIN', 'EXPLURGER', 'GOOGLE_BUSINESS');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FollowUpType" AS ENUM ('REPEAT_GUEST', 'BIRTHDAY', 'CERTIFICATION_REMINDER', 'GENERAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FollowUpChannel" AS ENUM ('WHATSAPP', 'EMAIL', 'CALL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "FollowUpStatus" AS ENUM ('PENDING', 'DONE', 'SNOOZED', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "NotificationType" AS ENUM ('UPCOMING_COURSE', 'PENDING_PAYMENT', 'PENDING_FREELANCER_PAYMENT', 'PENDING_CERTIFICATION', 'DAILY_REMINDER', 'GENERAL');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "VendorPaymentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "LeadStage" AS ENUM ('NEW', 'CONTACTED', 'INTERESTED', 'BOOKED', 'COMPLETED', 'LOST');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Tables (created in full if they don't exist yet)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phone" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'INSTRUCTOR',
    "avatarUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "monthlySalary" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "guests" (
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

CREATE TABLE IF NOT EXISTS "dive_sites" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dive_sites_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "boats" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "vendor" TEXT,
    "capacity" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "boats_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "activity_rates" (
    "id" UUID NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "activity_rates_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "bookings" (
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

CREATE TABLE IF NOT EXISTS "payments" (
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

CREATE TABLE IF NOT EXISTS "boat_sharing_entries" (
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

CREATE TABLE IF NOT EXISTS "boat_sharing_splits" (
    "id" UUID NOT NULL,
    "entryId" UUID NOT NULL,
    "partyName" TEXT NOT NULL,
    "guestCount" INTEGER NOT NULL DEFAULT 0,
    "amountDue" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    CONSTRAINT "boat_sharing_splits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "boat_vendor_payments" (
    "id" UUID NOT NULL,
    "entryId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "boat_vendor_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "staff_attendance" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "staff_attendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "staff_salary_payments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "staff_salary_payments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "freelancers" (
    "id" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone" TEXT,
    "dayRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "freelancers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "freelancer_attendance" (
    "id" UUID NOT NULL,
    "freelancerId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "notes" TEXT,
    CONSTRAINT "freelancer_attendance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "freelancer_payments" (
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

CREATE TABLE IF NOT EXISTS "snack_logs" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "snackBoxCount" INTEGER NOT NULL DEFAULT 0,
    "buffetCount" INTEGER NOT NULL DEFAULT 0,
    "cost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "snack_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "snack_items" (
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

CREATE TABLE IF NOT EXISTS "snack_purchases" (
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

CREATE TABLE IF NOT EXISTS "snack_consumptions" (
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

CREATE TABLE IF NOT EXISTS "dive_logs" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "diveSiteId" UUID,
    "boatId" UUID,
    "instructorId" UUID,
    "entryTime" TIMESTAMP(3),
    "exitTime" TIMESTAMP(3),
    "bottomTimeMin" INTEGER,
    "maxDepth" DOUBLE PRECISION,
    "visibility" INTEGER,
    "current" TEXT,
    "weather" TEXT,
    "temperature" DOUBLE PRECISION,
    "equipmentUsed" TEXT,
    "cylinderType" TEXT,
    "weightsUsedKg" DOUBLE PRECISION,
    "marineLifeSeen" TEXT,
    "problems" TEXT,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dive_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "dive_log_guests" (
    "id" UUID NOT NULL,
    "diveLogId" UUID NOT NULL,
    "guestId" UUID NOT NULL,
    CONSTRAINT "dive_log_guests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "certification_courses" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "agency" "CertificationAgency" NOT NULL,
    "track" TEXT,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    CONSTRAINT "certification_courses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "guest_certifications" (
    "id" UUID NOT NULL,
    "guestId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "instructorId" UUID,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" "CertificationStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "theoryCompletedAt" DATE,
    "poolCompletedAt" DATE,
    "openWaterDivesCompleted" INTEGER NOT NULL DEFAULT 0,
    "openWaterDivesRequired" INTEGER NOT NULL DEFAULT 4,
    "examPassedAt" DATE,
    "certificateNumber" TEXT,
    "startDate" DATE,
    "completionDate" DATE,
    "issueDate" DATE,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "guest_certifications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "finance_transactions" (
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

CREATE TABLE IF NOT EXISTS "google_reviews" (
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

CREATE TABLE IF NOT EXISTS "social_media_posts" (
    "id" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "postDate" DATE NOT NULL,
    "url" TEXT,
    "caption" TEXT,
    "isReel" BOOLEAN NOT NULL DEFAULT false,
    "views" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "saves" INTEGER NOT NULL DEFAULT 0,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "leadsGenerated" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "social_media_posts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "social_follower_snapshots" (
    "id" UUID NOT NULL,
    "platform" "SocialPlatform" NOT NULL,
    "date" DATE NOT NULL,
    "followers" INTEGER NOT NULL,
    CONSTRAINT "social_follower_snapshots_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "follow_ups" (
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

CREATE TABLE IF NOT EXISTS "leads" (
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

CREATE TABLE IF NOT EXISTS "notifications" (
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

CREATE TABLE IF NOT EXISTS "seasons" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "seasons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "daily_ops_logs" (
    "id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "weather" TEXT,
    "visibility" INTEGER,
    "seaCondition" TEXT,
    "notes" TEXT,
    CONSTRAINT "daily_ops_logs_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "company_settings" (
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

CREATE TABLE IF NOT EXISTS "rental_items" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "dailyRate" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "rental_items_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" UUID NOT NULL,
    "userId" UUID,
    "action" "AuditAction" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 4. Legacy lowercase column migration
--
-- If this database was ever altered with an unquoted column name (e.g. a
-- manual "ALTER TABLE ... ADD COLUMN openWaterDivesCompleted ..." without
-- double quotes), Postgres silently folds it to all-lowercase
-- ("openwaterdivescompleted"), which is invisible to Prisma's quoted-identifier
-- queries -- it looks identical to a genuinely missing column at runtime. This
-- section renames any such lowercase-folded column to the correct camelCase
-- name (preserving all data) wherever one is found. It's a no-op for any
-- column that's already correctly cased, or genuinely doesn't exist yet.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  col RECORD;
  legacy_name TEXT;
BEGIN
  FOR col IN
    SELECT DISTINCT table_name, column_name AS camel_name
    FROM (VALUES
      ('users', 'fullName'),
      ('users', 'avatarUrl'),
      ('users', 'isActive'),
      ('users', 'monthlySalary'),
      ('users', 'createdAt'),
      ('users', 'updatedAt'),
      ('guests', 'fullName'),
      ('guests', 'emergencyContactName'),
      ('guests', 'emergencyContactPhone'),
      ('guests', 'medicalDeclaration'),
      ('guests', 'medicalNotes'),
      ('guests', 'swimmingStatus'),
      ('guests', 'certificationLevel'),
      ('guests', 'previousDives'),
      ('guests', 'dateOfBirth'),
      ('guests', 'createdAt'),
      ('guests', 'updatedAt'),
      ('dive_sites', 'createdAt'),
      ('boats', 'isActive'),
      ('boats', 'createdAt'),
      ('activity_rates', 'activityType'),
      ('activity_rates', 'isActive'),
      ('activity_rates', 'updatedAt'),
      ('bookings', 'guestId'),
      ('bookings', 'instructorId'),
      ('bookings', 'boatId'),
      ('bookings', 'diveSiteId'),
      ('bookings', 'activityType'),
      ('bookings', 'createdAt'),
      ('bookings', 'updatedAt'),
      ('payments', 'guestId'),
      ('payments', 'bookingId'),
      ('payments', 'paidAt'),
      ('payments', 'dueDate'),
      ('payments', 'createdAt'),
      ('boat_sharing_entries', 'boatId'),
      ('boat_sharing_entries', 'boatVendorName'),
      ('boat_sharing_entries', 'boatAmount'),
      ('boat_sharing_entries', 'tempoAmount'),
      ('boat_sharing_entries', 'ffGuests'),
      ('boat_sharing_entries', 'dgGuests'),
      ('boat_sharing_entries', 'seiGuests'),
      ('boat_sharing_entries', 'totalGuests'),
      ('boat_sharing_entries', 'vendorPaymentStatus'),
      ('boat_sharing_entries', 'outstandingAmount'),
      ('boat_sharing_entries', 'createdAt'),
      ('boat_sharing_entries', 'updatedAt'),
      ('boat_sharing_splits', 'entryId'),
      ('boat_sharing_splits', 'partyName'),
      ('boat_sharing_splits', 'guestCount'),
      ('boat_sharing_splits', 'amountDue'),
      ('boat_sharing_splits', 'amountPaid'),
      ('boat_vendor_payments', 'entryId'),
      ('boat_vendor_payments', 'paidAt'),
      ('boat_vendor_payments', 'createdAt'),
      ('staff_attendance', 'userId'),
      ('staff_attendance', 'createdAt'),
      ('staff_salary_payments', 'userId'),
      ('staff_salary_payments', 'paidAt'),
      ('staff_salary_payments', 'createdAt'),
      ('freelancers', 'fullName'),
      ('freelancers', 'dayRate'),
      ('freelancers', 'isActive'),
      ('freelancers', 'createdAt'),
      ('freelancer_attendance', 'freelancerId'),
      ('freelancer_payments', 'freelancerId'),
      ('freelancer_payments', 'dueDate'),
      ('freelancer_payments', 'paidAt'),
      ('freelancer_payments', 'createdAt'),
      ('snack_logs', 'snackBoxCount'),
      ('snack_logs', 'buffetCount'),
      ('snack_logs', 'createdAt'),
      ('snack_items', 'costPerUnit'),
      ('snack_items', 'currentStock'),
      ('snack_items', 'reorderLevel'),
      ('snack_items', 'isActive'),
      ('snack_items', 'createdAt'),
      ('snack_purchases', 'itemId'),
      ('snack_purchases', 'unitCost'),
      ('snack_purchases', 'totalCost'),
      ('snack_purchases', 'createdAt'),
      ('snack_consumptions', 'itemId'),
      ('snack_consumptions', 'guestId'),
      ('snack_consumptions', 'boatId'),
      ('snack_consumptions', 'createdAt'),
      ('dive_logs', 'diveSiteId'),
      ('dive_logs', 'boatId'),
      ('dive_logs', 'instructorId'),
      ('dive_logs', 'entryTime'),
      ('dive_logs', 'exitTime'),
      ('dive_logs', 'bottomTimeMin'),
      ('dive_logs', 'maxDepth'),
      ('dive_logs', 'equipmentUsed'),
      ('dive_logs', 'cylinderType'),
      ('dive_logs', 'weightsUsedKg'),
      ('dive_logs', 'marineLifeSeen'),
      ('dive_logs', 'photoUrls'),
      ('dive_logs', 'createdAt'),
      ('dive_log_guests', 'diveLogId'),
      ('dive_log_guests', 'guestId'),
      ('guest_certifications', 'guestId'),
      ('guest_certifications', 'courseId'),
      ('guest_certifications', 'instructorId'),
      ('guest_certifications', 'theoryCompletedAt'),
      ('guest_certifications', 'poolCompletedAt'),
      ('guest_certifications', 'openWaterDivesCompleted'),
      ('guest_certifications', 'openWaterDivesRequired'),
      ('guest_certifications', 'examPassedAt'),
      ('guest_certifications', 'certificateNumber'),
      ('guest_certifications', 'startDate'),
      ('guest_certifications', 'completionDate'),
      ('guest_certifications', 'issueDate'),
      ('guest_certifications', 'createdAt'),
      ('guest_certifications', 'updatedAt'),
      ('finance_transactions', 'expenseCategory'),
      ('finance_transactions', 'revenueCategory'),
      ('finance_transactions', 'guestId'),
      ('finance_transactions', 'bookingId'),
      ('finance_transactions', 'boatSharingEntryId'),
      ('finance_transactions', 'freelancerId'),
      ('finance_transactions', 'createdById'),
      ('finance_transactions', 'createdAt'),
      ('google_reviews', 'reviewerName'),
      ('google_reviews', 'guestId'),
      ('google_reviews', 'reviewText'),
      ('google_reviews', 'reviewDate'),
      ('google_reviews', 'replyStatus'),
      ('google_reviews', 'instructorMentionedId'),
      ('google_reviews', 'createdAt'),
      ('social_media_posts', 'postDate'),
      ('social_media_posts', 'isReel'),
      ('social_media_posts', 'leadsGenerated'),
      ('social_media_posts', 'createdAt'),
      ('follow_ups', 'guestId'),
      ('follow_ups', 'dueDate'),
      ('follow_ups', 'assignedToId'),
      ('follow_ups', 'createdAt'),
      ('leads', 'fullName'),
      ('leads', 'assignedToId'),
      ('leads', 'followUpAt'),
      ('leads', 'isRepeatCustomer'),
      ('leads', 'referredById'),
      ('leads', 'guestId'),
      ('leads', 'createdAt'),
      ('leads', 'updatedAt'),
      ('notifications', 'targetUserId'),
      ('notifications', 'targetRole'),
      ('notifications', 'isRead'),
      ('notifications', 'entityType'),
      ('notifications', 'entityId'),
      ('notifications', 'createdAt'),
      ('seasons', 'startDate'),
      ('seasons', 'endDate'),
      ('seasons', 'isActive'),
      ('daily_ops_logs', 'seaCondition'),
      ('company_settings', 'companyName'),
      ('company_settings', 'logoUrl'),
      ('company_settings', 'gstNumber'),
      ('company_settings', 'emailNotificationsEnabled'),
      ('company_settings', 'whatsappNotificationsEnabled'),
      ('company_settings', 'updatedAt'),
      ('rental_items', 'dailyRate'),
      ('rental_items', 'isActive'),
      ('rental_items', 'updatedAt'),
      ('audit_logs', 'userId'),
      ('audit_logs', 'entityType'),
      ('audit_logs', 'entityId'),
      ('audit_logs', 'createdAt')
    ) AS expected(table_name, column_name)
  LOOP
    legacy_name := lower(col.camel_name);
    IF legacy_name <> col.camel_name
       AND EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = col.table_name
           AND column_name = legacy_name
       )
       AND NOT EXISTS (
         SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public' AND table_name = col.table_name
           AND column_name = col.camel_name
       )
    THEN
      EXECUTE format(
        'ALTER TABLE %I RENAME COLUMN %I TO %I',
        col.table_name, legacy_name, col.camel_name
      );
      RAISE NOTICE 'Renamed %.% -> %.%"', col.table_name, legacy_name, col.table_name, col.camel_name;
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Columns (added to already-existing tables if still missing)
--
-- NOT NULL is kept only where the column also has a DEFAULT (safe to backfill
-- existing rows with automatically). A handful of columns below are genuinely
-- required NOT NULL in the Prisma schema but have no default and reference
-- foreign keys / core business data -- for those, this section adds the
-- column nullable instead of forcing NOT NULL, so the migration can never
-- fail or invent data on a table that already has rows. Every one of them is
-- flagged inline below with NEEDS BACKFILL. Check these after running this
-- script -- if the column came back genuinely empty (the table pre-existed
-- without it), backfill real values, then tighten with:
--   ALTER TABLE "<table>" ALTER COLUMN "<column>" SET NOT NULL;
-- ---------------------------------------------------------------------------
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "email" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "fullName" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "role" "UserRole" NOT NULL DEFAULT 'INSTRUCTOR';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "monthlySalary" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3); -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "fullName" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "phone" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "nationality" TEXT;
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "emergencyContactName" TEXT;
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "emergencyContactPhone" TEXT;
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "medicalDeclaration" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "medicalNotes" TEXT;
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "swimmingStatus" "SwimmingStatus" NOT NULL DEFAULT 'COMPETENT_SWIMMER';
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "certificationLevel" "CertificationLevel" NOT NULL DEFAULT 'NONE';
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "previousDives" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "dateOfBirth" DATE;
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "guests" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3); -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "dive_sites" ADD COLUMN IF NOT EXISTS "name" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "dive_sites" ADD COLUMN IF NOT EXISTS "location" TEXT;
ALTER TABLE "dive_sites" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "dive_sites" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "boats" ADD COLUMN IF NOT EXISTS "name" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "boats" ADD COLUMN IF NOT EXISTS "vendor" TEXT;
ALTER TABLE "boats" ADD COLUMN IF NOT EXISTS "capacity" INTEGER;
ALTER TABLE "boats" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "boats" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "activity_rates" ADD COLUMN IF NOT EXISTS "activityType" "ActivityType"; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "activity_rates" ADD COLUMN IF NOT EXISTS "price" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "activity_rates" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "activity_rates" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3); -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "guestId" UUID; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "instructorId" UUID;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "boatId" UUID;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "diveSiteId" UUID;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "activityType" "ActivityType"; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "date" DATE; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "status" "BookingStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "price" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3); -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "guestId" UUID; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "bookingId" UUID;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(10,2); -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "method" "PaymentMethod" NOT NULL DEFAULT 'CASH';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "dueDate" DATE;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "boat_sharing_entries" ADD COLUMN IF NOT EXISTS "date" DATE; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "boat_sharing_entries" ADD COLUMN IF NOT EXISTS "boatId" UUID;
ALTER TABLE "boat_sharing_entries" ADD COLUMN IF NOT EXISTS "boatVendorName" TEXT;
ALTER TABLE "boat_sharing_entries" ADD COLUMN IF NOT EXISTS "boatAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "boat_sharing_entries" ADD COLUMN IF NOT EXISTS "tempoAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "boat_sharing_entries" ADD COLUMN IF NOT EXISTS "ffGuests" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "boat_sharing_entries" ADD COLUMN IF NOT EXISTS "dgGuests" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "boat_sharing_entries" ADD COLUMN IF NOT EXISTS "seiGuests" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "boat_sharing_entries" ADD COLUMN IF NOT EXISTS "totalGuests" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "boat_sharing_entries" ADD COLUMN IF NOT EXISTS "vendorPaymentStatus" "VendorPaymentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "boat_sharing_entries" ADD COLUMN IF NOT EXISTS "outstandingAmount" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "boat_sharing_entries" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "boat_sharing_entries" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "boat_sharing_entries" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3); -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "boat_sharing_splits" ADD COLUMN IF NOT EXISTS "entryId" UUID; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "boat_sharing_splits" ADD COLUMN IF NOT EXISTS "partyName" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "boat_sharing_splits" ADD COLUMN IF NOT EXISTS "guestCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "boat_sharing_splits" ADD COLUMN IF NOT EXISTS "amountDue" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "boat_sharing_splits" ADD COLUMN IF NOT EXISTS "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "boat_sharing_splits" ADD COLUMN IF NOT EXISTS "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "boat_vendor_payments" ADD COLUMN IF NOT EXISTS "entryId" UUID; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "boat_vendor_payments" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(10,2); -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "boat_vendor_payments" ADD COLUMN IF NOT EXISTS "method" "PaymentMethod" NOT NULL DEFAULT 'CASH';
ALTER TABLE "boat_vendor_payments" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "boat_vendor_payments" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "boat_vendor_payments" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "staff_attendance" ADD COLUMN IF NOT EXISTS "userId" UUID; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "staff_attendance" ADD COLUMN IF NOT EXISTS "date" DATE; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "staff_attendance" ADD COLUMN IF NOT EXISTS "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT';
ALTER TABLE "staff_attendance" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "staff_attendance" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "staff_salary_payments" ADD COLUMN IF NOT EXISTS "userId" UUID; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "staff_salary_payments" ADD COLUMN IF NOT EXISTS "month" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "staff_salary_payments" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(10,2); -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "staff_salary_payments" ADD COLUMN IF NOT EXISTS "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "staff_salary_payments" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "staff_salary_payments" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "staff_salary_payments" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "freelancers" ADD COLUMN IF NOT EXISTS "fullName" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "freelancers" ADD COLUMN IF NOT EXISTS "role" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "freelancers" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "freelancers" ADD COLUMN IF NOT EXISTS "dayRate" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "freelancers" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "freelancers" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "freelancer_attendance" ADD COLUMN IF NOT EXISTS "freelancerId" UUID; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "freelancer_attendance" ADD COLUMN IF NOT EXISTS "date" DATE; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "freelancer_attendance" ADD COLUMN IF NOT EXISTS "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT';
ALTER TABLE "freelancer_attendance" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "freelancer_payments" ADD COLUMN IF NOT EXISTS "freelancerId" UUID; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "freelancer_payments" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(10,2); -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "freelancer_payments" ADD COLUMN IF NOT EXISTS "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "freelancer_payments" ADD COLUMN IF NOT EXISTS "dueDate" DATE;
ALTER TABLE "freelancer_payments" ADD COLUMN IF NOT EXISTS "paidAt" TIMESTAMP(3);
ALTER TABLE "freelancer_payments" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "freelancer_payments" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "snack_logs" ADD COLUMN IF NOT EXISTS "date" DATE; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "snack_logs" ADD COLUMN IF NOT EXISTS "snackBoxCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "snack_logs" ADD COLUMN IF NOT EXISTS "buffetCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "snack_logs" ADD COLUMN IF NOT EXISTS "cost" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "snack_logs" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "snack_logs" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "snack_items" ADD COLUMN IF NOT EXISTS "name" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "snack_items" ADD COLUMN IF NOT EXISTS "unit" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "snack_items" ADD COLUMN IF NOT EXISTS "costPerUnit" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "snack_items" ADD COLUMN IF NOT EXISTS "currentStock" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "snack_items" ADD COLUMN IF NOT EXISTS "reorderLevel" INTEGER NOT NULL DEFAULT 10;
ALTER TABLE "snack_items" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "snack_items" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "snack_purchases" ADD COLUMN IF NOT EXISTS "itemId" UUID; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "snack_purchases" ADD COLUMN IF NOT EXISTS "date" DATE; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "snack_purchases" ADD COLUMN IF NOT EXISTS "quantity" INTEGER; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "snack_purchases" ADD COLUMN IF NOT EXISTS "unitCost" DECIMAL(10,2); -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "snack_purchases" ADD COLUMN IF NOT EXISTS "totalCost" DECIMAL(10,2); -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "snack_purchases" ADD COLUMN IF NOT EXISTS "vendor" TEXT;
ALTER TABLE "snack_purchases" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "snack_purchases" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "snack_consumptions" ADD COLUMN IF NOT EXISTS "itemId" UUID; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "snack_consumptions" ADD COLUMN IF NOT EXISTS "date" DATE; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "snack_consumptions" ADD COLUMN IF NOT EXISTS "quantity" INTEGER; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "snack_consumptions" ADD COLUMN IF NOT EXISTS "guestId" UUID;
ALTER TABLE "snack_consumptions" ADD COLUMN IF NOT EXISTS "boatId" UUID;
ALTER TABLE "snack_consumptions" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "snack_consumptions" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "dive_logs" ADD COLUMN IF NOT EXISTS "date" DATE; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "dive_logs" ADD COLUMN IF NOT EXISTS "diveSiteId" UUID;
ALTER TABLE "dive_logs" ADD COLUMN IF NOT EXISTS "boatId" UUID;
ALTER TABLE "dive_logs" ADD COLUMN IF NOT EXISTS "instructorId" UUID;
ALTER TABLE "dive_logs" ADD COLUMN IF NOT EXISTS "entryTime" TIMESTAMP(3);
ALTER TABLE "dive_logs" ADD COLUMN IF NOT EXISTS "exitTime" TIMESTAMP(3);
ALTER TABLE "dive_logs" ADD COLUMN IF NOT EXISTS "bottomTimeMin" INTEGER;
ALTER TABLE "dive_logs" ADD COLUMN IF NOT EXISTS "maxDepth" DOUBLE PRECISION;
ALTER TABLE "dive_logs" ADD COLUMN IF NOT EXISTS "visibility" INTEGER;
ALTER TABLE "dive_logs" ADD COLUMN IF NOT EXISTS "current" TEXT;
ALTER TABLE "dive_logs" ADD COLUMN IF NOT EXISTS "weather" TEXT;
ALTER TABLE "dive_logs" ADD COLUMN IF NOT EXISTS "temperature" DOUBLE PRECISION;
ALTER TABLE "dive_logs" ADD COLUMN IF NOT EXISTS "equipmentUsed" TEXT;
ALTER TABLE "dive_logs" ADD COLUMN IF NOT EXISTS "cylinderType" TEXT;
ALTER TABLE "dive_logs" ADD COLUMN IF NOT EXISTS "weightsUsedKg" DOUBLE PRECISION;
ALTER TABLE "dive_logs" ADD COLUMN IF NOT EXISTS "marineLifeSeen" TEXT;
ALTER TABLE "dive_logs" ADD COLUMN IF NOT EXISTS "problems" TEXT;
ALTER TABLE "dive_logs" ADD COLUMN IF NOT EXISTS "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "dive_logs" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "dive_logs" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "dive_log_guests" ADD COLUMN IF NOT EXISTS "diveLogId" UUID; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "dive_log_guests" ADD COLUMN IF NOT EXISTS "guestId" UUID; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "certification_courses" ADD COLUMN IF NOT EXISTS "name" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "certification_courses" ADD COLUMN IF NOT EXISTS "agency" "CertificationAgency"; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "certification_courses" ADD COLUMN IF NOT EXISTS "track" TEXT;
ALTER TABLE "certification_courses" ADD COLUMN IF NOT EXISTS "price" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "guest_certifications" ADD COLUMN IF NOT EXISTS "guestId" UUID; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "guest_certifications" ADD COLUMN IF NOT EXISTS "courseId" UUID; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "guest_certifications" ADD COLUMN IF NOT EXISTS "instructorId" UUID;
ALTER TABLE "guest_certifications" ADD COLUMN IF NOT EXISTS "progress" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "guest_certifications" ADD COLUMN IF NOT EXISTS "status" "CertificationStatus" NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE "guest_certifications" ADD COLUMN IF NOT EXISTS "theoryCompletedAt" DATE;
ALTER TABLE "guest_certifications" ADD COLUMN IF NOT EXISTS "poolCompletedAt" DATE;
ALTER TABLE "guest_certifications" ADD COLUMN IF NOT EXISTS "openWaterDivesCompleted" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "guest_certifications" ADD COLUMN IF NOT EXISTS "openWaterDivesRequired" INTEGER NOT NULL DEFAULT 4;
ALTER TABLE "guest_certifications" ADD COLUMN IF NOT EXISTS "examPassedAt" DATE;
ALTER TABLE "guest_certifications" ADD COLUMN IF NOT EXISTS "certificateNumber" TEXT;
ALTER TABLE "guest_certifications" ADD COLUMN IF NOT EXISTS "startDate" DATE;
ALTER TABLE "guest_certifications" ADD COLUMN IF NOT EXISTS "completionDate" DATE;
ALTER TABLE "guest_certifications" ADD COLUMN IF NOT EXISTS "issueDate" DATE;
ALTER TABLE "guest_certifications" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "guest_certifications" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "guest_certifications" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3); -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "type" "TransactionType"; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "expenseCategory" "ExpenseCategory";
ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "revenueCategory" "RevenueCategory";
ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(10,2); -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "date" DATE; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "guestId" UUID;
ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "bookingId" UUID;
ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "boatSharingEntryId" UUID;
ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "freelancerId" UUID;
ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "createdById" UUID;
ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "google_reviews" ADD COLUMN IF NOT EXISTS "reviewerName" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "google_reviews" ADD COLUMN IF NOT EXISTS "guestId" UUID;
ALTER TABLE "google_reviews" ADD COLUMN IF NOT EXISTS "rating" INTEGER; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "google_reviews" ADD COLUMN IF NOT EXISTS "reviewText" TEXT;
ALTER TABLE "google_reviews" ADD COLUMN IF NOT EXISTS "reviewDate" DATE; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "google_reviews" ADD COLUMN IF NOT EXISTS "replyStatus" "ReviewReplyStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "google_reviews" ADD COLUMN IF NOT EXISTS "instructorMentionedId" UUID;
ALTER TABLE "google_reviews" ADD COLUMN IF NOT EXISTS "sentiment" "ReviewSentiment";
ALTER TABLE "google_reviews" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "social_media_posts" ADD COLUMN IF NOT EXISTS "platform" "SocialPlatform"; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "social_media_posts" ADD COLUMN IF NOT EXISTS "postDate" DATE; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "social_media_posts" ADD COLUMN IF NOT EXISTS "url" TEXT;
ALTER TABLE "social_media_posts" ADD COLUMN IF NOT EXISTS "caption" TEXT;
ALTER TABLE "social_media_posts" ADD COLUMN IF NOT EXISTS "isReel" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "social_media_posts" ADD COLUMN IF NOT EXISTS "views" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "social_media_posts" ADD COLUMN IF NOT EXISTS "likes" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "social_media_posts" ADD COLUMN IF NOT EXISTS "comments" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "social_media_posts" ADD COLUMN IF NOT EXISTS "shares" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "social_media_posts" ADD COLUMN IF NOT EXISTS "saves" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "social_media_posts" ADD COLUMN IF NOT EXISTS "reach" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "social_media_posts" ADD COLUMN IF NOT EXISTS "leadsGenerated" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "social_media_posts" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "social_follower_snapshots" ADD COLUMN IF NOT EXISTS "platform" "SocialPlatform"; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "social_follower_snapshots" ADD COLUMN IF NOT EXISTS "date" DATE; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "social_follower_snapshots" ADD COLUMN IF NOT EXISTS "followers" INTEGER; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "guestId" UUID; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "type" "FollowUpType"; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "channel" "FollowUpChannel" NOT NULL DEFAULT 'WHATSAPP';
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "dueDate" DATE; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "status" "FollowUpStatus" NOT NULL DEFAULT 'PENDING';
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "assignedToId" UUID;
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "follow_ups" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "fullName" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "phone" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "source" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "stage" "LeadStage" NOT NULL DEFAULT 'NEW';
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "assignedToId" UUID;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "followUpAt" TIMESTAMP(3);
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "isRepeatCustomer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "referredById" UUID;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "guestId" UUID;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3); -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "type" "NotificationType"; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "title" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "message" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "targetUserId" UUID;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "targetRole" "UserRole";
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "isRead" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "entityType" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "entityId" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "seasons" ADD COLUMN IF NOT EXISTS "name" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "seasons" ADD COLUMN IF NOT EXISTS "startDate" DATE; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "seasons" ADD COLUMN IF NOT EXISTS "endDate" DATE; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "seasons" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "daily_ops_logs" ADD COLUMN IF NOT EXISTS "date" DATE; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "daily_ops_logs" ADD COLUMN IF NOT EXISTS "weather" TEXT;
ALTER TABLE "daily_ops_logs" ADD COLUMN IF NOT EXISTS "visibility" INTEGER;
ALTER TABLE "daily_ops_logs" ADD COLUMN IF NOT EXISTS "seaCondition" TEXT;
ALTER TABLE "daily_ops_logs" ADD COLUMN IF NOT EXISTS "notes" TEXT;
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "companyName" TEXT NOT NULL DEFAULT 'Flying Fish Scuba School';
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "logoUrl" TEXT;
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "gstNumber" TEXT;
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "emailNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "whatsappNotificationsEnabled" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "company_settings" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3); -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "rental_items" ADD COLUMN IF NOT EXISTS "name" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "rental_items" ADD COLUMN IF NOT EXISTS "dailyRate" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "rental_items" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "rental_items" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3); -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "userId" UUID;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "action" "AuditAction"; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entityType" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entityId" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "summary" TEXT; -- NEEDS BACKFILL: schema declares this NOT NULL with no default
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- ---------------------------------------------------------------------------
-- 6. Indexes
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");
CREATE INDEX IF NOT EXISTS "guests_phone_idx" ON "guests"("phone");
CREATE INDEX IF NOT EXISTS "guests_email_idx" ON "guests"("email");
CREATE INDEX IF NOT EXISTS "guests_fullName_idx" ON "guests"("fullName");
CREATE UNIQUE INDEX IF NOT EXISTS "dive_sites_name_key" ON "dive_sites"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "activity_rates_activityType_key" ON "activity_rates"("activityType");
CREATE INDEX IF NOT EXISTS "bookings_date_idx" ON "bookings"("date");
CREATE INDEX IF NOT EXISTS "bookings_status_idx" ON "bookings"("status");
CREATE INDEX IF NOT EXISTS "bookings_guestId_idx" ON "bookings"("guestId");
CREATE INDEX IF NOT EXISTS "payments_status_idx" ON "payments"("status");
CREATE INDEX IF NOT EXISTS "payments_guestId_idx" ON "payments"("guestId");
CREATE INDEX IF NOT EXISTS "boat_sharing_entries_date_idx" ON "boat_sharing_entries"("date");
CREATE INDEX IF NOT EXISTS "boat_vendor_payments_entryId_idx" ON "boat_vendor_payments"("entryId");
CREATE INDEX IF NOT EXISTS "staff_attendance_date_idx" ON "staff_attendance"("date");
CREATE UNIQUE INDEX IF NOT EXISTS "staff_attendance_userId_date_key" ON "staff_attendance"("userId", "date");
CREATE INDEX IF NOT EXISTS "staff_salary_payments_month_idx" ON "staff_salary_payments"("month");
CREATE UNIQUE INDEX IF NOT EXISTS "staff_salary_payments_userId_month_key" ON "staff_salary_payments"("userId", "month");
CREATE INDEX IF NOT EXISTS "freelancer_attendance_date_idx" ON "freelancer_attendance"("date");
CREATE UNIQUE INDEX IF NOT EXISTS "freelancer_attendance_freelancerId_date_key" ON "freelancer_attendance"("freelancerId", "date");
CREATE INDEX IF NOT EXISTS "freelancer_payments_status_idx" ON "freelancer_payments"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "snack_logs_date_key" ON "snack_logs"("date");
CREATE UNIQUE INDEX IF NOT EXISTS "snack_items_name_key" ON "snack_items"("name");
CREATE INDEX IF NOT EXISTS "snack_purchases_date_idx" ON "snack_purchases"("date");
CREATE INDEX IF NOT EXISTS "snack_consumptions_date_idx" ON "snack_consumptions"("date");
CREATE INDEX IF NOT EXISTS "dive_logs_date_idx" ON "dive_logs"("date");
CREATE UNIQUE INDEX IF NOT EXISTS "dive_log_guests_diveLogId_guestId_key" ON "dive_log_guests"("diveLogId", "guestId");
CREATE UNIQUE INDEX IF NOT EXISTS "certification_courses_name_agency_key" ON "certification_courses"("name", "agency");
CREATE INDEX IF NOT EXISTS "guest_certifications_status_idx" ON "guest_certifications"("status");
CREATE INDEX IF NOT EXISTS "finance_transactions_date_idx" ON "finance_transactions"("date");
CREATE INDEX IF NOT EXISTS "finance_transactions_type_idx" ON "finance_transactions"("type");
CREATE INDEX IF NOT EXISTS "google_reviews_reviewDate_idx" ON "google_reviews"("reviewDate");
CREATE INDEX IF NOT EXISTS "social_media_posts_platform_postDate_idx" ON "social_media_posts"("platform", "postDate");
CREATE UNIQUE INDEX IF NOT EXISTS "social_follower_snapshots_platform_date_key" ON "social_follower_snapshots"("platform", "date");
CREATE INDEX IF NOT EXISTS "follow_ups_dueDate_idx" ON "follow_ups"("dueDate");
CREATE INDEX IF NOT EXISTS "follow_ups_status_idx" ON "follow_ups"("status");
CREATE INDEX IF NOT EXISTS "leads_stage_idx" ON "leads"("stage");
CREATE INDEX IF NOT EXISTS "leads_followUpAt_idx" ON "leads"("followUpAt");
CREATE INDEX IF NOT EXISTS "notifications_targetUserId_isRead_idx" ON "notifications"("targetUserId", "isRead");
CREATE UNIQUE INDEX IF NOT EXISTS "seasons_name_key" ON "seasons"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "daily_ops_logs_date_key" ON "daily_ops_logs"("date");
CREATE UNIQUE INDEX IF NOT EXISTS "rental_items_name_key" ON "rental_items"("name");
CREATE INDEX IF NOT EXISTS "audit_logs_createdAt_idx" ON "audit_logs"("createdAt");

-- ---------------------------------------------------------------------------
-- 7. Foreign keys
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "boats"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "bookings" ADD CONSTRAINT "bookings_diveSiteId_fkey" FOREIGN KEY ("diveSiteId") REFERENCES "dive_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "payments" ADD CONSTRAINT "payments_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "boat_sharing_entries" ADD CONSTRAINT "boat_sharing_entries_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "boats"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "boat_sharing_splits" ADD CONSTRAINT "boat_sharing_splits_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "boat_sharing_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "boat_vendor_payments" ADD CONSTRAINT "boat_vendor_payments_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "boat_sharing_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "staff_attendance" ADD CONSTRAINT "staff_attendance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "staff_salary_payments" ADD CONSTRAINT "staff_salary_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "freelancer_attendance" ADD CONSTRAINT "freelancer_attendance_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "freelancers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "freelancer_payments" ADD CONSTRAINT "freelancer_payments_freelancerId_fkey" FOREIGN KEY ("freelancerId") REFERENCES "freelancers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "snack_purchases" ADD CONSTRAINT "snack_purchases_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "snack_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "snack_consumptions" ADD CONSTRAINT "snack_consumptions_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "snack_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "snack_consumptions" ADD CONSTRAINT "snack_consumptions_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "snack_consumptions" ADD CONSTRAINT "snack_consumptions_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "boats"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "dive_logs" ADD CONSTRAINT "dive_logs_diveSiteId_fkey" FOREIGN KEY ("diveSiteId") REFERENCES "dive_sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "dive_logs" ADD CONSTRAINT "dive_logs_boatId_fkey" FOREIGN KEY ("boatId") REFERENCES "boats"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "dive_logs" ADD CONSTRAINT "dive_logs_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "dive_log_guests" ADD CONSTRAINT "dive_log_guests_diveLogId_fkey" FOREIGN KEY ("diveLogId") REFERENCES "dive_logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "dive_log_guests" ADD CONSTRAINT "dive_log_guests_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "guest_certifications" ADD CONSTRAINT "guest_certifications_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "guest_certifications" ADD CONSTRAINT "guest_certifications_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "certification_courses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "guest_certifications" ADD CONSTRAINT "guest_certifications_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "finance_transactions" ADD CONSTRAINT "finance_transactions_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "google_reviews" ADD CONSTRAINT "google_reviews_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "google_reviews" ADD CONSTRAINT "google_reviews_instructorMentionedId_fkey" FOREIGN KEY ("instructorMentionedId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "follow_ups" ADD CONSTRAINT "follow_ups_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "leads" ADD CONSTRAINT "leads_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "leads" ADD CONSTRAINT "leads_referredById_fkey" FOREIGN KEY ("referredById") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "leads" ADD CONSTRAINT "leads_guestId_fkey" FOREIGN KEY ("guestId") REFERENCES "guests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "notifications" ADD CONSTRAINT "notifications_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- 8. Verification
--
-- Run these after the migration above. Both should return zero rows -- any
-- row returned means something the schema expects still isn't present.
-- ---------------------------------------------------------------------------

-- Missing tables (expect 0 rows)
SELECT expected.table_name
FROM (VALUES
  ('users'),
  ('guests'),
  ('dive_sites'),
  ('boats'),
  ('activity_rates'),
  ('bookings'),
  ('payments'),
  ('boat_sharing_entries'),
  ('boat_sharing_splits'),
  ('boat_vendor_payments'),
  ('staff_attendance'),
  ('staff_salary_payments'),
  ('freelancers'),
  ('freelancer_attendance'),
  ('freelancer_payments'),
  ('snack_logs'),
  ('snack_items'),
  ('snack_purchases'),
  ('snack_consumptions'),
  ('dive_logs'),
  ('dive_log_guests'),
  ('certification_courses'),
  ('guest_certifications'),
  ('finance_transactions'),
  ('google_reviews'),
  ('social_media_posts'),
  ('social_follower_snapshots'),
  ('follow_ups'),
  ('leads'),
  ('notifications'),
  ('seasons'),
  ('daily_ops_logs'),
  ('company_settings'),
  ('rental_items'),
  ('audit_logs')
) AS expected(table_name)
LEFT JOIN information_schema.tables t
  ON t.table_schema = 'public' AND t.table_name = expected.table_name
WHERE t.table_name IS NULL;

-- Missing columns (expect 0 rows)
SELECT expected.table_name, expected.column_name
FROM (VALUES
  ('users', 'id'),
  ('users', 'email'),
  ('users', 'fullName'),
  ('users', 'phone'),
  ('users', 'role'),
  ('users', 'avatarUrl'),
  ('users', 'isActive'),
  ('users', 'monthlySalary'),
  ('users', 'createdAt'),
  ('users', 'updatedAt'),
  ('guests', 'id'),
  ('guests', 'fullName'),
  ('guests', 'phone'),
  ('guests', 'email'),
  ('guests', 'nationality'),
  ('guests', 'emergencyContactName'),
  ('guests', 'emergencyContactPhone'),
  ('guests', 'medicalDeclaration'),
  ('guests', 'medicalNotes'),
  ('guests', 'swimmingStatus'),
  ('guests', 'certificationLevel'),
  ('guests', 'previousDives'),
  ('guests', 'dateOfBirth'),
  ('guests', 'source'),
  ('guests', 'notes'),
  ('guests', 'createdAt'),
  ('guests', 'updatedAt'),
  ('dive_sites', 'id'),
  ('dive_sites', 'name'),
  ('dive_sites', 'location'),
  ('dive_sites', 'description'),
  ('dive_sites', 'createdAt'),
  ('boats', 'id'),
  ('boats', 'name'),
  ('boats', 'vendor'),
  ('boats', 'capacity'),
  ('boats', 'isActive'),
  ('boats', 'createdAt'),
  ('activity_rates', 'id'),
  ('activity_rates', 'activityType'),
  ('activity_rates', 'price'),
  ('activity_rates', 'isActive'),
  ('activity_rates', 'updatedAt'),
  ('bookings', 'id'),
  ('bookings', 'guestId'),
  ('bookings', 'instructorId'),
  ('bookings', 'boatId'),
  ('bookings', 'diveSiteId'),
  ('bookings', 'activityType'),
  ('bookings', 'date'),
  ('bookings', 'status'),
  ('bookings', 'price'),
  ('bookings', 'notes'),
  ('bookings', 'createdAt'),
  ('bookings', 'updatedAt'),
  ('payments', 'id'),
  ('payments', 'guestId'),
  ('payments', 'bookingId'),
  ('payments', 'amount'),
  ('payments', 'method'),
  ('payments', 'status'),
  ('payments', 'paidAt'),
  ('payments', 'dueDate'),
  ('payments', 'notes'),
  ('payments', 'createdAt'),
  ('boat_sharing_entries', 'id'),
  ('boat_sharing_entries', 'date'),
  ('boat_sharing_entries', 'boatId'),
  ('boat_sharing_entries', 'boatVendorName'),
  ('boat_sharing_entries', 'boatAmount'),
  ('boat_sharing_entries', 'tempoAmount'),
  ('boat_sharing_entries', 'ffGuests'),
  ('boat_sharing_entries', 'dgGuests'),
  ('boat_sharing_entries', 'seiGuests'),
  ('boat_sharing_entries', 'totalGuests'),
  ('boat_sharing_entries', 'vendorPaymentStatus'),
  ('boat_sharing_entries', 'outstandingAmount'),
  ('boat_sharing_entries', 'notes'),
  ('boat_sharing_entries', 'createdAt'),
  ('boat_sharing_entries', 'updatedAt'),
  ('boat_sharing_splits', 'id'),
  ('boat_sharing_splits', 'entryId'),
  ('boat_sharing_splits', 'partyName'),
  ('boat_sharing_splits', 'guestCount'),
  ('boat_sharing_splits', 'amountDue'),
  ('boat_sharing_splits', 'amountPaid'),
  ('boat_sharing_splits', 'status'),
  ('boat_vendor_payments', 'id'),
  ('boat_vendor_payments', 'entryId'),
  ('boat_vendor_payments', 'amount'),
  ('boat_vendor_payments', 'method'),
  ('boat_vendor_payments', 'paidAt'),
  ('boat_vendor_payments', 'notes'),
  ('boat_vendor_payments', 'createdAt'),
  ('staff_attendance', 'id'),
  ('staff_attendance', 'userId'),
  ('staff_attendance', 'date'),
  ('staff_attendance', 'status'),
  ('staff_attendance', 'notes'),
  ('staff_attendance', 'createdAt'),
  ('staff_salary_payments', 'id'),
  ('staff_salary_payments', 'userId'),
  ('staff_salary_payments', 'month'),
  ('staff_salary_payments', 'amount'),
  ('staff_salary_payments', 'status'),
  ('staff_salary_payments', 'paidAt'),
  ('staff_salary_payments', 'notes'),
  ('staff_salary_payments', 'createdAt'),
  ('freelancers', 'id'),
  ('freelancers', 'fullName'),
  ('freelancers', 'role'),
  ('freelancers', 'phone'),
  ('freelancers', 'dayRate'),
  ('freelancers', 'isActive'),
  ('freelancers', 'createdAt'),
  ('freelancer_attendance', 'id'),
  ('freelancer_attendance', 'freelancerId'),
  ('freelancer_attendance', 'date'),
  ('freelancer_attendance', 'status'),
  ('freelancer_attendance', 'notes'),
  ('freelancer_payments', 'id'),
  ('freelancer_payments', 'freelancerId'),
  ('freelancer_payments', 'amount'),
  ('freelancer_payments', 'status'),
  ('freelancer_payments', 'dueDate'),
  ('freelancer_payments', 'paidAt'),
  ('freelancer_payments', 'notes'),
  ('freelancer_payments', 'createdAt'),
  ('snack_logs', 'id'),
  ('snack_logs', 'date'),
  ('snack_logs', 'snackBoxCount'),
  ('snack_logs', 'buffetCount'),
  ('snack_logs', 'cost'),
  ('snack_logs', 'notes'),
  ('snack_logs', 'createdAt'),
  ('snack_items', 'id'),
  ('snack_items', 'name'),
  ('snack_items', 'unit'),
  ('snack_items', 'costPerUnit'),
  ('snack_items', 'currentStock'),
  ('snack_items', 'reorderLevel'),
  ('snack_items', 'isActive'),
  ('snack_items', 'createdAt'),
  ('snack_purchases', 'id'),
  ('snack_purchases', 'itemId'),
  ('snack_purchases', 'date'),
  ('snack_purchases', 'quantity'),
  ('snack_purchases', 'unitCost'),
  ('snack_purchases', 'totalCost'),
  ('snack_purchases', 'vendor'),
  ('snack_purchases', 'notes'),
  ('snack_purchases', 'createdAt'),
  ('snack_consumptions', 'id'),
  ('snack_consumptions', 'itemId'),
  ('snack_consumptions', 'date'),
  ('snack_consumptions', 'quantity'),
  ('snack_consumptions', 'guestId'),
  ('snack_consumptions', 'boatId'),
  ('snack_consumptions', 'notes'),
  ('snack_consumptions', 'createdAt'),
  ('dive_logs', 'id'),
  ('dive_logs', 'date'),
  ('dive_logs', 'diveSiteId'),
  ('dive_logs', 'boatId'),
  ('dive_logs', 'instructorId'),
  ('dive_logs', 'entryTime'),
  ('dive_logs', 'exitTime'),
  ('dive_logs', 'bottomTimeMin'),
  ('dive_logs', 'maxDepth'),
  ('dive_logs', 'visibility'),
  ('dive_logs', 'current'),
  ('dive_logs', 'weather'),
  ('dive_logs', 'temperature'),
  ('dive_logs', 'equipmentUsed'),
  ('dive_logs', 'cylinderType'),
  ('dive_logs', 'weightsUsedKg'),
  ('dive_logs', 'marineLifeSeen'),
  ('dive_logs', 'problems'),
  ('dive_logs', 'photoUrls'),
  ('dive_logs', 'notes'),
  ('dive_logs', 'createdAt'),
  ('dive_log_guests', 'id'),
  ('dive_log_guests', 'diveLogId'),
  ('dive_log_guests', 'guestId'),
  ('certification_courses', 'id'),
  ('certification_courses', 'name'),
  ('certification_courses', 'agency'),
  ('certification_courses', 'track'),
  ('certification_courses', 'price'),
  ('guest_certifications', 'id'),
  ('guest_certifications', 'guestId'),
  ('guest_certifications', 'courseId'),
  ('guest_certifications', 'instructorId'),
  ('guest_certifications', 'progress'),
  ('guest_certifications', 'status'),
  ('guest_certifications', 'theoryCompletedAt'),
  ('guest_certifications', 'poolCompletedAt'),
  ('guest_certifications', 'openWaterDivesCompleted'),
  ('guest_certifications', 'openWaterDivesRequired'),
  ('guest_certifications', 'examPassedAt'),
  ('guest_certifications', 'certificateNumber'),
  ('guest_certifications', 'startDate'),
  ('guest_certifications', 'completionDate'),
  ('guest_certifications', 'issueDate'),
  ('guest_certifications', 'notes'),
  ('guest_certifications', 'createdAt'),
  ('guest_certifications', 'updatedAt'),
  ('finance_transactions', 'id'),
  ('finance_transactions', 'type'),
  ('finance_transactions', 'expenseCategory'),
  ('finance_transactions', 'revenueCategory'),
  ('finance_transactions', 'amount'),
  ('finance_transactions', 'date'),
  ('finance_transactions', 'description'),
  ('finance_transactions', 'guestId'),
  ('finance_transactions', 'bookingId'),
  ('finance_transactions', 'boatSharingEntryId'),
  ('finance_transactions', 'freelancerId'),
  ('finance_transactions', 'createdById'),
  ('finance_transactions', 'createdAt'),
  ('google_reviews', 'id'),
  ('google_reviews', 'reviewerName'),
  ('google_reviews', 'guestId'),
  ('google_reviews', 'rating'),
  ('google_reviews', 'reviewText'),
  ('google_reviews', 'reviewDate'),
  ('google_reviews', 'replyStatus'),
  ('google_reviews', 'instructorMentionedId'),
  ('google_reviews', 'sentiment'),
  ('google_reviews', 'createdAt'),
  ('social_media_posts', 'id'),
  ('social_media_posts', 'platform'),
  ('social_media_posts', 'postDate'),
  ('social_media_posts', 'url'),
  ('social_media_posts', 'caption'),
  ('social_media_posts', 'isReel'),
  ('social_media_posts', 'views'),
  ('social_media_posts', 'likes'),
  ('social_media_posts', 'comments'),
  ('social_media_posts', 'shares'),
  ('social_media_posts', 'saves'),
  ('social_media_posts', 'reach'),
  ('social_media_posts', 'leadsGenerated'),
  ('social_media_posts', 'createdAt'),
  ('social_follower_snapshots', 'id'),
  ('social_follower_snapshots', 'platform'),
  ('social_follower_snapshots', 'date'),
  ('social_follower_snapshots', 'followers'),
  ('follow_ups', 'id'),
  ('follow_ups', 'guestId'),
  ('follow_ups', 'type'),
  ('follow_ups', 'channel'),
  ('follow_ups', 'dueDate'),
  ('follow_ups', 'status'),
  ('follow_ups', 'assignedToId'),
  ('follow_ups', 'notes'),
  ('follow_ups', 'createdAt'),
  ('leads', 'id'),
  ('leads', 'fullName'),
  ('leads', 'phone'),
  ('leads', 'email'),
  ('leads', 'source'),
  ('leads', 'stage'),
  ('leads', 'assignedToId'),
  ('leads', 'followUpAt'),
  ('leads', 'isRepeatCustomer'),
  ('leads', 'referredById'),
  ('leads', 'guestId'),
  ('leads', 'notes'),
  ('leads', 'createdAt'),
  ('leads', 'updatedAt'),
  ('notifications', 'id'),
  ('notifications', 'type'),
  ('notifications', 'title'),
  ('notifications', 'message'),
  ('notifications', 'targetUserId'),
  ('notifications', 'targetRole'),
  ('notifications', 'isRead'),
  ('notifications', 'entityType'),
  ('notifications', 'entityId'),
  ('notifications', 'createdAt'),
  ('seasons', 'id'),
  ('seasons', 'name'),
  ('seasons', 'startDate'),
  ('seasons', 'endDate'),
  ('seasons', 'isActive'),
  ('daily_ops_logs', 'id'),
  ('daily_ops_logs', 'date'),
  ('daily_ops_logs', 'weather'),
  ('daily_ops_logs', 'visibility'),
  ('daily_ops_logs', 'seaCondition'),
  ('daily_ops_logs', 'notes'),
  ('company_settings', 'id'),
  ('company_settings', 'companyName'),
  ('company_settings', 'logoUrl'),
  ('company_settings', 'address'),
  ('company_settings', 'gstNumber'),
  ('company_settings', 'phone'),
  ('company_settings', 'email'),
  ('company_settings', 'emailNotificationsEnabled'),
  ('company_settings', 'whatsappNotificationsEnabled'),
  ('company_settings', 'updatedAt'),
  ('rental_items', 'id'),
  ('rental_items', 'name'),
  ('rental_items', 'dailyRate'),
  ('rental_items', 'isActive'),
  ('rental_items', 'updatedAt'),
  ('audit_logs', 'id'),
  ('audit_logs', 'userId'),
  ('audit_logs', 'action'),
  ('audit_logs', 'entityType'),
  ('audit_logs', 'entityId'),
  ('audit_logs', 'summary'),
  ('audit_logs', 'createdAt')
) AS expected(table_name, column_name)
LEFT JOIN information_schema.columns c
  ON c.table_schema = 'public' AND c.table_name = expected.table_name
 AND c.column_name = expected.column_name
WHERE c.column_name IS NULL
  -- exclude tables that don't exist at all (already reported above)
  AND expected.table_name IN (SELECT table_name FROM information_schema.tables WHERE table_schema = 'public');

-- Row counts per table, sanity check that nothing was truncated
SELECT
  (SELECT count(*) FROM "users") AS "users",
  (SELECT count(*) FROM "guests") AS "guests",
  (SELECT count(*) FROM "dive_sites") AS "dive_sites",
  (SELECT count(*) FROM "boats") AS "boats",
  (SELECT count(*) FROM "activity_rates") AS "activity_rates",
  (SELECT count(*) FROM "bookings") AS "bookings",
  (SELECT count(*) FROM "payments") AS "payments",
  (SELECT count(*) FROM "boat_sharing_entries") AS "boat_sharing_entries",
  (SELECT count(*) FROM "boat_sharing_splits") AS "boat_sharing_splits",
  (SELECT count(*) FROM "boat_vendor_payments") AS "boat_vendor_payments",
  (SELECT count(*) FROM "staff_attendance") AS "staff_attendance",
  (SELECT count(*) FROM "staff_salary_payments") AS "staff_salary_payments",
  (SELECT count(*) FROM "freelancers") AS "freelancers",
  (SELECT count(*) FROM "freelancer_attendance") AS "freelancer_attendance",
  (SELECT count(*) FROM "freelancer_payments") AS "freelancer_payments",
  (SELECT count(*) FROM "snack_logs") AS "snack_logs",
  (SELECT count(*) FROM "snack_items") AS "snack_items",
  (SELECT count(*) FROM "snack_purchases") AS "snack_purchases",
  (SELECT count(*) FROM "snack_consumptions") AS "snack_consumptions",
  (SELECT count(*) FROM "dive_logs") AS "dive_logs",
  (SELECT count(*) FROM "dive_log_guests") AS "dive_log_guests",
  (SELECT count(*) FROM "certification_courses") AS "certification_courses",
  (SELECT count(*) FROM "guest_certifications") AS "guest_certifications",
  (SELECT count(*) FROM "finance_transactions") AS "finance_transactions",
  (SELECT count(*) FROM "google_reviews") AS "google_reviews",
  (SELECT count(*) FROM "social_media_posts") AS "social_media_posts",
  (SELECT count(*) FROM "social_follower_snapshots") AS "social_follower_snapshots",
  (SELECT count(*) FROM "follow_ups") AS "follow_ups",
  (SELECT count(*) FROM "leads") AS "leads",
  (SELECT count(*) FROM "notifications") AS "notifications",
  (SELECT count(*) FROM "seasons") AS "seasons",
  (SELECT count(*) FROM "daily_ops_logs") AS "daily_ops_logs",
  (SELECT count(*) FROM "company_settings") AS "company_settings",
  (SELECT count(*) FROM "rental_items") AS "rental_items",
  (SELECT count(*) FROM "audit_logs") AS "audit_logs";
