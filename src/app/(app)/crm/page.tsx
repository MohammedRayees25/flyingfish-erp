import type { Metadata } from "next";
import Link from "next/link";
import { format, startOfDay, endOfDay } from "date-fns";
import { Prisma, type LeadStage } from "@prisma/client";
import { Percent, Users, ListX, CalendarClock } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { getActiveStaff } from "@/lib/reference-data";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatCard } from "@/components/dashboard/stat-card";
import { LeadFormSheet } from "@/components/crm/lead-form-sheet";
import { LeadsTable, type LeadRow } from "@/components/crm/leads-table";
import { PipelineBoard, type PipelineLead } from "@/components/crm/pipeline-board";
import { LeadFunnelChart } from "@/components/crm/lead-funnel-chart";
import { TodaysFollowups } from "@/components/crm/todays-followups";
import { LEAD_STAGE_ORDER, LEAD_STAGE_LABELS } from "@/lib/crm-labels";

export const metadata: Metadata = { title: "CRM" };

const PAGE_SIZE = 20;
const TABS = ["pipeline", "leads", "overview"] as const;
type Tab = (typeof TABS)[number];

export default async function CrmPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    page?: string;
    stage?: string;
    source?: string;
    assignedToId?: string;
  }>;
}) {
  await requireModuleAccess("crm");
  const params = await searchParams;
  const tab: Tab = (TABS as readonly string[]).includes(params.tab ?? "")
    ? (params.tab as Tab)
    : "pipeline";

  const staffRaw = await getActiveStaff();
  const staffOptions = staffRaw.map((s) => ({ id: s.id, fullName: s.fullName }));

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">CRM</h1>
          <p className="text-sm text-muted-foreground">
            Track leads from first contact through booking.
          </p>
        </div>
        <LeadFormSheet mode="create" staffOptions={staffOptions} />
      </div>

      <Tabs value={tab}>
        <TabsList>
          <TabsTrigger value="pipeline" asChild>
            <Link href="/crm?tab=pipeline">Pipeline</Link>
          </TabsTrigger>
          <TabsTrigger value="leads" asChild>
            <Link href="/crm?tab=leads">Leads</Link>
          </TabsTrigger>
          <TabsTrigger value="overview" asChild>
            <Link href="/crm?tab=overview">Overview</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pipeline">{tab === "pipeline" ? <PipelineTab /> : null}</TabsContent>
        <TabsContent value="leads">
          {tab === "leads" ? (
            <Card>
              <CardContent className="pt-6">
                <LeadsTab
                  q={params.q?.trim() ?? ""}
                  page={Math.max(1, Number(params.page) || 1)}
                  stage={params.stage ?? ""}
                  source={params.source ?? ""}
                  assignedToId={params.assignedToId ?? ""}
                  staffOptions={staffOptions}
                />
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
        <TabsContent value="overview">{tab === "overview" ? <OverviewTab /> : null}</TabsContent>
      </Tabs>
    </div>
  );
}

async function PipelineTab() {
  const leadsRaw = await prisma.lead.findMany({ orderBy: { createdAt: "desc" } });

  const leadsByStage = Object.fromEntries(
    LEAD_STAGE_ORDER.map((stage) => [stage, [] as PipelineLead[]])
  ) as Record<LeadStage, PipelineLead[]>;

  leadsRaw.forEach((lead) => {
    leadsByStage[lead.stage].push({
      id: lead.id,
      fullName: lead.fullName,
      phone: lead.phone,
      source: lead.source,
      followUpAt: lead.followUpAt,
      isRepeatCustomer: lead.isRepeatCustomer,
      stage: lead.stage,
    });
  });

  return <PipelineBoard leadsByStage={leadsByStage} />;
}

async function LeadsTab({
  q,
  page,
  stage,
  source,
  assignedToId,
  staffOptions,
}: {
  q: string;
  page: number;
  stage: string;
  source: string;
  assignedToId: string;
  staffOptions: { id: string; fullName: string }[];
}) {
  const stageFilter = (LEAD_STAGE_ORDER as readonly string[]).includes(stage)
    ? (stage as LeadStage)
    : null;

  const where: Prisma.LeadWhereInput = {
    ...(q
      ? {
          OR: [
            { fullName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
    ...(stageFilter ? { stage: stageFilter } : {}),
    ...(source ? { source } : {}),
    ...(assignedToId === "UNASSIGNED"
      ? { assignedToId: null }
      : assignedToId
        ? { assignedToId }
        : {}),
  };

  const [leadsRaw, total, sourceRows] = await Promise.all([
    prisma.lead.findMany({
      where,
      include: {
        assignedTo: { select: { fullName: true } },
        referredBy: { select: { fullName: true } },
        guest: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where: { source: { not: null } },
      distinct: ["source"],
      select: { source: true },
    }),
  ]);

  const sourceOptions = sourceRows
    .map((r) => r.source)
    .filter((s): s is string => !!s)
    .sort((a, b) => a.localeCompare(b));

  const leads: LeadRow[] = leadsRaw.map((lead) => ({
    id: lead.id,
    fullName: lead.fullName,
    phone: lead.phone,
    email: lead.email,
    stage: lead.stage,
    source: lead.source,
    assignedToId: lead.assignedToId,
    assignedToName: lead.assignedTo?.fullName ?? null,
    followUpAt: lead.followUpAt,
    isRepeatCustomer: lead.isRepeatCustomer,
    referredById: lead.referredById,
    referredByName: lead.referredBy?.fullName ?? null,
    guestId: lead.guestId,
    guestName: lead.guest?.fullName ?? null,
    notes: lead.notes,
  }));

  return (
    <LeadsTable
      leads={leads}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      query={q}
      stage={stage}
      source={source}
      assignedToId={assignedToId}
      staffOptions={staffOptions}
      sourceOptions={sourceOptions}
    />
  );
}

async function OverviewTab() {
  const now = new Date();

  const [totalLeads, stageCounts, followUpsRaw] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.groupBy({ by: ["stage"], _count: true }),
    prisma.lead.findMany({
      where: { followUpAt: { gte: startOfDay(now), lte: endOfDay(now) } },
      orderBy: { followUpAt: "asc" },
    }),
  ]);

  const countMap = new Map(stageCounts.map((s) => [s.stage, s._count]));
  const completedCount = countMap.get("COMPLETED") ?? 0;
  const lostCount = countMap.get("LOST") ?? 0;
  // Honest conversion rate: COMPLETED over ALL leads (including LOST), not
  // just leads that are still active in the pipeline.
  const conversionRate = totalLeads > 0 ? (completedCount / totalLeads) * 100 : 0;

  const funnelData = LEAD_STAGE_ORDER.map((stage) => ({
    label: LEAD_STAGE_LABELS[stage],
    count: countMap.get(stage) ?? 0,
  }));

  const followUps = followUpsRaw.map((lead) => ({
    id: lead.id,
    fullName: lead.fullName,
    phone: lead.phone,
    followUpAt: lead.followUpAt!,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Total Leads" value={totalLeads} icon={Users} />
        <StatCard
          label="Conversion Rate"
          value={`${conversionRate.toFixed(1)}%`}
          icon={Percent}
          subtext={`${completedCount} completed of ${totalLeads}`}
        />
        <StatCard
          label="Lost Leads"
          value={lostCount}
          icon={ListX}
          tone={lostCount > 0 ? "warning" : "default"}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lead Funnel</CardTitle>
          <CardDescription>Leads by stage, in pipeline order.</CardDescription>
        </CardHeader>
        <CardContent>
          <LeadFunnelChart data={funnelData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarClock className="size-4" /> Today&apos;s Follow-ups
          </CardTitle>
          <CardDescription>{format(now, "d MMMM yyyy")}</CardDescription>
        </CardHeader>
        <CardContent>
          <TodaysFollowups leads={followUps} />
        </CardContent>
      </Card>
    </div>
  );
}
