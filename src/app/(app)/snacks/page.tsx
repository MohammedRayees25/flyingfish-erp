import type { Metadata } from "next";
import Link from "next/link";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { getBoats } from "@/lib/reference-data";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SnacksOverview, type LowStockItem, type RecentActivityEntry } from "@/components/snacks/snacks-overview";
import { SnackItemFormSheet } from "@/components/snacks/snack-item-form-sheet";
import { SnackItemsTable } from "@/components/snacks/snack-items-table";
import { SnackPurchaseFormSheet } from "@/components/snacks/snack-purchase-form-sheet";
import { SnackPurchasesTable, type SnackPurchaseRow } from "@/components/snacks/snack-purchases-table";
import { SnackConsumptionFormSheet } from "@/components/snacks/snack-consumption-form-sheet";
import { SnackConsumptionTable, type SnackConsumptionRow } from "@/components/snacks/snack-consumption-table";

export const metadata: Metadata = { title: "Novotel Snacks" };

const PAGE_SIZE = 20;
const TABS = ["overview", "inventory", "purchases", "consumption"] as const;

export default async function SnacksPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    page?: string;
    from?: string;
    to?: string;
  }>;
}) {
  await requireModuleAccess("snacks");
  const params = await searchParams;
  const tab = TABS.includes(params.tab as (typeof TABS)[number]) ? params.tab! : "overview";
  const q = params.q?.trim() ?? "";
  const page = Math.max(1, Number(params.page) || 1);
  const from = params.from?.trim() ?? "";
  const to = params.to?.trim() ?? "";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Novotel Snacks</h1>
          <p className="text-sm text-muted-foreground">
            Inventory, purchases and consumption for guest snacks &amp; buffet.
          </p>
        </div>
        {tab === "inventory" ? <SnackItemFormSheet mode="create" /> : null}
      </div>

      <Tabs value={tab}>
        <TabsList>
          <TabsTrigger value="overview" asChild>
            <Link href="/snacks?tab=overview">Overview</Link>
          </TabsTrigger>
          <TabsTrigger value="inventory" asChild>
            <Link href="/snacks?tab=inventory">Inventory</Link>
          </TabsTrigger>
          <TabsTrigger value="purchases" asChild>
            <Link href="/snacks?tab=purchases">Purchases</Link>
          </TabsTrigger>
          <TabsTrigger value="consumption" asChild>
            <Link href="/snacks?tab=consumption">Consumption</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">{tab === "overview" ? <OverviewTab /> : null}</TabsContent>
        <TabsContent value="inventory">
          {tab === "inventory" ? <InventoryTab q={q} page={page} /> : null}
        </TabsContent>
        <TabsContent value="purchases">
          {tab === "purchases" ? <PurchasesTab q={q} page={page} from={from} to={to} /> : null}
        </TabsContent>
        <TabsContent value="consumption">
          {tab === "consumption" ? <ConsumptionTab q={q} page={page} from={from} to={to} /> : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function OverviewTab() {
  const now = new Date();
  const dayStart = startOfDay(now);
  const dayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const [todayConsumption, monthPurchases, activeItems, recentPurchases, recentConsumptions] =
    await Promise.all([
      prisma.snackConsumption.aggregate({
        where: { date: { gte: dayStart, lte: dayEnd } },
        _sum: { quantity: true },
      }),
      prisma.snackPurchase.aggregate({
        where: { date: { gte: monthStart, lte: monthEnd } },
        _sum: { totalCost: true },
      }),
      prisma.snackItem.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
      prisma.snackPurchase.findMany({
        select: {
          id: true,
          date: true,
          quantity: true,
          vendor: true,
          item: { select: { name: true, unit: true } },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 10,
      }),
      prisma.snackConsumption.findMany({
        select: {
          id: true,
          date: true,
          quantity: true,
          item: { select: { name: true, unit: true } },
          guest: { select: { fullName: true } },
          boat: { select: { name: true } },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: 10,
      }),
    ]);

  const lowStockItems: LowStockItem[] = activeItems
    .filter((item) => item.currentStock <= item.reorderLevel)
    .map((item) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
      currentStock: item.currentStock,
      reorderLevel: item.reorderLevel,
    }));

  const activity: RecentActivityEntry[] = [
    ...recentPurchases.map((p) => ({
      id: `purchase-${p.id}`,
      kind: "purchase" as const,
      date: p.date,
      itemName: p.item.name,
      quantity: p.quantity,
      unit: p.item.unit,
      detail: p.vendor,
    })),
    ...recentConsumptions.map((c) => ({
      id: `consumption-${c.id}`,
      kind: "consumption" as const,
      date: c.date,
      itemName: c.item.name,
      quantity: c.quantity,
      unit: c.item.unit,
      detail: c.guest?.fullName ?? c.boat?.name ?? null,
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);

  return (
    <SnacksOverview
      todayConsumptionQty={todayConsumption._sum.quantity ?? 0}
      monthPurchaseCost={Number(monthPurchases._sum.totalCost ?? 0)}
      lowStockItems={lowStockItems}
      recentActivity={activity}
    />
  );
}

async function InventoryTab({ q, page }: { q: string; page: number }) {
  const where: Prisma.SnackItemWhereInput = q
    ? { name: { contains: q, mode: "insensitive" } }
    : {};

  const [itemsRaw, total] = await Promise.all([
    prisma.snackItem.findMany({
      where,
      orderBy: { name: "asc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.snackItem.count({ where }),
  ]);

  const items = itemsRaw.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    costPerUnit: Number(item.costPerUnit),
    reorderLevel: item.reorderLevel,
    isActive: item.isActive,
    currentStock: item.currentStock,
  }));

  return (
    <Card>
      <CardContent className="pt-6">
        <SnackItemsTable items={items} total={total} page={page} pageSize={PAGE_SIZE} query={q} />
      </CardContent>
    </Card>
  );
}

async function PurchasesTab({
  q,
  page,
  from,
  to,
}: {
  q: string;
  page: number;
  from: string;
  to: string;
}) {
  const dateFilter: Prisma.SnackPurchaseWhereInput["date"] = {};
  if (from) dateFilter.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) dateFilter.lte = new Date(`${to}T23:59:59.999Z`);

  const where: Prisma.SnackPurchaseWhereInput = {
    ...(q
      ? {
          OR: [
            { item: { name: { contains: q, mode: "insensitive" } } },
            { vendor: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
  };

  const [purchasesRaw, total, itemsRaw] = await Promise.all([
    prisma.snackPurchase.findMany({
      where,
      select: {
        id: true,
        date: true,
        quantity: true,
        unitCost: true,
        totalCost: true,
        vendor: true,
        item: { select: { name: true, unit: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.snackPurchase.count({ where }),
    prisma.snackItem.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
  ]);

  const purchases: SnackPurchaseRow[] = purchasesRaw.map((p) => ({
    id: p.id,
    date: p.date,
    itemName: p.item.name,
    quantity: p.quantity,
    unit: p.item.unit,
    unitCost: Number(p.unitCost),
    totalCost: Number(p.totalCost),
    vendor: p.vendor,
  }));

  const items = itemsRaw.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    costPerUnit: Number(item.costPerUnit),
  }));

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex justify-end">
          <SnackPurchaseFormSheet items={items} />
        </div>
        <SnackPurchasesTable
          purchases={purchases}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          query={q}
          from={from}
          to={to}
        />
      </CardContent>
    </Card>
  );
}

async function ConsumptionTab({
  q,
  page,
  from,
  to,
}: {
  q: string;
  page: number;
  from: string;
  to: string;
}) {
  const dateFilter: Prisma.SnackConsumptionWhereInput["date"] = {};
  if (from) dateFilter.gte = new Date(`${from}T00:00:00.000Z`);
  if (to) dateFilter.lte = new Date(`${to}T23:59:59.999Z`);

  const where: Prisma.SnackConsumptionWhereInput = {
    ...(q
      ? {
          OR: [
            { item: { name: { contains: q, mode: "insensitive" } } },
            { guest: { fullName: { contains: q, mode: "insensitive" } } },
            { boat: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
    ...(Object.keys(dateFilter).length ? { date: dateFilter } : {}),
  };

  const [consumptionsRaw, total, itemsRaw, boats] = await Promise.all([
    prisma.snackConsumption.findMany({
      where,
      select: {
        id: true,
        date: true,
        quantity: true,
        item: { select: { name: true, unit: true } },
        guest: { select: { fullName: true } },
        boat: { select: { name: true } },
      },
      orderBy: { date: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.snackConsumption.count({ where }),
    prisma.snackItem.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    getBoats(),
  ]);

  const consumptions: SnackConsumptionRow[] = consumptionsRaw.map((c) => ({
    id: c.id,
    date: c.date,
    itemName: c.item.name,
    quantity: c.quantity,
    unit: c.item.unit,
    guestName: c.guest?.fullName ?? null,
    boatName: c.boat?.name ?? null,
  }));

  const items = itemsRaw.map((item) => ({
    id: item.id,
    name: item.name,
    unit: item.unit,
    currentStock: item.currentStock,
  }));

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 pt-6">
        <div className="flex justify-end">
          <SnackConsumptionFormSheet items={items} boats={boats} />
        </div>
        <SnackConsumptionTable
          consumptions={consumptions}
          total={total}
          page={page}
          pageSize={PAGE_SIZE}
          query={q}
          from={from}
          to={to}
        />
      </CardContent>
    </Card>
  );
}
