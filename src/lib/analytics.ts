import "server-only";
import {
  startOfDay,
  subDays,
  startOfMonth,
  subMonths,
  format,
  addDays,
  addMonths,
} from "date-fns";
import { prisma } from "@/lib/prisma";
import { ACTIVITY_LABELS } from "@/lib/labels";
import type { ActivityType } from "@prisma/client";

const ACTIVE_BOOKING_STATUSES = ["PENDING", "CONFIRMED", "COMPLETED"] as const;

export async function getAnalyticsData() {
  const now = new Date();
  const trendStart = startOfDay(subDays(now, 89));
  const monthsBack = 6;
  const firstMonthStart = startOfMonth(subMonths(now, monthsBack - 1));

  const [
    trendTransactions,
    monthlyTransactions,
    seasons,
    activityGroups,
    diveSiteGroups,
    instructors,
    boats,
    boatBookingGroups,
    allGuestsWithBookingCounts,
    certifications,
    guestsForGrowth,
    payments,
    pendingGuestPayments,
    pendingFreelancerPayments,
    pendingStaffSalary,
    boatSharingOutstanding,
  ] = await Promise.all([
    prisma.financeTransaction.findMany({
      where: { date: { gte: trendStart } },
      select: { date: true, type: true, amount: true },
    }),
    prisma.financeTransaction.findMany({
      where: { date: { gte: firstMonthStart } },
      select: { date: true, type: true, amount: true },
    }),
    prisma.season.findMany({
      orderBy: { startDate: "asc" },
      select: { name: true, startDate: true, endDate: true },
    }),
    prisma.booking.groupBy({
      by: ["activityType"],
      where: { status: { in: [...ACTIVE_BOOKING_STATUSES] } },
      _sum: { price: true },
      _count: true,
    }),
    prisma.booking.groupBy({
      by: ["diveSiteId"],
      where: { status: { in: [...ACTIVE_BOOKING_STATUSES] }, diveSiteId: { not: null } },
      _count: true,
      orderBy: { _count: { diveSiteId: "desc" } },
      take: 8,
    }),
    prisma.user.findMany({ where: { role: "INSTRUCTOR" }, select: { id: true, fullName: true } }),
    prisma.boat.findMany({
      where: { isActive: true },
      select: { id: true, name: true, capacity: true },
    }),
    prisma.booking.groupBy({
      by: ["boatId"],
      where: { status: { in: [...ACTIVE_BOOKING_STATUSES] }, boatId: { not: null } },
      _count: true,
    }),
    prisma.guest.findMany({
      select: { id: true, _count: { select: { bookings: true } } },
    }),
    prisma.guestCertification.findMany({
      select: { status: true },
    }),
    prisma.guest.findMany({ select: { createdAt: true } }),
    prisma.payment.groupBy({
      by: ["method", "status"],
      _sum: { amount: true },
      _count: true,
    }),
    prisma.payment.aggregate({
      where: { status: { in: ["PENDING", "PARTIAL"] } },
      _sum: { amount: true },
    }),
    prisma.freelancerPayment.aggregate({
      where: { status: { in: ["PENDING", "PARTIAL"] } },
      _sum: { amount: true },
    }),
    prisma.staffSalaryPayment.aggregate({
      where: { status: { in: ["PENDING", "PARTIAL"] } },
      _sum: { amount: true },
    }),
    prisma.boatSharingEntry.aggregate({ _sum: { outstandingAmount: true } }),
  ]);

  // --- Revenue / expense / profit trend (last 90 days) ---
  const trendByDay = new Map<string, { revenue: number; expense: number }>();
  for (let i = 0; i < 90; i++) {
    trendByDay.set(format(addDays(trendStart, i), "yyyy-MM-dd"), { revenue: 0, expense: 0 });
  }
  for (const t of trendTransactions) {
    const key = format(t.date, "yyyy-MM-dd");
    const entry = trendByDay.get(key);
    if (!entry) continue;
    if (t.type === "REVENUE") entry.revenue += Number(t.amount);
    else entry.expense += Number(t.amount);
  }
  const revenueExpenseProfitTrend = Array.from(trendByDay.entries()).map(([date, v]) => ({
    date,
    label: format(new Date(date), "d MMM"),
    revenue: Math.round(v.revenue),
    expense: Math.round(v.expense),
    profit: Math.round(v.revenue - v.expense),
  }));

  // --- Monthly comparison (last 6 months) ---
  const monthBuckets = new Map<string, { revenue: number; expense: number }>();
  for (let i = 0; i < monthsBack; i++) {
    monthBuckets.set(format(addMonths(firstMonthStart, i), "yyyy-MM"), { revenue: 0, expense: 0 });
  }
  for (const t of monthlyTransactions) {
    const key = format(t.date, "yyyy-MM");
    const entry = monthBuckets.get(key);
    if (!entry) continue;
    if (t.type === "REVENUE") entry.revenue += Number(t.amount);
    else entry.expense += Number(t.amount);
  }
  const monthlyComparison = Array.from(monthBuckets.entries()).map(([month, v]) => ({
    month: format(new Date(`${month}-01`), "MMM yyyy"),
    revenue: Math.round(v.revenue),
    expense: Math.round(v.expense),
    profit: Math.round(v.revenue - v.expense),
  }));

  // --- Seasonal comparison ---
  const seasonalComparison = await Promise.all(
    seasons.map(async (season) => {
      const agg = await prisma.financeTransaction.groupBy({
        by: ["type"],
        where: { date: { gte: season.startDate, lte: season.endDate } },
        _sum: { amount: true },
      });
      const revenue = Number(agg.find((a) => a.type === "REVENUE")?._sum.amount ?? 0);
      const expense = Number(agg.find((a) => a.type === "EXPENSE")?._sum.amount ?? 0);
      return { season: season.name, revenue, expense, profit: revenue - expense };
    })
  );

  // --- Top revenue activities ---
  const topRevenueActivities = activityGroups
    .map((g) => ({
      activity: ACTIVITY_LABELS[g.activityType as ActivityType],
      revenue: Number(g._sum.price ?? 0),
      count: g._count,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // --- Dive site popularity ---
  const diveSiteIds = diveSiteGroups.map((d) => d.diveSiteId).filter((id): id is string => !!id);
  const diveSites = diveSiteIds.length
    ? await prisma.diveSite.findMany({
        where: { id: { in: diveSiteIds } },
        select: { id: true, name: true },
      })
    : [];
  const diveSiteMap = new Map(diveSites.map((d) => [d.id, d.name]));
  const diveSitePopularity = diveSiteGroups.map((d) => ({
    site: d.diveSiteId ? (diveSiteMap.get(d.diveSiteId) ?? "Unknown") : "Unknown",
    visits: d._count,
  }));

  // --- Instructor performance ---
  const instructorPerformance = await Promise.all(
    instructors.map(async (instructor) => {
      const [bookings, reviews] = await Promise.all([
        prisma.booking.findMany({
          where: { instructorId: instructor.id, status: { in: [...ACTIVE_BOOKING_STATUSES] } },
          select: { price: true },
        }),
        prisma.googleReview.aggregate({
          where: { instructorMentionedId: instructor.id },
          _avg: { rating: true },
        }),
      ]);
      return {
        name: instructor.fullName,
        bookings: bookings.length,
        revenue: bookings.reduce((sum, b) => sum + Number(b.price), 0),
        avgRating: reviews._avg.rating,
      };
    })
  );
  instructorPerformance.sort((a, b) => b.revenue - a.revenue);

  // --- Boat utilization ---
  const boatUtilization = boats.map((boat) => {
    const group = boatBookingGroups.find((g) => g.boatId === boat.id);
    const trips = group?._count ?? 0;
    const capacity = boat.capacity ?? 0;
    return {
      boat: boat.name,
      trips,
      utilizationPct: capacity > 0 ? Math.min(100, Math.round((trips / (capacity * 4)) * 100)) : 0,
    };
  });

  // --- Repeat customers ---
  const totalGuests = allGuestsWithBookingCounts.length;
  const repeatGuests = allGuestsWithBookingCounts.filter((g) => g._count.bookings > 1).length;
  const repeatCustomers = {
    totalGuests,
    repeatGuests,
    repeatRate: totalGuests > 0 ? (repeatGuests / totalGuests) * 100 : 0,
  };

  // --- Certification conversion ---
  const started = certifications.length;
  const completed = certifications.filter((c) => c.status === "COMPLETED" || c.status === "ISSUED").length;
  const certificationConversion = {
    started,
    completed,
    conversionRate: started > 0 ? (completed / started) * 100 : 0,
  };

  // --- Guest growth (last 6 months, new guests per month) ---
  const growthBuckets = new Map<string, number>();
  for (let i = 0; i < monthsBack; i++) {
    growthBuckets.set(format(addMonths(firstMonthStart, i), "yyyy-MM"), 0);
  }
  for (const g of guestsForGrowth) {
    const key = format(g.createdAt, "yyyy-MM");
    if (growthBuckets.has(key)) growthBuckets.set(key, (growthBuckets.get(key) ?? 0) + 1);
  }
  let cumulative = guestsForGrowth.filter((g) => g.createdAt < firstMonthStart).length;
  const guestGrowth = Array.from(growthBuckets.entries()).map(([month, newGuests]) => {
    cumulative += newGuests;
    return { month: format(new Date(`${month}-01`), "MMM yyyy"), newGuests, cumulativeGuests: cumulative };
  });

  // --- Payment analytics ---
  const methodTotals = new Map<string, { amount: number; count: number }>();
  const statusTotals = new Map<string, { amount: number; count: number }>();
  for (const p of payments) {
    const amt = Number(p._sum.amount ?? 0);
    const m = methodTotals.get(p.method) ?? { amount: 0, count: 0 };
    m.amount += amt;
    m.count += p._count;
    methodTotals.set(p.method, m);
    const s = statusTotals.get(p.status) ?? { amount: 0, count: 0 };
    s.amount += amt;
    s.count += p._count;
    statusTotals.set(p.status, s);
  }
  const paymentByMethod = Array.from(methodTotals.entries()).map(([method, v]) => ({ method, ...v }));
  const paymentByStatus = Array.from(statusTotals.entries()).map(([status, v]) => ({ status, ...v }));

  // --- Pending payment analytics ---
  const pendingPaymentAnalytics = [
    { category: "Guest payments", amount: Number(pendingGuestPayments._sum.amount ?? 0) },
    { category: "Freelancer payments", amount: Number(pendingFreelancerPayments._sum.amount ?? 0) },
    { category: "Staff salary", amount: Number(pendingStaffSalary._sum.amount ?? 0) },
    { category: "Boat/tempo vendors", amount: Number(boatSharingOutstanding._sum.outstandingAmount ?? 0) },
  ];

  return {
    revenueExpenseProfitTrend,
    monthlyComparison,
    seasonalComparison,
    topRevenueActivities,
    diveSitePopularity,
    instructorPerformance,
    boatUtilization,
    repeatCustomers,
    certificationConversion,
    guestGrowth,
    paymentByMethod,
    paymentByStatus,
    pendingPaymentAnalytics,
  };
}

export type AnalyticsData = Awaited<ReturnType<typeof getAnalyticsData>>;
