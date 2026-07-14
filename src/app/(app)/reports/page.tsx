import type { Metadata } from "next";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { REPORT_DEFINITIONS, type ReportId } from "@/lib/reports/registry";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ReportCard } from "@/components/reports/report-card";

export const metadata: Metadata = { title: "Reports" };

const REPORT_GROUPS: { id: string; label: string; reportIds: ReportId[] }[] = [
  {
    id: "operational",
    label: "Operational",
    reportIds: ["daily", "weekly", "monthly", "seasonal"],
  },
  {
    id: "financial",
    label: "Financial",
    reportIds: ["revenue", "expense", "profit"],
  },
  {
    id: "entity",
    label: "Entity",
    reportIds: [
      "boat-sharing",
      "guest",
      "instructor",
      "staff-attendance",
      "freelancer-payment",
    ],
  },
];

export default async function ReportsPage() {
  await requireModuleAccess("reports");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Generate operational, financial and entity reports, preview them inline, and
          download as PDF, Excel or CSV.
        </p>
      </div>

      <Tabs defaultValue={REPORT_GROUPS[0].id}>
        <TabsList>
          {REPORT_GROUPS.map((group) => (
            <TabsTrigger key={group.id} value={group.id}>
              {group.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {REPORT_GROUPS.map((group) => {
          const reports = REPORT_DEFINITIONS.filter((definition) =>
            group.reportIds.includes(definition.id)
          );

          return (
            <TabsContent key={group.id} value={group.id} className="flex flex-col gap-4 pt-2">
              {reports.map((report) => (
                <ReportCard
                  key={report.id}
                  id={report.id}
                  label={report.label}
                  description={report.description}
                />
              ))}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}
