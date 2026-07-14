"use server";

import { startOfDay, endOfDay } from "date-fns";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { isReportId, defaultPeriodFor, buildReport } from "@/lib/reports/registry";
import type { ReportTable } from "@/lib/reports/types";

export async function previewReport(
  reportId: string,
  start?: string,
  end?: string
): Promise<ReportTable | { error: string }> {
  await requireModuleAccess("reports");

  if (!isReportId(reportId)) {
    return { error: "Unknown report" };
  }

  const period =
    start && end
      ? { start: startOfDay(new Date(start)), end: endOfDay(new Date(end)), label: `${start} – ${end}` }
      : await defaultPeriodFor(reportId);

  return buildReport(reportId, period);
}
