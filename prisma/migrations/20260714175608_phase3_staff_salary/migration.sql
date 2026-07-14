-- AlterTable
ALTER TABLE "users" ADD COLUMN     "monthlySalary" DECIMAL(10,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "staff_salary_payments" (
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

-- CreateIndex
CREATE INDEX "staff_salary_payments_month_idx" ON "staff_salary_payments"("month");

-- CreateIndex
CREATE UNIQUE INDEX "staff_salary_payments_userId_month_key" ON "staff_salary_payments"("userId", "month");

-- AddForeignKey
ALTER TABLE "staff_salary_payments" ADD CONSTRAINT "staff_salary_payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
