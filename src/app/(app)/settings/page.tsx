import type { Metadata } from "next";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess, getCurrentUser } from "@/lib/auth/current-user";
import { getOrCreateCompanySettings } from "@/lib/settings-data";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompanyTab } from "@/components/settings/company-tab";
import { UsersTab } from "@/components/settings/users-tab";
import { PricingTab } from "@/components/settings/pricing-tab";
import { NotificationsTab } from "@/components/settings/notifications-tab";
import { AuditLogTab } from "@/components/settings/audit-log-tab";
import { Button } from "@/components/ui/button";
import { Gauge } from "lucide-react";
import { ACTIVITY_LABELS } from "@/lib/labels";
import type { ActivityType } from "@prisma/client";

export const metadata: Metadata = { title: "Settings" };

const TABS = ["company", "users", "pricing", "notifications", "audit"] as const;
const AUDIT_PAGE_SIZE = 20;

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>;
}) {
  await requireModuleAccess("settings");
  const currentUser = await getCurrentUser();
  const params = await searchParams;
  const tab = (TABS as readonly string[]).includes(params.tab ?? "") ? params.tab! : "company";
  const auditPage = Math.max(1, Number(params.page) || 1);

  const settings = await getOrCreateCompanySettings();

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Company details, users &amp; roles, pricing, notifications and audit log.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/settings/performance">
            <Gauge /> Performance
          </Link>
        </Button>
      </div>

      <Tabs value={tab}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="company" asChild>
            <Link href="/settings?tab=company">Company</Link>
          </TabsTrigger>
          <TabsTrigger value="users" asChild>
            <Link href="/settings?tab=users">Users</Link>
          </TabsTrigger>
          <TabsTrigger value="pricing" asChild>
            <Link href="/settings?tab=pricing">Pricing</Link>
          </TabsTrigger>
          <TabsTrigger value="notifications" asChild>
            <Link href="/settings?tab=notifications">Notifications</Link>
          </TabsTrigger>
          <TabsTrigger value="audit" asChild>
            <Link href="/settings?tab=audit">Audit Log</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company">
          {tab === "company" ? (
            <Card>
              <CardContent className="pt-6">
                <CompanyTab settings={settings} />
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="users">
          {tab === "users" ? <UsersTabSection currentUserId={currentUser?.id ?? null} /> : null}
        </TabsContent>

        <TabsContent value="pricing">
          {tab === "pricing" ? <PricingTabSection /> : null}
        </TabsContent>

        <TabsContent value="notifications">
          {tab === "notifications" ? (
            <Card>
              <CardContent className="pt-6">
                <NotificationsTab settings={settings} />
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="audit">
          {tab === "audit" ? <AuditLogSection page={auditPage} /> : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function UsersTabSection({ currentUserId }: { currentUserId: string | null }) {
  const users = await prisma.user.findMany({
    orderBy: { fullName: "asc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      phone: true,
      role: true,
      avatarUrl: true,
      isActive: true,
      monthlySalary: true,
    },
  });
  const rows = users.map((u) => ({
    id: u.id,
    fullName: u.fullName,
    email: u.email,
    phone: u.phone,
    role: u.role,
    avatarUrl: u.avatarUrl,
    isActive: u.isActive,
    monthlySalary: Number(u.monthlySalary),
  }));

  return (
    <Card>
      <CardContent className="pt-6">
        <UsersTab users={rows} currentUserId={currentUserId} />
      </CardContent>
    </Card>
  );
}

async function PricingTabSection() {
  const [activityRatesRaw, rentalItemsRaw, coursesRaw] = await Promise.all([
    prisma.activityRate.findMany({ orderBy: { activityType: "asc" } }),
    prisma.rentalItem.findMany({ orderBy: { name: "asc" } }),
    prisma.certificationCourse.findMany({ orderBy: [{ agency: "asc" }, { name: "asc" }] }),
  ]);

  const activityRateMap = new Map(activityRatesRaw.map((r) => [r.activityType, Number(r.price)]));
  const allActivityTypes = Object.keys(ACTIVITY_LABELS) as ActivityType[];
  const activityRates = allActivityTypes.map((activityType) => ({
    activityType,
    price: activityRateMap.get(activityType) ?? 0,
  }));

  const rentalItems = rentalItemsRaw.map((r) => ({
    id: r.id,
    name: r.name,
    dailyRate: Number(r.dailyRate),
    isActive: r.isActive,
  }));

  const courses = coursesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    agency: c.agency,
    track: c.track,
    price: Number(c.price),
  }));

  return <PricingTab activityRates={activityRates} rentalItems={rentalItems} courses={courses} />;
}

async function AuditLogSection({ page }: { page: number }) {
  const [logsRaw, total] = await Promise.all([
    prisma.auditLog.findMany({
      include: { user: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * AUDIT_PAGE_SIZE,
      take: AUDIT_PAGE_SIZE,
    }),
    prisma.auditLog.count(),
  ]);

  const logs = logsRaw.map((l) => ({
    id: l.id,
    userName: l.user?.fullName ?? null,
    action: l.action,
    entityType: l.entityType,
    entityId: l.entityId,
    summary: l.summary,
    createdAt: l.createdAt,
  }));

  return (
    <Card>
      <CardContent className="pt-6">
        <AuditLogTab logs={logs} total={total} page={page} pageSize={AUDIT_PAGE_SIZE} />
      </CardContent>
    </Card>
  );
}
