import type { Metadata } from "next";
import type { LucideIcon } from "lucide-react";
import {
  Users,
  Repeat,
  Percent,
  GraduationCap,
  Award,
  TrendingUp,
  Wallet,
  UserCog,
  IndianRupee,
  Ship,
} from "lucide-react";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { getAnalyticsData } from "@/lib/analytics";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { RankedBarList } from "@/components/dashboard/ranked-bar-list";
import { AmountRankedList } from "@/components/analytics/amount-ranked-list";
import { TrendChart } from "@/components/analytics/trend-chart";
import { ComparisonBarChart } from "@/components/analytics/comparison-bar-chart";
import { InstructorTable } from "@/components/analytics/instructor-table";
import { BoatUtilizationChart } from "@/components/analytics/boat-utilization-chart";
import { GuestGrowthChart } from "@/components/analytics/guest-growth-chart";
import { formatCurrencyINR } from "@/lib/labels";

export const metadata: Metadata = { title: "Analytics" };

const PENDING_ICONS: Record<string, LucideIcon> = {
  "Guest payments": Wallet,
  "Freelancer payments": UserCog,
  "Staff salary": IndianRupee,
  "Boat/tempo vendors": Ship,
};

export default async function AnalyticsPage() {
  await requireModuleAccess("analytics");
  const data = await getAnalyticsData();

  const paymentByMethod = [...data.paymentByMethod]
    .sort((a, b) => b.amount - a.amount)
    .map((p) => ({
      label: p.method.replaceAll("_", " "),
      value: p.amount,
      subtext: `${p.count} payment${p.count === 1 ? "" : "s"}`,
    }));

  const paymentByStatus = [...data.paymentByStatus]
    .sort((a, b) => b.amount - a.amount)
    .map((p) => ({
      label: p.status.charAt(0) + p.status.slice(1).toLowerCase(),
      value: p.amount,
      subtext: `${p.count} payment${p.count === 1 ? "" : "s"}`,
    }));

  const pendingSorted = [...data.pendingPaymentAnalytics].sort(
    (a, b) => b.amount - a.amount
  );

  const latestGuestGrowth = data.guestGrowth[data.guestGrowth.length - 1];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground">
          Trends, comparisons and performance across the business
        </p>
      </div>

      {/* 1. Revenue / expense / profit trend */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue, Expense &amp; Profit Trend</CardTitle>
          <CardDescription>Last 90 days</CardDescription>
        </CardHeader>
        <CardContent>
          <TrendChart data={data.revenueExpenseProfitTrend} />
        </CardContent>
      </Card>

      {/* 2 & 3. Monthly + seasonal comparison */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Monthly Comparison</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <ComparisonBarChart
              data={data.monthlyComparison}
              xKey="month"
              emptyMessage="No transactions recorded yet."
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Seasonal Comparison</CardTitle>
            <CardDescription>Revenue, expense &amp; profit by season</CardDescription>
          </CardHeader>
          <CardContent>
            <ComparisonBarChart
              data={data.seasonalComparison}
              xKey="season"
              emptyMessage="No seasons configured yet."
            />
          </CardContent>
        </Card>
      </section>

      {/* 4 & 5. Top activities + dive site popularity */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Revenue Activities</CardTitle>
            <CardDescription>By confirmed &amp; completed bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <AmountRankedList
              items={data.topRevenueActivities.map((a) => ({
                label: a.activity,
                value: a.revenue,
                subtext: `${a.count} booking${a.count === 1 ? "" : "s"}`,
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Most Visited Dive Sites</CardTitle>
            <CardDescription>By dive bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <RankedBarList
              items={data.diveSitePopularity.map((d) => ({
                label: d.site,
                value: d.visits,
              }))}
            />
          </CardContent>
        </Card>
      </section>

      {/* 6 & 7. Instructor performance + boat utilization */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Instructor Performance</CardTitle>
            <CardDescription>By confirmed &amp; completed bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <InstructorTable data={data.instructorPerformance} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Boat Utilization</CardTitle>
            <CardDescription>Trips booked vs. estimated capacity</CardDescription>
          </CardHeader>
          <CardContent>
            <BoatUtilizationChart data={data.boatUtilization} />
          </CardContent>
        </Card>
      </section>

      {/* 8 & 9. Repeat customers + certification conversion */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Total Guests"
          value={data.repeatCustomers.totalGuests}
          icon={Users}
        />
        <StatCard
          label="Repeat Guests"
          value={data.repeatCustomers.repeatGuests}
          icon={Repeat}
        />
        <StatCard
          label="Repeat Rate"
          value={`${data.repeatCustomers.repeatRate.toFixed(1)}%`}
          icon={Percent}
        />
        <StatCard
          label="Certifications Started"
          value={data.certificationConversion.started}
          icon={GraduationCap}
        />
        <StatCard
          label="Certifications Completed"
          value={data.certificationConversion.completed}
          icon={Award}
        />
        <StatCard
          label="Certification Conversion"
          value={`${data.certificationConversion.conversionRate.toFixed(1)}%`}
          icon={Percent}
        />
      </section>

      {/* 10. Guest growth */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Guest Growth</CardTitle>
            <CardDescription>New guests per month, last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <GuestGrowthChart data={data.guestGrowth} />
          </CardContent>
        </Card>
        <StatCard
          label="Total Guests (cumulative)"
          value={latestGuestGrowth?.cumulativeGuests ?? data.repeatCustomers.totalGuests}
          icon={TrendingUp}
          subtext={latestGuestGrowth ? `As of ${latestGuestGrowth.month}` : undefined}
          className="lg:col-span-1"
        />
      </section>

      {/* 11. Payment analytics */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Payments by Method</CardTitle>
          </CardHeader>
          <CardContent>
            <AmountRankedList items={paymentByMethod} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Payments by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <AmountRankedList items={paymentByStatus} />
          </CardContent>
        </Card>
      </section>

      {/* 12. Pending payment analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Pending Payment Analytics</CardTitle>
          <CardDescription>Outstanding amounts by category</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {pendingSorted.map((p, i) => (
            <StatCard
              key={p.category}
              label={p.category}
              value={formatCurrencyINR(p.amount)}
              icon={PENDING_ICONS[p.category] ?? Wallet}
              tone={i === 0 ? "critical" : "warning"}
            />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
