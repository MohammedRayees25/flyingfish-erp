import { Star, MessageSquareText, Hourglass, CalendarClock } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { RankedBarList } from "@/components/dashboard/ranked-bar-list";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReviewTrendChart } from "@/components/reviews/review-trend-chart-lazy";
import type { ReviewTrendPoint } from "@/lib/reports/reviews-data";

export function ReviewsOverview({
  avgRating,
  monthAvgRating,
  monthReviewCount,
  totalReviews,
  pendingReplies,
  trend,
  sentimentBreakdown,
  keywords,
}: {
  avgRating: number;
  monthAvgRating: number;
  monthReviewCount: number;
  totalReviews: number;
  pendingReplies: number;
  trend: ReviewTrendPoint[];
  sentimentBreakdown: { label: string; value: number }[];
  keywords: { label: string; value: number }[];
}) {
  const hasTrendData = trend.some((point) => point.count > 0);

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Average Rating"
          value={totalReviews > 0 ? avgRating.toFixed(2) : "—"}
          icon={Star}
          subtext={`${totalReviews} review${totalReviews === 1 ? "" : "s"} total`}
        />
        <StatCard
          label="This Month's Average"
          value={monthReviewCount > 0 ? monthAvgRating.toFixed(2) : "—"}
          icon={CalendarClock}
          subtext={`${monthReviewCount} review${monthReviewCount === 1 ? "" : "s"} this month`}
        />
        <StatCard label="Total Reviews" value={totalReviews} icon={MessageSquareText} />
        <StatCard
          label="Pending Replies"
          value={pendingReplies}
          icon={Hourglass}
          tone={pendingReplies > 0 ? "warning" : "default"}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Review Trend</CardTitle>
          <CardDescription>Average rating by month — last {trend.length} months</CardDescription>
        </CardHeader>
        <CardContent>
          {hasTrendData ? (
            <ReviewTrendChart data={trend} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No reviews recorded in this period yet.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Positive vs Negative</CardTitle>
            <CardDescription>Reviews by sentiment</CardDescription>
          </CardHeader>
          <CardContent>
            <RankedBarList items={sentimentBreakdown} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Keywords</CardTitle>
            <CardDescription>Most common words in review text</CardDescription>
          </CardHeader>
          <CardContent>
            <RankedBarList items={keywords} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
