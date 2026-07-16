-- CreateIndex
CREATE INDEX "bookings_status_date_idx" ON "bookings"("status", "date");

-- CreateIndex
CREATE INDEX "bookings_instructorId_status_idx" ON "bookings"("instructorId", "status");

-- CreateIndex
CREATE INDEX "dive_logs_diveSiteId_idx" ON "dive_logs"("diveSiteId");

-- CreateIndex
CREATE INDEX "dive_logs_instructorId_idx" ON "dive_logs"("instructorId");

-- CreateIndex
CREATE INDEX "dive_logs_boatId_idx" ON "dive_logs"("boatId");

-- CreateIndex
CREATE INDEX "finance_transactions_type_date_idx" ON "finance_transactions"("type", "date");

-- CreateIndex
CREATE INDEX "google_reviews_replyStatus_idx" ON "google_reviews"("replyStatus");

-- CreateIndex
CREATE INDEX "leads_source_idx" ON "leads"("source");

-- CreateIndex
CREATE INDEX "leads_assignedToId_idx" ON "leads"("assignedToId");

-- CreateIndex
CREATE INDEX "snack_consumptions_itemId_idx" ON "snack_consumptions"("itemId");

-- CreateIndex
CREATE INDEX "snack_purchases_itemId_idx" ON "snack_purchases"("itemId");

-- CreateIndex
CREATE INDEX "staff_attendance_status_date_idx" ON "staff_attendance"("status", "date");
