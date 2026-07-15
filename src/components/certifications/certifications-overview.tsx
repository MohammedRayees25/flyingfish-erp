import { format } from "date-fns";
import { ClipboardList, CheckCircle2, CalendarClock } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CERTIFICATION_STATUS_LABELS } from "@/lib/labels";
import { CERTIFICATION_AGENCY_LABELS } from "@/components/certifications/types";
import type { CertificationAgency, CertificationStatus } from "@prisma/client";

export type StatusBreakdownEntry = { status: CertificationStatus; count: number };

export type UpcomingCertification = {
  id: string;
  guestName: string;
  courseName: string;
  agency: CertificationAgency;
  instructorName: string;
  startDate: Date | null;
};

export function CertificationsOverview({
  pendingCount,
  completedThisMonthCount,
  breakdown,
  upcoming,
}: {
  pendingCount: number;
  completedThisMonthCount: number;
  breakdown: StatusBreakdownEntry[];
  upcoming: UpcomingCertification[];
}) {
  const totalCount = breakdown.reduce((sum, b) => sum + b.count, 0);

  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          label="Pending Certifications"
          value={pendingCount}
          icon={ClipboardList}
          tone={pendingCount > 0 ? "warning" : "default"}
          subtext="Not started, in progress or pending card"
        />
        <StatCard
          label="Completed This Month"
          value={completedThisMonthCount}
          icon={CheckCircle2}
          subtext={format(new Date(), "MMMM yyyy")}
        />
        <StatCard
          label="Total Certifications"
          value={totalCount}
          icon={CalendarClock}
          subtext="Across all guests"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Breakdown by status</CardTitle>
          </CardHeader>
          <CardContent>
            {breakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground">No certifications on record yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {breakdown.map((b) => (
                  <li key={b.status} className="flex items-center justify-between text-sm">
                    <span>{CERTIFICATION_STATUS_LABELS[b.status]}</span>
                    <span className="font-medium tabular-nums">{b.count}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Starting in the next 14 days</CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No certifications scheduled to start in the next two weeks.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {upcoming.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 text-sm">
                    <div className="flex flex-col">
                      <span className="font-medium">{c.guestName}</span>
                      <span className="text-xs text-muted-foreground">
                        {c.courseName} · {CERTIFICATION_AGENCY_LABELS[c.agency]} · {c.instructorName}
                      </span>
                    </div>
                    <Badge variant="outline">
                      {c.startDate ? format(c.startDate, "d MMM") : "—"}
                    </Badge>
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
