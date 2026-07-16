import "server-only";
import { unstable_cache } from "next/cache";
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  subDays,
  format,
  addDays,
} from "date-fns";
import { prisma } from "@/lib/prisma";
import { recordDashboardCacheMiss } from "@/lib/perf-metrics";
import type { ActivityType, BookingStatus } from "@prisma/client";

const NON_DIVE_ACTIVITIES: ActivityType[] = ["BOAT_RIDE"];
const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "COMPLETED"];
const PENDING_CERT_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "PENDING_CARD"] as const;

// The "current season" (if any) determines the date range for the
// season-to-date aggregates below, so it has to be known before those
// queries can be built. This is a genuine data dependency, not something
// that can be flattened into the main Promise.all -- but everything else
// that depends on it (the season-scoped booking count + revenue/expense
// aggregates) still runs inside that same big parallel batch, not as a
// separate sequential round trip per query.
async function computeDashboardData() {
  recordDashboardCacheMiss();
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const trendStart = startOfDay(subDays(now, 29));

  const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });

  const [
    todayBookings,
    todayStaffPresent,
    todayOps,
    todaySnack,
    todayPayments,
    pendingPayments,
    pendingFreelancerPayments,
    pendingCertificationsCount,
    upcomingCourses,
    monthReviews,
    monthSocialPosts,
    monthTransactions,
    trendTransactions,
    topActivitiesRaw,
    topDiveSitesRaw,
    monthBoatSharing,
    outstandingPaymentGuests,
    seasonBookingsCount,
    seasonRevenueAgg,
    seasonExpenseAgg,
    todayExpenseAgg,
    monthBookingsCount,
    vendorOutstandingAgg,
    staffSalaryBudget,
    staffSalaryThisMonth,
    pendingStaffSalaryAgg,
    todaySnackConsumptionAgg,
    activeSnackItems,
    monthSnackPurchaseAgg,
  ] = await Promise.all([
    prisma.booking.findMany({
      where: { date: { gte: todayStart, lte: todayEnd }, status: { in: ACTIVE_BOOKING_STATUSES } },
      select: {
        activityType: true,
        guestId: true,
        boat: { select: { name: true } },
      },
    }),
    prisma.staffAttendance.count({
      where: { date: { gte: todayStart, lte: todayEnd }, status: "PRESENT" },
    }),
    prisma.dailyOpsLog.findUnique({ where: { date: todayStart } }),
    prisma.snackLog.findUnique({ where: { date: todayStart } }),
    prisma.payment.aggregate({
      where: { paidAt: { gte: todayStart, lte: todayEnd }, status: "PAID" },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { status: { in: ["PENDING", "PARTIAL"] } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.freelancerPayment.aggregate({
      where: { status: { in: ["PENDING", "PARTIAL"] } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.guestCertification.count({
      where: { status: { in: [...PENDING_CERT_STATUSES] } },
    }),
    prisma.guestCertification.findMany({
      where: {
        status: { in: ["NOT_STARTED", "IN_PROGRESS"] },
        startDate: { gte: todayStart, lte: addDays(now, 14) },
      },
      select: {
        id: true,
        startDate: true,
        progress: true,
        guest: { select: { fullName: true } },
        course: { select: { name: true, agency: true } },
        instructor: { select: { fullName: true } },
      },
      orderBy: { startDate: "asc" },
      take: 6,
    }),
    prisma.googleReview.aggregate({
      where: { reviewDate: { gte: monthStart, lte: monthEnd } },
      _avg: { rating: true },
      _count: true,
    }),
    prisma.socialMediaPost.aggregate({
      where: { postDate: { gte: monthStart, lte: monthEnd } },
      _sum: { views: true, likes: true, comments: true, reach: true, leadsGenerated: true },
    }),
    prisma.financeTransaction.groupBy({
      by: ["type"],
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),
    prisma.financeTransaction.findMany({
      where: { date: { gte: trendStart, lte: todayEnd } },
      select: { date: true, amount: true, type: true },
    }),
    prisma.booking.groupBy({
      by: ["activityType"],
      where: { status: { in: ACTIVE_BOOKING_STATUSES } },
      _count: true,
      orderBy: { _count: { activityType: "desc" } },
      take: 5,
    }),
    prisma.booking.groupBy({
      by: ["diveSiteId"],
      where: {
        status: { in: ACTIVE_BOOKING_STATUSES },
        diveSiteId: { not: null },
        activityType: { notIn: NON_DIVE_ACTIVITIES },
      },
      _count: true,
      orderBy: { _count: { diveSiteId: "desc" } },
      take: 5,
    }),
    prisma.boatSharingEntry.findMany({
      where: { date: { gte: monthStart, lte: monthEnd } },
      select: { boatAmount: true, tempoAmount: true, outstandingAmount: true, totalGuests: true },
    }),
    prisma.guest.findMany({
      where: { payments: { some: { status: { in: ["PENDING", "PARTIAL"] } } } },
      select: {
        id: true,
        fullName: true,
        phone: true,
        payments: {
          where: { status: { in: ["PENDING", "PARTIAL"] } },
          select: { amount: true },
        },
      },
      take: 6,
    }),
    activeSeason
      ? prisma.booking.count({
          where: { date: { gte: activeSeason.startDate, lte: activeSeason.endDate } },
        })
      : Promise.resolve(0),
    activeSeason
      ? prisma.financeTransaction.aggregate({
          where: {
            type: "REVENUE",
            date: { gte: activeSeason.startDate, lte: activeSeason.endDate },
          },
          _sum: { amount: true },
        })
      : Promise.resolve(null),
    activeSeason
      ? prisma.financeTransaction.aggregate({
          where: {
            type: "EXPENSE",
            date: { gte: activeSeason.startDate, lte: activeSeason.endDate },
          },
          _sum: { amount: true },
        })
      : Promise.resolve(null),
    prisma.financeTransaction.aggregate({
      where: { type: "EXPENSE", date: { gte: todayStart, lte: todayEnd } },
      _sum: { amount: true },
    }),
    prisma.booking.count({
      where: { date: { gte: monthStart, lte: monthEnd }, status: { in: ACTIVE_BOOKING_STATUSES } },
    }),
    prisma.boatSharingEntry.aggregate({ _sum: { outstandingAmount: true } }),
    prisma.user.aggregate({ where: { isActive: true }, _sum: { monthlySalary: true } }),
    prisma.staffSalaryPayment.aggregate({
      where: { status: "PAID", month: format(now, "yyyy-MM") },
      _sum: { amount: true },
    }),
    prisma.staffSalaryPayment.aggregate({
      where: { status: { in: ["PENDING", "PARTIAL"] } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.snackConsumption.aggregate({
      where: { date: { gte: todayStart, lte: todayEnd } },
      _sum: { quantity: true },
    }),
    prisma.snackItem.findMany({
      where: { isActive: true },
      select: { currentStock: true, costPerUnit: true, reorderLevel: true },
    }),
    prisma.snackPurchase.aggregate({
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { totalCost: true },
    }),
  ]);

  // Needs the IDs from topDiveSitesRaw first, so it can't join the batch
  // above -- but it's a single indexed IN-lookup for at most 5 rows.
  const diveSiteIds = topDiveSitesRaw
    .map((d) => d.diveSiteId)
    .filter((id): id is string => !!id);
  const diveSites = diveSiteIds.length
    ? await prisma.diveSite.findMany({
        where: { id: { in: diveSiteIds } },
        select: { id: true, name: true },
      })
    : [];
  const diveSiteMap = new Map(diveSites.map((d) => [d.id, d.name]));

  const todayDiveCount = todayBookings.filter(
    (b) => !NON_DIVE_ACTIVITIES.includes(b.activityType)
  ).length;
  const todayBoats = Array.from(
    new Set(todayBookings.map((b) => b.boat?.name).filter(Boolean))
  ) as string[];
  const todayGuestCount = new Set(todayBookings.map((b) => b.guestId)).size;

  const revenueThisMonth = Number(
    monthTransactions.find((t) => t.type === "REVENUE")?._sum.amount ?? 0
  );
  const expenseThisMonth = Number(
    monthTransactions.find((t) => t.type === "EXPENSE")?._sum.amount ?? 0
  );

  const trendByDay = new Map<string, { revenue: number; expense: number }>();
  for (let i = 0; i < 30; i++) {
    const key = format(addDays(trendStart, i), "yyyy-MM-dd");
    trendByDay.set(key, { revenue: 0, expense: 0 });
  }
  for (const t of trendTransactions) {
    const key = format(t.date, "yyyy-MM-dd");
    const entry = trendByDay.get(key);
    if (!entry) continue;
    if (t.type === "REVENUE") entry.revenue += Number(t.amount);
    else entry.expense += Number(t.amount);
  }
  const revenueTrend = Array.from(trendByDay.entries()).map(([date, v]) => ({
    date,
    label: format(new Date(date), "d MMM"),
    revenue: Math.round(v.revenue),
    expense: Math.round(v.expense),
    profit: Math.round(v.revenue - v.expense),
  }));

  const boatSharingTotals = monthBoatSharing.reduce(
    (acc, entry) => {
      acc.boatAmount += Number(entry.boatAmount);
      acc.tempoAmount += Number(entry.tempoAmount);
      acc.outstanding += Number(entry.outstandingAmount);
      acc.totalGuests += entry.totalGuests;
      acc.trips += 1;
      return acc;
    },
    { boatAmount: 0, tempoAmount: 0, outstanding: 0, totalGuests: 0, trips: 0 }
  );

  const todayExpense = Number(todayExpenseAgg._sum.amount ?? 0);
  const profitThisMonth = revenueThisMonth - expenseThisMonth;
  const avgBookingValue = monthBookingsCount > 0 ? revenueThisMonth / monthBookingsCount : 0;
  const staffSalaryBudgetAmount = Number(staffSalaryBudget._sum.monthlySalary ?? 0);
  const staffSalaryPaidThisMonth = Number(staffSalaryThisMonth._sum.amount ?? 0);
  const staffSalaryPendingAmount = Number(pendingStaffSalaryAgg._sum.amount ?? 0);

  const snackStockValue = activeSnackItems.reduce(
    (sum, item) => sum + item.currentStock * Number(item.costPerUnit),
    0
  );
  const snackLowStockCount = activeSnackItems.filter(
    (item) => item.currentStock <= item.reorderLevel
  ).length;

  const seasonToDate = activeSeason
    ? {
        bookings: seasonBookingsCount,
        revenue: Number(seasonRevenueAgg?._sum.amount ?? 0),
        expense: Number(seasonExpenseAgg?._sum.amount ?? 0),
      }
    : null;

  return {
    today: {
      guests: todayGuestCount,
      revenue: Number(todayPayments._sum.amount ?? 0),
      expense: todayExpense,
      profit: Number(todayPayments._sum.amount ?? 0) - todayExpense,
      diveCount: todayDiveCount,
      boats: todayBoats,
      staffPresent: todayStaffPresent,
      weather: todayOps?.weather ?? null,
      visibility: todayOps?.visibility ?? null,
      seaCondition: todayOps?.seaCondition ?? null,
      snackCount: (todaySnack?.snackBoxCount ?? 0) + (todaySnack?.buffetCount ?? 0),
    },
    pending: {
      paymentsAmount: Number(pendingPayments._sum.amount ?? 0),
      paymentsCount: pendingPayments._count,
      freelancerPaymentsAmount: Number(pendingFreelancerPayments._sum.amount ?? 0),
      freelancerPaymentsCount: pendingFreelancerPayments._count,
      certificationsCount: pendingCertificationsCount,
    },
    // Dates are converted to ISO strings so this whole object stays
    // JSON-safe for the unstable_cache layer below (Date objects don't
    // survive a cache round-trip). Consumers wrap them back in `new Date()`.
    upcomingCourses: upcomingCourses.map((c) => ({
      id: c.id,
      guestName: c.guest.fullName,
      courseName: c.course.name,
      agency: c.course.agency,
      instructorName: c.instructor?.fullName ?? "Unassigned",
      startDate: c.startDate ? c.startDate.toISOString() : null,
      progress: c.progress,
    })),
    reviews: {
      avgRating: monthReviews._avg.rating ?? 0,
      count: monthReviews._count,
    },
    social: {
      views: monthSocialPosts._sum.views ?? 0,
      likes: monthSocialPosts._sum.likes ?? 0,
      comments: monthSocialPosts._sum.comments ?? 0,
      reach: monthSocialPosts._sum.reach ?? 0,
      leads: monthSocialPosts._sum.leadsGenerated ?? 0,
    },
    finance: {
      revenueThisMonth,
      expenseThisMonth,
      profitThisMonth,
      revenueTrend,
    },
    topActivities: topActivitiesRaw.map((a) => ({
      activityType: a.activityType,
      count: a._count,
    })),
    topDiveSites: topDiveSitesRaw.map((d) => ({
      name: d.diveSiteId ? diveSiteMap.get(d.diveSiteId) ?? "Unknown" : "Unknown",
      count: d._count,
    })),
    boatSharing: boatSharingTotals,
    outstandingGuests: outstandingPaymentGuests.map((g) => ({
      id: g.id,
      name: g.fullName,
      phone: g.phone,
      amount: g.payments.reduce((sum, p) => sum + Number(p.amount), 0),
    })),
    season: activeSeason
      ? {
          name: activeSeason.name,
          startDate: activeSeason.startDate.toISOString(),
          endDate: activeSeason.endDate.toISOString(),
          bookings: seasonToDate?.bookings ?? 0,
          revenue: seasonToDate?.revenue ?? 0,
          expense: seasonToDate?.expense ?? 0,
          profit: (seasonToDate?.revenue ?? 0) - (seasonToDate?.expense ?? 0),
        }
      : null,
    vendorPaymentsDue: Number(vendorOutstandingAgg._sum.outstandingAmount ?? 0),
    staffCost: {
      budgetThisMonth: staffSalaryBudgetAmount,
      paidThisMonth: staffSalaryPaidThisMonth,
      pendingAmount: staffSalaryPendingAmount,
      pendingCount: pendingStaffSalaryAgg._count,
    },
    financialKpis: {
      profitMarginThisMonth: revenueThisMonth > 0 ? (profitThisMonth / revenueThisMonth) * 100 : 0,
      avgBookingValue,
      cashFlowThisMonth: profitThisMonth,
      outstandingTotal:
        Number(pendingPayments._sum.amount ?? 0) +
        Number(pendingFreelancerPayments._sum.amount ?? 0) +
        staffSalaryPendingAmount +
        Number(vendorOutstandingAgg._sum.outstandingAmount ?? 0),
    },
    snacks: {
      todayConsumption: todaySnackConsumptionAgg._sum.quantity ?? 0,
      stockValue: snackStockValue,
      lowStockCount: snackLowStockCount,
      monthlyCost: Number(monthSnackPurchaseAgg._sum.totalCost ?? 0),
    },
  };
}

// Cross-request cache, not just per-request memoization: the CEO dashboard
// is read far more often than its underlying numbers change, so every
// mutation that touches a dashboard figure pairs its revalidatePath("/")
// call with revalidateTag("dashboard") (see src/actions/*.ts) for immediate
// invalidation, with this 45s revalidate as a safety net for any mutation
// path that doesn't go through a server action (e.g. direct DB access).
export const getDashboardData = unstable_cache(computeDashboardData, ["dashboard-data"], {
  tags: ["dashboard"],
  revalidate: 45,
});

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
