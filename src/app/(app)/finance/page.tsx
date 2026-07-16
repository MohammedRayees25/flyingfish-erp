import type { Metadata } from "next";
import Link from "next/link";
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import {
  getDailyFinanceBreakdown,
  getCategoryBreakdown,
  summarizeTotals,
} from "@/lib/reports/finance-data";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TransactionFormSheet } from "@/components/finance/transaction-form-sheet";
import { TransactionsTable } from "@/components/finance/transactions-table";
import { PnlOverview } from "@/components/finance/pnl-overview";
import { StaffSalaryPanel } from "@/components/finance/staff-salary-panel";
import { PendingVendorPayments } from "@/components/finance/pending-vendor-payments";

export const metadata: Metadata = { title: "Finance" };

const PAGE_SIZE = 20;

export default async function FinancePage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    period?: string;
    q?: string;
    page?: string;
  }>;
}) {
  await requireModuleAccess("finance");
  const params = await searchParams;
  const tab = ["overview", "revenue", "expenses", "salary", "pending"].includes(params.tab ?? "")
    ? params.tab!
    : "overview";
  const period = params.period === "today" || params.period === "season" ? params.period : "month";
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Finance</h1>
          <p className="text-sm text-muted-foreground">
            Revenue, expenses, profit &amp; loss, cash flow and staff salary.
          </p>
        </div>
        {tab === "revenue" || tab === "expenses" ? (
          <TransactionFormSheet mode="create" defaultType={tab === "revenue" ? "REVENUE" : "EXPENSE"} />
        ) : null}
      </div>

      <Tabs value={tab}>
        <TabsList>
          <TabsTrigger value="overview" asChild>
            <Link href="/finance?tab=overview">Overview</Link>
          </TabsTrigger>
          <TabsTrigger value="revenue" asChild>
            <Link href="/finance?tab=revenue">Revenue</Link>
          </TabsTrigger>
          <TabsTrigger value="expenses" asChild>
            <Link href="/finance?tab=expenses">Expenses</Link>
          </TabsTrigger>
          <TabsTrigger value="salary" asChild>
            <Link href="/finance?tab=salary">Staff Salary</Link>
          </TabsTrigger>
          <TabsTrigger value="pending" asChild>
            <Link href="/finance?tab=pending">Pending &amp; Vendor</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {tab === "overview" ? <OverviewTab period={period} /> : null}
        </TabsContent>
        <TabsContent value="revenue">
          {tab === "revenue" ? (
            <Card>
              <CardContent className="pt-6">
                <TransactionsList type="REVENUE" q={q} page={page} />
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
        <TabsContent value="expenses">
          {tab === "expenses" ? (
            <Card>
              <CardContent className="pt-6">
                <TransactionsList type="EXPENSE" q={q} page={page} />
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
        <TabsContent value="salary">{tab === "salary" ? <SalaryTab /> : null}</TabsContent>
        <TabsContent value="pending">{tab === "pending" ? <PendingTab /> : null}</TabsContent>
      </Tabs>
    </div>
  );
}

async function OverviewTab({ period }: { period: string }) {
  const now = new Date();
  const activeSeason = await prisma.season.findFirst({ where: { isActive: true } });

  let start: Date;
  let end: Date;
  let periodLabel: string;

  if (period === "today") {
    start = startOfDay(now);
    end = endOfDay(now);
    periodLabel = format(now, "d MMM yyyy");
  } else if (period === "season" && activeSeason) {
    start = activeSeason.startDate;
    end = activeSeason.endDate;
    periodLabel = activeSeason.name;
  } else {
    start = startOfMonth(now);
    end = endOfMonth(now);
    periodLabel = format(now, "MMMM yyyy");
  }

  const [days, revenueByCategory, expenseByCategory] = await Promise.all([
    getDailyFinanceBreakdown(start, end),
    getCategoryBreakdown(start, end, "REVENUE"),
    getCategoryBreakdown(start, end, "EXPENSE"),
  ]);
  const totals = summarizeTotals(days);

  return (
    <PnlOverview
      period={period === "today" ? "today" : period === "season" ? "season" : "month"}
      periodLabel={periodLabel}
      hasActiveSeason={!!activeSeason}
      revenue={totals.revenue}
      expense={totals.expense}
      chartData={days.map((d) => ({
        date: format(d.date, "yyyy-MM-dd"),
        label: format(d.date, "d MMM"),
        revenue: Math.round(d.revenue),
        expense: Math.round(d.expense),
        profit: Math.round(d.profit),
      }))}
      revenueByCategory={revenueByCategory}
      expenseByCategory={expenseByCategory}
    />
  );
}

async function TransactionsList({
  type,
  q,
  page,
}: {
  type: "REVENUE" | "EXPENSE";
  q: string;
  page: number;
}) {
  const where: Prisma.FinanceTransactionWhereInput = {
    type,
    ...(q ? { description: { contains: q, mode: "insensitive" } } : {}),
  };

  const [transactionsRaw, total] = await Promise.all([
    prisma.financeTransaction.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.financeTransaction.count({ where }),
  ]);

  const transactions = transactionsRaw.map((t) => ({ ...t, amount: Number(t.amount) }));

  return (
    <TransactionsTable
      type={type}
      transactions={transactions}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      query={q}
    />
  );
}

async function SalaryTab() {
  const [staffRaw, paymentsRaw] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { fullName: "asc" },
      select: { id: true, fullName: true, role: true, monthlySalary: true },
    }),
    prisma.staffSalaryPayment.findMany({
      select: {
        id: true,
        month: true,
        amount: true,
        status: true,
        paidAt: true,
        user: { select: { fullName: true } },
      },
      orderBy: [{ month: "desc" }, { createdAt: "desc" }],
      take: 60,
    }),
  ]);

  const staff = staffRaw.map((s) => ({
    id: s.id,
    fullName: s.fullName,
    role: s.role,
    monthlySalary: Number(s.monthlySalary),
  }));
  const payments = paymentsRaw.map((p) => ({
    id: p.id,
    userName: p.user.fullName,
    month: p.month,
    amount: Number(p.amount),
    status: p.status,
    paidAt: p.paidAt,
  }));

  return <StaffSalaryPanel staff={staff} payments={payments} />;
}

async function PendingTab() {
  const [guestPending, freelancerPending, staffSalaryPending, vendorEntries] = await Promise.all([
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
    prisma.staffSalaryPayment.aggregate({
      where: { status: { in: ["PENDING", "PARTIAL"] } },
      _sum: { amount: true },
      _count: true,
    }),
    prisma.boatSharingEntry.findMany({
      where: { outstandingAmount: { gt: 0 } },
      select: { outstandingAmount: true },
    }),
  ]);

  const rollups = [
    {
      label: "Guest payments",
      description: "Pending & partial guest bookings",
      amount: Number(guestPending._sum.amount ?? 0),
      count: guestPending._count,
      href: "/guests",
    },
    {
      label: "Freelancer payments",
      description: "Pending & partial freelancer payouts",
      amount: Number(freelancerPending._sum.amount ?? 0),
      count: freelancerPending._count,
      href: "/freelancers",
    },
    {
      label: "Staff salary",
      description: "Pending & partial monthly salaries",
      amount: Number(staffSalaryPending._sum.amount ?? 0),
      count: staffSalaryPending._count,
      href: "/finance?tab=salary",
    },
    {
      label: "Boat / tempo vendors",
      description: "Outstanding trip payments owed to vendors",
      amount: vendorEntries.reduce((sum, e) => sum + Number(e.outstandingAmount), 0),
      count: vendorEntries.length,
      href: "/boat-sharing?tab=pending",
    },
  ];

  return <PendingVendorPayments rollups={rollups} />;
}
