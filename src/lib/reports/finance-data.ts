import "server-only";
import { eachDayOfInterval, format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { formatCurrencyINR } from "@/lib/labels";
import type { ExpenseCategory, RevenueCategory } from "@prisma/client";

export async function getDailyFinanceBreakdown(start: Date, end: Date) {
  const [transactions, bookings] = await Promise.all([
    prisma.financeTransaction.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true, type: true, amount: true },
    }),
    prisma.booking.findMany({
      where: { date: { gte: start, lte: end }, status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } },
      select: { date: true, guestId: true, activityType: true },
    }),
  ]);

  const days = eachDayOfInterval({ start, end });
  const byDay = new Map(
    days.map((d) => [
      format(d, "yyyy-MM-dd"),
      { date: d, revenue: 0, expense: 0, bookings: 0, guests: new Set<string>() },
    ])
  );

  for (const t of transactions) {
    const entry = byDay.get(format(t.date, "yyyy-MM-dd"));
    if (!entry) continue;
    if (t.type === "REVENUE") entry.revenue += Number(t.amount);
    else entry.expense += Number(t.amount);
  }
  for (const b of bookings) {
    const entry = byDay.get(format(b.date, "yyyy-MM-dd"));
    if (!entry) continue;
    entry.bookings += 1;
    entry.guests.add(b.guestId);
  }

  return Array.from(byDay.values()).map((d) => ({
    date: d.date,
    bookings: d.bookings,
    guests: d.guests.size,
    revenue: d.revenue,
    expense: d.expense,
    profit: d.revenue - d.expense,
  }));
}

export async function getCategoryBreakdown(
  start: Date,
  end: Date,
  type: "REVENUE"
): Promise<{ category: RevenueCategory | null; amount: number; count: number }[]>;
export async function getCategoryBreakdown(
  start: Date,
  end: Date,
  type: "EXPENSE"
): Promise<{ category: ExpenseCategory | null; amount: number; count: number }[]>;
export async function getCategoryBreakdown(
  start: Date,
  end: Date,
  type: "REVENUE" | "EXPENSE"
): Promise<{ category: RevenueCategory | ExpenseCategory | null; amount: number; count: number }[]> {
  const grouped = await prisma.financeTransaction.groupBy({
    by: type === "REVENUE" ? ["revenueCategory"] : ["expenseCategory"],
    where: { type, date: { gte: start, lte: end } },
    _sum: { amount: true },
    _count: true,
  });

  return grouped
    .map((g) => ({
      category: (type === "REVENUE" ? g.revenueCategory : g.expenseCategory) as
        | RevenueCategory
        | ExpenseCategory
        | null,
      amount: Number(g._sum.amount ?? 0),
      count: g._count,
    }))
    .sort((a, b) => b.amount - a.amount);
}

export function summarizeTotals(days: Awaited<ReturnType<typeof getDailyFinanceBreakdown>>) {
  const revenue = days.reduce((sum, d) => sum + d.revenue, 0);
  const expense = days.reduce((sum, d) => sum + d.expense, 0);
  const bookings = days.reduce((sum, d) => sum + d.bookings, 0);
  return {
    revenue,
    expense,
    profit: revenue - expense,
    margin: revenue > 0 ? ((revenue - expense) / revenue) * 100 : 0,
    bookings,
  };
}

export async function getDistinctGuestCount(start: Date, end: Date) {
  const guests = await prisma.booking.findMany({
    where: { date: { gte: start, lte: end }, status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] } },
    select: { guestId: true },
    distinct: ["guestId"],
  });
  return guests.length;
}

export function currency(amount: number) {
  return formatCurrencyINR(Math.round(amount));
}
