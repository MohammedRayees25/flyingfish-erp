import "server-only";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  getDailyFinanceBreakdown,
  getCategoryBreakdown,
  getDistinctGuestCount,
  summarizeTotals,
  currency,
} from "./finance-data";
import type { ReportTable, ReportPeriod } from "./types";
import { EXPENSE_CATEGORY_LABELS, REVENUE_CATEGORY_LABELS } from "@/lib/labels";

// Shared by Daily / Weekly / Monthly / Seasonal — an operational + financial
// summary for the period, one row per calendar day.
export async function buildOperationalPeriodReport(
  id: string,
  title: string,
  period: ReportPeriod
): Promise<ReportTable> {
  const [days, guestCount, diveCount] = await Promise.all([
    getDailyFinanceBreakdown(period.start, period.end),
    getDistinctGuestCount(period.start, period.end),
    prisma.booking.count({
      where: {
        date: { gte: period.start, lte: period.end },
        status: { in: ["PENDING", "CONFIRMED", "COMPLETED"] },
        activityType: { not: "BOAT_RIDE" },
      },
    }),
  ]);
  const totals = summarizeTotals(days);

  return {
    id,
    title,
    subtitle: period.label,
    generatedAt: new Date(),
    summary: [
      { label: "Guests", value: String(guestCount) },
      { label: "Bookings", value: String(totals.bookings) },
      { label: "Dives", value: String(diveCount) },
      { label: "Revenue", value: currency(totals.revenue) },
      { label: "Expenses", value: currency(totals.expense) },
      { label: "Profit", value: currency(totals.profit) },
    ],
    columns: [
      { key: "date", header: "Date" },
      { key: "bookings", header: "Bookings", align: "right" },
      { key: "guests", header: "Guests", align: "right" },
      { key: "revenue", header: "Revenue", align: "right" },
      { key: "expense", header: "Expense", align: "right" },
      { key: "profit", header: "Profit", align: "right" },
    ],
    rows: days.map((d) => ({
      date: format(d.date, "d MMM yyyy"),
      bookings: d.bookings,
      guests: d.guests,
      revenue: currency(d.revenue),
      expense: currency(d.expense),
      profit: currency(d.profit),
    })),
  };
}

export async function buildRevenueReport(period: ReportPeriod): Promise<ReportTable> {
  const [transactions, byCategory] = await Promise.all([
    prisma.financeTransaction.findMany({
      where: { type: "REVENUE", date: { gte: period.start, lte: period.end } },
      orderBy: { date: "desc" },
      select: { date: true, revenueCategory: true, description: true, amount: true },
    }),
    getCategoryBreakdown(period.start, period.end, "REVENUE"),
  ]);
  const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  return {
    id: "revenue",
    title: "Revenue Report",
    subtitle: period.label,
    generatedAt: new Date(),
    summary: [
      { label: "Total revenue", value: currency(total) },
      { label: "Transactions", value: String(transactions.length) },
      ...byCategory.map((c) => ({
        label: c.category ? REVENUE_CATEGORY_LABELS[c.category as keyof typeof REVENUE_CATEGORY_LABELS] : "Other",
        value: currency(c.amount),
      })),
    ],
    columns: [
      { key: "date", header: "Date" },
      { key: "category", header: "Category" },
      { key: "description", header: "Description" },
      { key: "amount", header: "Amount", align: "right" },
    ],
    rows: transactions.map((t) => ({
      date: format(t.date, "d MMM yyyy"),
      category: t.revenueCategory
        ? REVENUE_CATEGORY_LABELS[t.revenueCategory as keyof typeof REVENUE_CATEGORY_LABELS]
        : "—",
      description: t.description ?? "—",
      amount: currency(Number(t.amount)),
    })),
  };
}

export async function buildExpenseReport(period: ReportPeriod): Promise<ReportTable> {
  const [transactions, byCategory] = await Promise.all([
    prisma.financeTransaction.findMany({
      where: { type: "EXPENSE", date: { gte: period.start, lte: period.end } },
      orderBy: { date: "desc" },
      select: { date: true, expenseCategory: true, description: true, amount: true },
    }),
    getCategoryBreakdown(period.start, period.end, "EXPENSE"),
  ]);
  const total = transactions.reduce((sum, t) => sum + Number(t.amount), 0);

  return {
    id: "expense",
    title: "Expense Report",
    subtitle: period.label,
    generatedAt: new Date(),
    summary: [
      { label: "Total expenses", value: currency(total) },
      { label: "Transactions", value: String(transactions.length) },
      ...byCategory.map((c) => ({
        label: c.category ? EXPENSE_CATEGORY_LABELS[c.category as keyof typeof EXPENSE_CATEGORY_LABELS] : "Other",
        value: currency(c.amount),
      })),
    ],
    columns: [
      { key: "date", header: "Date" },
      { key: "category", header: "Category" },
      { key: "description", header: "Description" },
      { key: "amount", header: "Amount", align: "right" },
    ],
    rows: transactions.map((t) => ({
      date: format(t.date, "d MMM yyyy"),
      category: t.expenseCategory
        ? EXPENSE_CATEGORY_LABELS[t.expenseCategory as keyof typeof EXPENSE_CATEGORY_LABELS]
        : "—",
      description: t.description ?? "—",
      amount: currency(Number(t.amount)),
    })),
  };
}

export async function buildProfitReport(period: ReportPeriod): Promise<ReportTable> {
  const days = await getDailyFinanceBreakdown(period.start, period.end);
  const totals = summarizeTotals(days);

  return {
    id: "profit",
    title: "Profit Report",
    subtitle: period.label,
    generatedAt: new Date(),
    summary: [
      { label: "Revenue", value: currency(totals.revenue) },
      { label: "Expenses", value: currency(totals.expense) },
      { label: "Profit", value: currency(totals.profit) },
      { label: "Margin", value: `${totals.margin.toFixed(1)}%` },
    ],
    columns: [
      { key: "date", header: "Date" },
      { key: "revenue", header: "Revenue", align: "right" },
      { key: "expense", header: "Expense", align: "right" },
      { key: "profit", header: "Profit", align: "right" },
      { key: "margin", header: "Margin", align: "right" },
    ],
    rows: days.map((d) => ({
      date: format(d.date, "d MMM yyyy"),
      revenue: currency(d.revenue),
      expense: currency(d.expense),
      profit: currency(d.profit),
      margin: d.revenue > 0 ? `${(((d.revenue - d.expense) / d.revenue) * 100).toFixed(1)}%` : "—",
    })),
  };
}
