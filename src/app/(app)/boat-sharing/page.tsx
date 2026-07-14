import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { getBoats } from "@/lib/reference-data";
import { getBoatSharingReport } from "@/lib/boat-sharing-reports";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EntryFormSheet } from "@/components/boat-sharing/entry-form-sheet";
import { EntriesTable } from "@/components/boat-sharing/entries-table";
import { PendingSplitsTable } from "@/components/boat-sharing/pending-splits-table";
import { ReportView } from "@/components/boat-sharing/report-view";

export const metadata: Metadata = { title: "Boat Sharing" };

export default async function BoatSharingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; month?: string }>;
}) {
  await requireModuleAccess("boatSharing");
  const params = await searchParams;
  const tab = ["entries", "pending", "reports"].includes(params.tab ?? "") ? params.tab! : "entries";
  const month = params.month ?? format(new Date(), "yyyy-MM");

  const boatsRaw = await getBoats();
  const boats = boatsRaw.map((b) => ({ id: b.id, name: b.name }));

  const [entriesRaw, pendingSplitsRaw, activeSeason] = await Promise.all([
    prisma.boatSharingEntry.findMany({
      orderBy: { date: "desc" },
      take: 60,
      include: { boat: true },
    }),
    prisma.boatSharingSplit.findMany({
      where: { status: { in: ["PENDING", "PARTIAL"] } },
      include: { entry: { include: { boat: true } } },
      orderBy: { entry: { date: "desc" } },
    }),
    prisma.season.findFirst({ where: { isActive: true } }),
  ]);

  const entries = entriesRaw.map((e) => ({
    ...e,
    boatAmount: Number(e.boatAmount),
    tempoAmount: Number(e.tempoAmount),
    outstandingAmount: Number(e.outstandingAmount),
  }));

  const pendingSplits = pendingSplitsRaw.map((s) => ({
    ...s,
    amountDue: Number(s.amountDue),
    amountPaid: Number(s.amountPaid),
  }));

  const monthStart = new Date(`${month}-01T00:00:00`);
  const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0, 23, 59, 59);

  const [monthlyData, seasonData] = await Promise.all([
    tab === "reports"
      ? getBoatSharingReport({ date: { gte: monthStart, lte: monthEnd } })
      : Promise.resolve(null),
    tab === "reports" && activeSeason
      ? getBoatSharingReport({ date: { gte: activeSeason.startDate, lte: activeSeason.endDate } })
      : Promise.resolve(null),
  ]);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Boat Sharing</h1>
          <p className="text-sm text-muted-foreground">
            Automatic cost split across Flying Fish, Dive Goa and SEI, vendor payments and reports.
          </p>
        </div>
        <EntryFormSheet mode="create" boats={boats} />
      </div>

      <Tabs value={tab}>
        <TabsList>
          <TabsTrigger value="entries" asChild>
            <Link href="/boat-sharing?tab=entries">Entries</Link>
          </TabsTrigger>
          <TabsTrigger value="pending" asChild>
            <Link href="/boat-sharing?tab=pending">
              Pending Payments {pendingSplits.length > 0 ? `(${pendingSplits.length})` : ""}
            </Link>
          </TabsTrigger>
          <TabsTrigger value="reports" asChild>
            <Link href={`/boat-sharing?tab=reports&month=${month}`}>Reports</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="entries">
          <Card>
            <CardContent className="pt-6">
              <EntriesTable entries={entries} boats={boats} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardContent className="pt-6">
              <PendingSplitsTable splits={pendingSplits} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports">
          {monthlyData ? (
            <ReportView
              month={month}
              monthlyData={monthlyData}
              season={activeSeason ? { id: activeSeason.id, name: activeSeason.name } : null}
              seasonData={seasonData}
            />
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}
