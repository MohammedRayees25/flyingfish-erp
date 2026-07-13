import {
  Users,
  IndianRupee,
  Waves,
  Ship,
  UserCheck,
  CloudSun,
  Eye,
  Wallet,
  UserCog,
  Award,
  Cookie,
  Star,
  Share2,
  TrendingUp,
  CalendarClock,
  AlertCircle,
} from "lucide-react";
import { getDashboardData } from "@/lib/dashboard";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RankedBarList } from "@/components/dashboard/ranked-bar-list";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ACTIVITY_LABELS, formatCurrencyINR } from "@/lib/labels";
import { format } from "date-fns";

export default async function DashboardPage() {
  const data = await getDashboardData();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Good day 🌊 — here&apos;s how today looks
        </h1>
        <p className="text-sm text-muted-foreground">
          {format(new Date(), "EEEE, d MMMM yyyy")}
        </p>
      </div>

      {/* Today at a glance */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Today's Guests" value={data.today.guests} icon={Users} />
        <StatCard
          label="Today's Revenue"
          value={formatCurrencyINR(data.today.revenue)}
          icon={IndianRupee}
        />
        <StatCard label="Today's Dive Count" value={data.today.diveCount} icon={Waves} />
        <StatCard
          label="Today's Boat"
          value={data.today.boats.length ? data.today.boats.join(", ") : "—"}
          icon={Ship}
        />
        <StatCard label="Today's Staff" value={data.today.staffPresent} icon={UserCheck} />
        <StatCard
          label="Today's Weather"
          value={data.today.weather ?? "—"}
          icon={CloudSun}
        />
        <StatCard
          label="Today's Visibility"
          value={data.today.visibility ? `${data.today.visibility}m` : "—"}
          icon={Eye}
        />
        <StatCard
          label="Today's Snack Count"
          value={data.today.snackCount}
          icon={Cookie}
        />
        <StatCard
          label="Pending Payments"
          value={formatCurrencyINR(data.pending.paymentsAmount)}
          subtext={`${data.pending.paymentsCount} guest payment(s)`}
          icon={Wallet}
          tone="warning"
        />
        <StatCard
          label="Pending Freelancer Payments"
          value={formatCurrencyINR(data.pending.freelancerPaymentsAmount)}
          subtext={`${data.pending.freelancerPaymentsCount} payment(s)`}
          icon={UserCog}
          tone="warning"
        />
      </section>

      {/* Revenue + profit */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Revenue vs Expense</CardTitle>
            <CardDescription>Last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={data.finance.revenueTrend} />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <StatCard
            label="Monthly Profit"
            value={formatCurrencyINR(data.finance.profitThisMonth)}
            subtext={`Revenue ${formatCurrencyINR(data.finance.revenueThisMonth)} · Expense ${formatCurrencyINR(data.finance.expenseThisMonth)}`}
            icon={TrendingUp}
            className="flex-1"
          />
          <StatCard
            label="Pending Certifications"
            value={data.pending.certificationsCount}
            icon={Award}
            tone="warning"
            className="flex-1"
          />
        </div>
      </section>

      {/* Top activities / dive sites */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Activities</CardTitle>
            <CardDescription>By confirmed &amp; completed bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <RankedBarList
              items={data.topActivities.map((a) => ({
                label: ACTIVITY_LABELS[a.activityType],
                value: a.count,
              }))}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Top Dive Sites</CardTitle>
            <CardDescription>By dive bookings</CardDescription>
          </CardHeader>
          <CardContent>
            <RankedBarList
              items={data.topDiveSites.map((d) => ({
                label: d.name,
                value: d.count,
              }))}
            />
          </CardContent>
        </Card>
      </section>

      {/* Boat sharing + outstanding payments */}
      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Boat Sharing Summary</CardTitle>
            <CardDescription>This month</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Trips</p>
              <p className="text-lg font-semibold">{data.boatSharing.trips}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total Guests</p>
              <p className="text-lg font-semibold">{data.boatSharing.totalGuests}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Boat + Tempo Cost</p>
              <p className="text-lg font-semibold">
                {formatCurrencyINR(
                  data.boatSharing.boatAmount + data.boatSharing.tempoAmount
                )}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Outstanding</p>
              <p className="text-lg font-semibold text-destructive">
                {formatCurrencyINR(data.boatSharing.outstanding)}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Outstanding Payments</CardTitle>
            <CardDescription>Guests with pending or partial dues</CardDescription>
          </CardHeader>
          <CardContent>
            {data.outstandingGuests.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No outstanding payments 🎉
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {data.outstandingGuests.map((g) => (
                  <li key={g.id} className="flex items-center justify-between py-2 text-sm">
                    <div>
                      <p className="font-medium">{g.name}</p>
                      <p className="text-xs text-muted-foreground">{g.phone}</p>
                    </div>
                    <span className="font-medium tabular-nums text-destructive">
                      {formatCurrencyINR(g.amount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Upcoming courses + reviews/social + season */}
      <section className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4" /> Upcoming Courses
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.upcomingCourses.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No courses scheduled.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {data.upcomingCourses.map((c) => (
                  <li key={c.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium">{c.courseName}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.guestName} · {c.instructorName}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {c.startDate ? format(c.startDate, "d MMM") : "TBD"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="size-4" /> Google Reviews
            </CardTitle>
            <CardDescription>This month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-semibold tabular-nums">
                {data.reviews.avgRating.toFixed(1)}
              </span>
              <span className="text-sm text-muted-foreground">
                avg · {data.reviews.count} reviews
              </span>
            </div>
            <div className="border-t pt-3">
              <p className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Share2 className="size-3.5" /> Social Media
              </p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground text-xs">Views</p>
                  <p className="font-semibold tabular-nums">{data.social.views}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Reach</p>
                  <p className="font-semibold tabular-nums">{data.social.reach}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Leads</p>
                  <p className="font-semibold tabular-nums">{data.social.leads}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="size-4" /> Season Summary
            </CardTitle>
            <CardDescription>{data.season?.name ?? "No active season"}</CardDescription>
          </CardHeader>
          <CardContent>
            {data.season ? (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Bookings</p>
                  <p className="text-lg font-semibold">{data.season.bookings}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Revenue</p>
                  <p className="text-lg font-semibold">
                    {formatCurrencyINR(data.season.revenue)}
                  </p>
                </div>
                <div className="col-span-2 text-xs text-muted-foreground">
                  {format(data.season.startDate, "d MMM yyyy")} –{" "}
                  {format(data.season.endDate, "d MMM yyyy")}
                </div>
              </div>
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">
                Mark a season active to see season-to-date totals.
              </p>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
