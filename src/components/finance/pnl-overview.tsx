import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { formatCurrencyINR, EXPENSE_CATEGORY_LABELS, REVENUE_CATEGORY_LABELS } from "@/lib/labels";
import type { ExpenseCategory, RevenueCategory } from "@prisma/client";

type Period = "today" | "month" | "season";

export function PnlOverview({
  period,
  periodLabel,
  hasActiveSeason,
  revenue,
  expense,
  chartData,
  revenueByCategory,
  expenseByCategory,
}: {
  period: Period;
  periodLabel: string;
  hasActiveSeason: boolean;
  revenue: number;
  expense: number;
  chartData: { date: string; label: string; revenue: number; expense: number; profit: number }[];
  revenueByCategory: { category: RevenueCategory | null; amount: number }[];
  expenseByCategory: { category: ExpenseCategory | null; amount: number }[];
}) {
  const profit = revenue - expense;
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return (
    <div className="flex flex-col gap-6">
      <Tabs value={period}>
        <TabsList>
          <TabsTrigger value="today" asChild>
            <Link href="/finance?tab=overview&period=today">Today</Link>
          </TabsTrigger>
          <TabsTrigger value="month" asChild>
            <Link href="/finance?tab=overview&period=month">This Month</Link>
          </TabsTrigger>
          <TabsTrigger value="season" asChild>
            <Link href="/finance?tab=overview&period=season">This Season</Link>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {period === "season" && !hasActiveSeason ? (
        <p className="text-sm text-muted-foreground">
          No active season — showing this month instead. Mark a season active in Prisma Studio to see
          season-to-date totals.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Revenue — {periodLabel}</p>
          <p className="text-xl font-semibold tabular-nums text-success">{formatCurrencyINR(revenue)}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Expenses — {periodLabel}</p>
          <p className="text-xl font-semibold tabular-nums text-destructive">{formatCurrencyINR(expense)}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Profit — {periodLabel}</p>
          <p className="text-xl font-semibold tabular-nums">{formatCurrencyINR(profit)}</p>
        </div>
        <div className="glass rounded-xl p-4">
          <p className="text-xs text-muted-foreground">Margin</p>
          <p className="text-xl font-semibold tabular-nums">{margin.toFixed(1)}%</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash flow</CardTitle>
          <CardDescription>Daily revenue vs expense — {periodLabel}</CardDescription>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No data for this period.</p>
          ) : (
            <RevenueChart data={chartData} />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue by category</CardTitle>
          </CardHeader>
          <CardContent>
            {revenueByCategory.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No revenue recorded.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {revenueByCategory.map((c) => (
                  <li key={c.category ?? "other"} className="flex items-center justify-between py-2 text-sm">
                    <span>{c.category ? REVENUE_CATEGORY_LABELS[c.category] : "Other"}</span>
                    <span className="font-medium tabular-nums">{formatCurrencyINR(c.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Expenses by category</CardTitle>
          </CardHeader>
          <CardContent>
            {expenseByCategory.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No expenses recorded.</p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {expenseByCategory.map((c) => (
                  <li key={c.category ?? "other"} className="flex items-center justify-between py-2 text-sm">
                    <span>{c.category ? EXPENSE_CATEGORY_LABELS[c.category] : "Other"}</span>
                    <span className="font-medium tabular-nums">{formatCurrencyINR(c.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
