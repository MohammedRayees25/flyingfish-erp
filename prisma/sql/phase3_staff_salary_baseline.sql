-- Fallback path for bringing an existing production database up to date
-- with the Phase 3 (staff salary) schema WITHOUT using `prisma migrate
-- deploy` -- use this if you'd rather not touch Prisma's migration
-- bookkeeping right now, or the baseline `prisma migrate resolve` flow
-- documented in README.md isn't available to you.
--
-- Run prisma/sql/check_migration_state.sql first to confirm this is
-- actually what's missing before running this.
--
-- Purely additive: only ADD COLUMN and CREATE TABLE, nothing is dropped,
-- altered destructively, or has its data touched. Every statement is
-- idempotent (safe to run more than once, and safe if some but not all of
-- it already exists) via IF NOT EXISTS / a duplicate-object guard.
--
-- This is the exact same DDL as
-- prisma/migrations/20260714175608_phase3_staff_salary/migration.sql,
-- just with IF NOT EXISTS guards added so it can be run directly against
-- a database Prisma doesn't have tracked history for.

ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "monthlySalary" DECIMAL(10,2) NOT NULL DEFAULT 0;

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

CREATE INDEX IF NOT EXISTS "staff_salary_payments_month_idx" ON "staff_salary_payments"("month");

CREATE UNIQUE INDEX IF NOT EXISTS "staff_salary_payments_userId_month_key" ON "staff_salary_payments"("userId", "month");

DO $$ BEGIN
  ALTER TABLE "staff_salary_payments"
    ADD CONSTRAINT "staff_salary_payments_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- After running this, tell Prisma these two migrations are already
-- reflected in the schema (the phase2 one because it should already have
-- been present, and this phase3 one because you just applied it by hand)
-- so a future `prisma migrate deploy` doesn't try to re-run them:
--
--   npx prisma migrate resolve --applied 20260714064455_phase2_activity_rates_vendor_payments
--   npx prisma migrate resolve --applied 20260714175608_phase3_staff_salary
--
-- Skip the phase2 line if check_migration_state.sql showed that one is
-- not actually present yet -- apply it for real first instead.
