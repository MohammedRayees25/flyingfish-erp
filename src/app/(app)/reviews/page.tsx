import type { Metadata } from "next";
import Link from "next/link";
import { startOfMonth, endOfMonth } from "date-fns";
import { Prisma, type ReviewReplyStatus, type ReviewSentiment } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { getInstructors } from "@/lib/reference-data";
import { getReviewTrend, extractKeywords } from "@/lib/reports/reviews-data";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ReviewFormSheet } from "@/components/reviews/review-form-sheet";
import { ReviewsTable, type ReviewRow } from "@/components/reviews/reviews-table";
import { ReviewsOverview } from "@/components/reviews/reviews-overview";
import { Download } from "lucide-react";

export const metadata: Metadata = { title: "Google Reviews" };

const PAGE_SIZE = 20;
const SENTIMENT_LABELS: Record<string, string> = {
  POSITIVE: "Positive",
  NEUTRAL: "Neutral",
  NEGATIVE: "Negative",
};

export default async function ReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    rating?: string;
    replyStatus?: string;
    sentiment?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  await requireModuleAccess("reviews");
  const params = await searchParams;
  const tab = params.tab === "reviews" ? "reviews" : "overview";
  const q = params.q?.trim() ?? "";
  const rating = params.rating ?? "";
  const replyStatus = params.replyStatus ?? "";
  const sentiment = params.sentiment ?? "";
  const from = params.from ?? "";
  const to = params.to ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const instructors = await getInstructors();

  const exportHref = `/api/reports/reviews${
    from || to ? `?${new URLSearchParams({ ...(from ? { start: from } : {}), ...(to ? { end: to } : {}) }).toString()}` : ""
  }`;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Google Reviews</h1>
          <p className="text-sm text-muted-foreground">
            Track guest reviews, reply status and sentiment.
          </p>
        </div>
        {tab === "reviews" ? (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <a href={exportHref}>
                <Download /> Export Excel
              </a>
            </Button>
            <ReviewFormSheet mode="create" instructors={instructors} />
          </div>
        ) : null}
      </div>

      <Tabs value={tab}>
        <TabsList>
          <TabsTrigger value="overview" asChild>
            <Link href="/reviews?tab=overview">Overview</Link>
          </TabsTrigger>
          <TabsTrigger value="reviews" asChild>
            <Link href="/reviews?tab=reviews">Reviews</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">{tab === "overview" ? <OverviewTab /> : null}</TabsContent>
        <TabsContent value="reviews">
          {tab === "reviews" ? (
            <Card>
              <CardContent className="pt-6">
                <ReviewsListTab
                  q={q}
                  rating={rating}
                  replyStatus={replyStatus}
                  sentiment={sentiment}
                  from={from}
                  to={to}
                  page={page}
                  instructors={instructors}
                />
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function OverviewTab() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [
    overallAgg,
    monthAgg,
    pendingReplies,
    sentimentGroups,
    reviewTextsRaw,
    trend,
  ] = await Promise.all([
    prisma.googleReview.aggregate({ _avg: { rating: true }, _count: true }),
    prisma.googleReview.aggregate({
      where: { reviewDate: { gte: monthStart, lte: monthEnd } },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.googleReview.count({ where: { replyStatus: "PENDING" } }),
    prisma.googleReview.groupBy({ by: ["sentiment"], _count: true }),
    prisma.googleReview.findMany({
      where: { reviewText: { not: null } },
      select: { reviewText: true },
    }),
    getReviewTrend(6),
  ]);

  const sentimentCounts: Record<string, number> = { POSITIVE: 0, NEUTRAL: 0, NEGATIVE: 0 };
  for (const group of sentimentGroups) {
    if (group.sentiment) sentimentCounts[group.sentiment] = group._count;
  }
  const sentimentBreakdown = (["POSITIVE", "NEUTRAL", "NEGATIVE"] as const).map((key) => ({
    label: SENTIMENT_LABELS[key],
    value: sentimentCounts[key] ?? 0,
  }));

  const keywords = extractKeywords(
    reviewTextsRaw.map((r) => r.reviewText).filter((t): t is string => !!t)
  );

  return (
    <ReviewsOverview
      avgRating={overallAgg._avg.rating ?? 0}
      monthAvgRating={monthAgg._avg.rating ?? 0}
      monthReviewCount={monthAgg._count}
      totalReviews={overallAgg._count}
      pendingReplies={pendingReplies}
      trend={trend}
      sentimentBreakdown={sentimentBreakdown}
      keywords={keywords}
    />
  );
}

async function ReviewsListTab({
  q,
  rating,
  replyStatus,
  sentiment,
  from,
  to,
  page,
  instructors,
}: {
  q: string;
  rating: string;
  replyStatus: string;
  sentiment: string;
  from: string;
  to: string;
  page: number;
  instructors: { id: string; fullName: string }[];
}) {
  const where: Prisma.GoogleReviewWhereInput = {
    ...(q
      ? {
          OR: [
            { reviewerName: { contains: q, mode: "insensitive" } },
            { reviewText: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(rating ? { rating: Number(rating) } : {}),
    ...(replyStatus ? { replyStatus: replyStatus as ReviewReplyStatus } : {}),
    ...(sentiment ? { sentiment: sentiment as ReviewSentiment } : {}),
    ...(from || to
      ? {
          reviewDate: {
            ...(from ? { gte: new Date(`${from}T00:00:00.000Z`) } : {}),
            ...(to ? { lte: new Date(`${to}T23:59:59.999Z`) } : {}),
          },
        }
      : {}),
  };

  const [reviewsRaw, total] = await Promise.all([
    prisma.googleReview.findMany({
      where,
      include: {
        guest: { select: { id: true, fullName: true, phone: true } },
        instructorMentioned: { select: { fullName: true } },
      },
      orderBy: { reviewDate: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.googleReview.count({ where }),
  ]);

  const reviews: ReviewRow[] = reviewsRaw.map((r) => ({
    id: r.id,
    reviewerName: r.reviewerName,
    guestId: r.guestId,
    guest: r.guest,
    rating: r.rating,
    reviewText: r.reviewText,
    reviewDate: r.reviewDate,
    replyStatus: r.replyStatus,
    instructorMentionedId: r.instructorMentionedId,
    instructorMentioned: r.instructorMentioned,
    sentiment: r.sentiment,
  }));

  return (
    <ReviewsTable
      reviews={reviews}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      query={q}
      rating={rating}
      replyStatus={replyStatus}
      sentiment={sentiment}
      dateFrom={from}
      dateTo={to}
      instructors={instructors}
    />
  );
}
