import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import type { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  await requireModuleAccess("reviews");

  const startParam = request.nextUrl.searchParams.get("start");
  const endParam = request.nextUrl.searchParams.get("end");

  const where: Prisma.GoogleReviewWhereInput = {};
  if (startParam || endParam) {
    where.reviewDate = {
      ...(startParam ? { gte: new Date(`${startParam}T00:00:00.000Z`) } : {}),
      ...(endParam ? { lte: new Date(`${endParam}T23:59:59.999Z`) } : {}),
    };
  }

  const reviews = await prisma.googleReview.findMany({
    where,
    include: {
      guest: { select: { fullName: true } },
      instructorMentioned: { select: { fullName: true } },
    },
    orderBy: { reviewDate: "desc" },
  });

  const label = startParam || endParam ? `${startParam ?? "start"}_to_${endParam ?? "end"}` : "all";

  const workbook = new ExcelJS.Workbook();

  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews : 0;
  const positiveCount = reviews.filter((r) => r.sentiment === "POSITIVE").length;
  const neutralCount = reviews.filter((r) => r.sentiment === "NEUTRAL").length;
  const negativeCount = reviews.filter((r) => r.sentiment === "NEGATIVE").length;
  const pendingReplies = reviews.filter((r) => r.replyStatus === "PENDING").length;

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 28 },
    { header: "Value", key: "value", width: 20 },
  ];
  summarySheet.addRows([
    { metric: "Period", value: startParam || endParam ? `${startParam ?? "—"} to ${endParam ?? "—"}` : "All time" },
    { metric: "Total reviews", value: totalReviews },
    { metric: "Average rating", value: Number(avgRating.toFixed(2)) },
    { metric: "Positive reviews", value: positiveCount },
    { metric: "Neutral reviews", value: neutralCount },
    { metric: "Negative reviews", value: negativeCount },
    { metric: "Pending replies", value: pendingReplies },
  ]);
  summarySheet.getRow(1).font = { bold: true };

  const detailSheet = workbook.addWorksheet("Detail");
  detailSheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Reviewer", key: "reviewer", width: 22 },
    { header: "Guest", key: "guest", width: 22 },
    { header: "Rating", key: "rating", width: 10 },
    { header: "Sentiment", key: "sentiment", width: 12 },
    { header: "Reply Status", key: "replyStatus", width: 14 },
    { header: "Instructor Mentioned", key: "instructor", width: 20 },
    { header: "Review Text", key: "reviewText", width: 60 },
  ];
  reviews.forEach((r) => {
    detailSheet.addRow({
      date: format(r.reviewDate, "yyyy-MM-dd"),
      reviewer: r.reviewerName,
      guest: r.guest?.fullName ?? "",
      rating: r.rating,
      sentiment: r.sentiment ?? "",
      replyStatus: r.replyStatus,
      instructor: r.instructorMentioned?.fullName ?? "",
      reviewText: r.reviewText ?? "",
    });
  });
  detailSheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="google-reviews-${label}.xlsx"`,
    },
  });
}
