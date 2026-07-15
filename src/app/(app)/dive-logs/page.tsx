import type { Metadata } from "next";
import Link from "next/link";
import { format, subDays } from "date-fns";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { getInstructors, getBoats, getDiveSites } from "@/lib/reference-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiveLogFormSheet } from "@/components/dive-logs/dive-log-form-sheet";
import { DiveLogsTable, type DiveLogRow } from "@/components/dive-logs/dive-logs-table";
import { RecentDivesList, type RecentDive } from "@/components/dive-logs/recent-dives-list";
import { RankedBarList } from "@/components/dashboard/ranked-bar-list";
import { VisibilityTrendChart } from "@/components/dive-logs/visibility-trend-chart";

export const metadata: Metadata = { title: "Dive Logs" };

const PAGE_SIZE = 20;

function toDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export default async function DiveLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    start?: string;
    end?: string;
    diveSiteId?: string;
    instructorId?: string;
    boatId?: string;
    page?: string;
  }>;
}) {
  await requireModuleAccess("diveLogs");
  const params = await searchParams;
  const tab = params.tab === "log" ? "log" : "overview";
  const q = params.q?.trim() ?? "";
  const start = params.start ?? "";
  const end = params.end ?? "";
  const diveSiteId = params.diveSiteId ?? "";
  const instructorId = params.instructorId ?? "";
  const boatId = params.boatId ?? "";
  const page = Math.max(1, Number(params.page) || 1);

  const [instructorsRaw, boatsRaw, diveSitesRaw] = await Promise.all([
    getInstructors(),
    getBoats(),
    getDiveSites(),
  ]);
  const instructors = instructorsRaw;
  const boats = boatsRaw.map((b) => ({ id: b.id, fullName: b.name }));
  const diveSites = diveSitesRaw.map((d) => ({ id: d.id, fullName: d.name }));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dive Logs</h1>
          <p className="text-sm text-muted-foreground">
            Record dive conditions, guests and equipment for every dive.
          </p>
        </div>
        {tab === "log" ? (
          <DiveLogFormSheet mode="create" instructors={instructors} boats={boats} diveSites={diveSites} />
        ) : null}
      </div>

      <Tabs value={tab}>
        <TabsList>
          <TabsTrigger value="overview" asChild>
            <Link href="/dive-logs?tab=overview">Overview</Link>
          </TabsTrigger>
          <TabsTrigger value="log" asChild>
            <Link href="/dive-logs?tab=log">Log</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">{tab === "overview" ? <OverviewTab /> : null}</TabsContent>

        <TabsContent value="log">
          {tab === "log" ? (
            <Card>
              <CardContent className="pt-6">
                <LogTab
                  q={q}
                  start={start}
                  end={end}
                  diveSiteId={diveSiteId}
                  instructorId={instructorId}
                  boatId={boatId}
                  page={page}
                  instructors={instructors}
                  boats={boats}
                  diveSites={diveSites}
                />
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function OverviewTab() {
  const since = subDays(new Date(), 29);

  const [recentRaw, groupedSites, visibilityLogs] = await Promise.all([
    prisma.diveLog.findMany({
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      take: 5,
      include: {
        diveSite: { select: { name: true } },
        instructor: { select: { fullName: true } },
        _count: { select: { guests: true } },
      },
    }),
    prisma.diveLog.groupBy({
      by: ["diveSiteId"],
      where: { diveSiteId: { not: null } },
      _count: { diveSiteId: true },
      orderBy: { _count: { diveSiteId: "desc" } },
      take: 8,
    }),
    prisma.diveLog.findMany({
      where: { date: { gte: since }, visibility: { not: null } },
      select: { date: true, visibility: true },
      orderBy: { date: "asc" },
    }),
  ]);

  const recentDives: RecentDive[] = recentRaw.map((log) => ({
    id: log.id,
    date: log.date,
    diveSiteName: log.diveSite?.name ?? null,
    instructorName: log.instructor?.fullName ?? null,
    guestCount: log._count.guests,
  }));

  const siteIds = groupedSites
    .map((g) => g.diveSiteId)
    .filter((id): id is string => id !== null);
  const sites = siteIds.length
    ? await prisma.diveSite.findMany({ where: { id: { in: siteIds } }, select: { id: true, name: true } })
    : [];
  const siteNameMap = new Map(sites.map((s) => [s.id, s.name]));
  const mostVisitedSites = groupedSites
    .filter((g) => g.diveSiteId !== null)
    .map((g) => ({
      label: siteNameMap.get(g.diveSiteId as string) ?? "Unknown",
      value: g._count.diveSiteId,
    }));

  const byDay = new Map<string, { sum: number; count: number }>();
  for (const log of visibilityLogs) {
    const key = format(log.date, "yyyy-MM-dd");
    const entry = byDay.get(key) ?? { sum: 0, count: 0 };
    entry.sum += log.visibility as number;
    entry.count += 1;
    byDay.set(key, entry);
  }
  const visibilityTrend = Array.from(byDay.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { sum, count }]) => ({
      date,
      label: format(new Date(`${date}T00:00:00`), "d MMM"),
      avgVisibility: Math.round((sum / count) * 10) / 10,
    }));

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Recent dives</CardTitle>
          <CardDescription>The last 5 dive logs recorded.</CardDescription>
        </CardHeader>
        <CardContent>
          <RecentDivesList dives={recentDives} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Most visited sites</CardTitle>
          <CardDescription>Dive count by site, all-time.</CardDescription>
        </CardHeader>
        <CardContent>
          <RankedBarList items={mostVisitedSites} />
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Visibility trend</CardTitle>
          <CardDescription>Average visibility per day — last 30 days.</CardDescription>
        </CardHeader>
        <CardContent>
          <VisibilityTrendChart data={visibilityTrend} />
        </CardContent>
      </Card>
    </div>
  );
}

async function LogTab({
  q,
  start,
  end,
  diveSiteId,
  instructorId,
  boatId,
  page,
  instructors,
  boats,
  diveSites,
}: {
  q: string;
  start: string;
  end: string;
  diveSiteId: string;
  instructorId: string;
  boatId: string;
  page: number;
  instructors: { id: string; fullName: string }[];
  boats: { id: string; fullName: string }[];
  diveSites: { id: string; fullName: string }[];
}) {
  const where: Prisma.DiveLogWhereInput = {
    ...(diveSiteId ? { diveSiteId } : {}),
    ...(instructorId ? { instructorId } : {}),
    ...(boatId ? { boatId } : {}),
    ...(start || end
      ? {
          date: {
            ...(start ? { gte: toDateOnly(start) } : {}),
            ...(end ? { lte: toDateOnly(end) } : {}),
          },
        }
      : {}),
    ...(q
      ? {
          OR: [
            { diveSite: { name: { contains: q, mode: "insensitive" } } },
            { instructor: { fullName: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [logsRaw, total] = await Promise.all([
    prisma.diveLog.findMany({
      where,
      orderBy: { date: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        diveSite: { select: { name: true } },
        boat: { select: { name: true } },
        instructor: { select: { fullName: true } },
        guests: { include: { guest: { select: { id: true, fullName: true, phone: true } } } },
        _count: { select: { guests: true } },
      },
    }),
    prisma.diveLog.count({ where }),
  ]);

  const logs: DiveLogRow[] = logsRaw;

  return (
    <DiveLogsTable
      logs={logs}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      query={q}
      start={start}
      end={end}
      diveSiteId={diveSiteId}
      instructorId={instructorId}
      boatId={boatId}
      instructors={instructors}
      boats={boats}
      diveSites={diveSites}
    />
  );
}
