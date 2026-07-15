import { NextRequest } from "next/server";
import { endOfDay, format, startOfDay, subDays } from "date-fns";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { renderReportPdf } from "@/lib/reports/pdf";
import { renderReportExcel } from "@/lib/reports/excel";
import type { ReportTable } from "@/lib/reports/types";

function formatTimeUTC(date: Date): string {
  return date.toISOString().slice(11, 16);
}

export async function GET(request: NextRequest) {
  await requireModuleAccess("diveLogs");

  const fileFormat = request.nextUrl.searchParams.get("format") ?? "pdf";
  const startParam = request.nextUrl.searchParams.get("start");
  const endParam = request.nextUrl.searchParams.get("end");
  const diveSiteId = request.nextUrl.searchParams.get("diveSiteId");
  const instructorId = request.nextUrl.searchParams.get("instructorId");

  const now = new Date();
  const start = startParam ? startOfDay(new Date(startParam)) : startOfDay(subDays(now, 89));
  const end = endParam ? endOfDay(new Date(endParam)) : endOfDay(now);
  const label = `${format(start, "d MMM yyyy")} – ${format(end, "d MMM yyyy")}`;

  const where: Prisma.DiveLogWhereInput = {
    date: { gte: start, lte: end },
    ...(diveSiteId ? { diveSiteId } : {}),
    ...(instructorId ? { instructorId } : {}),
  };

  const logs = await prisma.diveLog.findMany({
    where,
    orderBy: { date: "desc" },
    include: {
      diveSite: { select: { name: true } },
      instructor: { select: { fullName: true } },
      boat: { select: { name: true } },
      _count: { select: { guests: true } },
    },
  });

  const depths = logs.filter((l) => l.maxDepth != null).map((l) => l.maxDepth as number);
  const visibilities = logs.filter((l) => l.visibility != null).map((l) => l.visibility as number);
  const avgDepth = depths.length ? depths.reduce((s, d) => s + d, 0) / depths.length : 0;
  const avgVisibility = visibilities.length
    ? visibilities.reduce((s, v) => s + v, 0) / visibilities.length
    : 0;

  const table: ReportTable = {
    id: "dive-logs",
    title: "Dive Log Report",
    subtitle: label,
    generatedAt: new Date(),
    summary: [
      { label: "Total dives", value: String(logs.length) },
      { label: "Avg. max depth", value: depths.length ? `${avgDepth.toFixed(1)} m` : "—" },
      { label: "Avg. visibility", value: visibilities.length ? `${avgVisibility.toFixed(1)} m` : "—" },
    ],
    columns: [
      { key: "date", header: "Date" },
      { key: "site", header: "Site" },
      { key: "instructor", header: "Instructor" },
      { key: "boat", header: "Boat" },
      { key: "guests", header: "Guests", align: "right" },
      { key: "entryTime", header: "Entry" },
      { key: "exitTime", header: "Exit" },
      { key: "bottomTime", header: "Bottom Time", align: "right" },
      { key: "maxDepth", header: "Max Depth", align: "right" },
      { key: "visibility", header: "Visibility", align: "right" },
    ],
    rows: logs.map((log) => ({
      date: format(log.date, "d MMM yyyy"),
      site: log.diveSite?.name ?? "—",
      instructor: log.instructor?.fullName ?? "—",
      boat: log.boat?.name ?? "—",
      guests: log._count.guests,
      entryTime: log.entryTime ? formatTimeUTC(log.entryTime) : "—",
      exitTime: log.exitTime ? formatTimeUTC(log.exitTime) : "—",
      bottomTime: log.bottomTimeMin != null ? `${log.bottomTimeMin} min` : "—",
      maxDepth: log.maxDepth != null ? `${log.maxDepth} m` : "—",
      visibility: log.visibility != null ? `${log.visibility} m` : "—",
    })),
  };

  const filenameBase = `dive-logs-${start.toISOString().slice(0, 10)}-to-${end.toISOString().slice(0, 10)}`;

  if (fileFormat === "excel") {
    const buffer = await renderReportExcel(table);
    return new Response(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filenameBase}.xlsx"`,
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
