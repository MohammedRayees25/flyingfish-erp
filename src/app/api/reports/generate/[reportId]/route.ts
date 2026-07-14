import { NextRequest } from "next/server";
import { endOfDay, startOfDay } from "date-fns";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { isReportId, defaultPeriodFor, buildReport } from "@/lib/reports/registry";
import { renderReportPdf } from "@/lib/reports/pdf";
import { renderReportExcel } from "@/lib/reports/excel";
import { renderReportCsv } from "@/lib/reports/csv";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  await requireModuleAccess("reports");

  const { reportId } = await params;
  if (!isReportId(reportId)) {
    return new Response("Unknown report", { status: 404 });
  }

  const format = request.nextUrl.searchParams.get("format") ?? "pdf";
  const startParam = request.nextUrl.searchParams.get("start");
  const endParam = request.nextUrl.searchParams.get("end");

  const period = startParam && endParam
    ? {
        start: startOfDay(new Date(startParam)),
        end: endOfDay(new Date(endParam)),
        label: `${startParam} – ${endParam}`,
      }
    : await defaultPeriodFor(reportId);

  const table = await buildReport(reportId, period);
  const filenameBase = `${reportId}-${period.start.toISOString().slice(0, 10)}-to-${period.end.toISOString().slice(0, 10)}`;

  if (format === "excel") {
    const buffer = await renderReportExcel(table);
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
      },
    });
  }

  if (format === "csv") {
    const csv = renderReportCsv(table);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filenameBase}.csv"`,
      },
    });
  }

  const pdfBuffer = await renderReportPdf(table);
  return new Response(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filenameBase}.pdf"`,
    },
  });
}
