import "server-only";
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
import type { ActivityType, BookingStatus } from "@prisma/client";

const NON_DIVE_ACTIVITIES: ActivityType[] = ["BOAT_RIDE"];
const ACTIVE_BOOKING_STATUSES: BookingStatus[] = ["PENDING", "CONFIRMED", "COMPLETED"];
const PENDING_CERT_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "PENDING_CARD"] as const;

export async function getDashboardData() {
  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const trendStart = startOfDay(subDays(now, 29));

  const [
    todayBookings,
    todayStaffPresent,
    todayOps,
    todaySnack,
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
    activeSeason,
    seasonBookingsAgg,
    todayExpenseAgg,
    monthBookingsCount,
    vendorOutstandingAgg,
    staffSalaryBudget,
    staffSalaryThisMonth,
    pendingStaffSalaryAgg,
  ] = await Promise.all([
    prisma.booking.findMany({
      where: { date: { gte: todayStart, lte: todayEnd }, status: { in: ACTIVE_BOOKING_STATUSES } },
      include: { boat: true, guest: true, instructor: true },
    }),
    prisma.staffAttendance.count({
      where: { date: { gte: todayStart, lte: todayEnd }, status: "PRESENT" },
    }),
    prisma.dailyOpsLog.findUnique({ where: { date: todayStart } }),
    prisma.snackLog.findUnique({ where: { date: todayStart } }),
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
      include: { guest: true, course: true, instructor: true },
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
      include: { boat: true },
    }),
    prisma.guest.findMany({
      where: { payments: { some: { status: { in: ["PENDING", "PARTIAL"] } } } },
      include: {
        payments: { where: { status: { in: ["PENDING", "PARTIAL"] } } },
      },
      take: 6,
    }),
    prisma.season.findFirst({ where: { isActive: true } }),
    prisma.season.findFirst({ where: { isActive: true } }).then(async (season) => {
      if (!season) return null;
      const [bookings, revenue, expense] = await Promise.all([
        prisma.booking.count({
          where: { date: { gte: season.startDate, lte: season.endDate } },
        }),
        prisma.financeTransaction.aggregate({
          where: {
            type: "REVENUE",
            date: { gte: season.startDate, lte: season.endDate },
          },
          _sum: { amount: true },
        }),
        prisma.financeTransaction.aggregate({
          where: {
            type: "EXPENSE",
            date: { gte: season.startDate, lte: season.endDate },
          },
          _sum: { amount: true },
        }),
      ]);
      return {
        bookings,
        revenue: Number(revenue._sum.amount ?? 0),
        expense: Number(expense._sum.amount ?? 0),
      };
    }),
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
  ]);

  const diveSiteIds = topDiveSitesRaw
    .map((d) => d.diveSiteId)
    .filter((id): id is string => !!id);
  const diveSites = diveSiteIds.length
    ? await prisma.diveSite.findMany({ where: { id: { in: diveSiteIds } } })
    : [];
  const diveSiteMap = new Map(diveSites.map((d) => [d.id, d.name]));

  const todayDiveCount = todayBookings.filter(
    (b) => !NON_DIVE_ACTIVITIES.includes(b.activityType)
  ).length;
  const todayBoats = Array.from(
    new Set(todayBookings.map((b) => b.boat?.name).filter(Boolean))
  ) as string[];
  const todayGuestCount = new Set(todayBookings.map((b) => b.guestId)).size;

  const todayPayments = await prisma.payment.aggregate({
    where: { paidAt: { gte: todayStart, lte: todayEnd }, status: "PAID" },
    _sum: { amount: true },
  });

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
      bookings: todayBookings,
    },
    pending: {
      paymentsAmount: Number(pendingPayments._sum.amount ?? 0),
      paymentsCount: pendingPayments._count,
      freelancerPaymentsAmount: Number(pendingFreelancerPayments._sum.amount ?? 0),
      freelancerPaymentsCount: pendingFreelancerPayments._count,
      certificationsCount: pendingCertificationsCount,
    },
    upcomingCourses: upcomingCourses.map((c) => ({
      id: c.id,
      guestName: c.guest.fullName,
      courseName: c.course.name,
      agency: c.course.agency,
      instructorName: c.instructor?.fullName ?? "Unassigned",
      startDate: c.startDate,
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
          startDate: activeSeason.startDate,
          endDate: activeSeason.endDate,
          bookings: seasonBookingsAgg?.bookings ?? 0,
          revenue: seasonBookingsAgg?.revenue ?? 0,
          expense: seasonBookingsAgg?.expense ?? 0,
          profit: (seasonBookingsAgg?.revenue ?? 0) - (seasonBookingsAgg?.expense ?? 0),
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
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboardData>>;
