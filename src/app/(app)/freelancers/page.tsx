import type { Metadata } from "next";
import { format } from "date-fns";
import { Users, Wallet, Receipt, Download } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { FreelancersTable } from "@/components/freelancers/freelancers-table";
import { FreelancerFormSheet } from "@/components/freelancers/freelancer-form-sheet";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrencyINR } from "@/lib/labels";

export const metadata: Metadata = { title: "Freelancers" };

const PENDING_STATUSES = ["PENDING", "PARTIAL"] as const;

export default async function FreelancersPage() {
  await requireModuleAccess("freelancers");

  const [freelancers, pendingByFreelancer, pendingCount] = await Promise.all([
    prisma.freelancer.findMany({ orderBy: { fullName: "asc" } }),
    prisma.freelancerPayment.groupBy({
      by: ["freelancerId"],
      where: { status: { in: [...PENDING_STATUSES] } },
      _sum: { amount: true },
    }),
    prisma.freelancerPayment.count({
      where: { status: { in: [...PENDING_STATUSES] } },
    }),
  ]);

  const pendingMap = new Map(
    pendingByFreelancer.map((row) => [row.freelancerId, Number(row._sum.amount ?? 0)])
  );

  const rows = freelancers.map((f) => ({
    id: f.id,
    fullName: f.fullName,
    role: f.role,
    phone: f.phone,
    dayRate: Number(f.dayRate),
    isActive: f.isActive,
    pendingAmount: pendingMap.get(f.id) ?? 0,
  }));

  const activeCount = freelancers.filter((f) => f.isActive).length;
  const totalPendingAmount = rows.reduce((sum, r) => sum + r.pendingAmount, 0);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Freelancers</h1>
          <p className="text-sm text-muted-foreground">
            {freelancers.length} freelancer{freelancers.length === 1 ? "" : "s"} on record
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={`/api/reports/freelancers?month=${format(new Date(), "yyyy-MM")}`}>
              <Download /> Export to Excel
            </a>
          </Button>
          <FreelancerFormSheet mode="create" />
        </div>
      </div>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Active Freelancers" value={activeCount} icon={Users} />
        <StatCard
          label="Pending Payments"
          value={formatCurrencyINR(totalPendingAmount)}
          icon={Wallet}
          tone="warning"
        />
        <StatCard label="Pending Payment Count" value={pendingCount} icon={Receipt} tone="warning" />
      </section>

      <Card>
        <CardContent className="pt-6">
          <FreelancersTable freelancers={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
