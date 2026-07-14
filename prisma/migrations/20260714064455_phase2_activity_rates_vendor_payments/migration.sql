-- CreateTable
CREATE TABLE "activity_rates" (
    "id" UUID NOT NULL,
    "activityType" "ActivityType" NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_rates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "boat_vendor_payments" (
    "id" UUID NOT NULL,
    "entryId" UUID NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "method" "PaymentMethod" NOT NULL DEFAULT 'CASH',
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "boat_vendor_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "activity_rates_activityType_key" ON "activity_rates"("activityType");

-- CreateIndex
CREATE INDEX "boat_vendor_payments_entryId_idx" ON "boat_vendor_payments"("entryId");

-- AddForeignKey
ALTER TABLE "boat_vendor_payments" ADD CONSTRAINT "boat_vendor_payments_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "boat_sharing_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
