import { NextRequest } from "next/server";
import { endOfMonth, format as formatDate, startOfMonth } from "date-fns";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import { renderReportPdf } from "@/lib/reports/pdf";
import { renderReportExcel } from "@/lib/reports/excel";
import { CERTIFICATION_STATUS_LABELS } from "@/lib/labels";
import type { ReportTable } from "@/lib/reports/types";
import { Prisma } from "@prisma/client";
import type { CertificationStatus } from "@prisma/client";

const AGENCY_LABELS: Record<string, string> = { PADI: "PADI", SSI: "SSI", OTHER: "Other" };

// The "pending" report mode reflects the certificate/status report's own
// stated scope (not-started or in-progress certifications). This is
// intentionally narrower than the CEO dashboard's pending.certificationsCount
// widget, which also folds in PENDING_CARD — see the Overview tab's stat
// (src/app/(app)/certifications/page.tsx) for that wider definition.
const PENDING_REPORT_STATUSES: CertificationStatus[] = ["NOT_STARTED", "IN_PROGRESS"];

const CERTIFICATION_STATUS_VALUES: CertificationStatus[] = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETED",
  "PENDING_CARD",
  "ISSUED",
];

function isCertificationStatus(value: string): value is CertificationStatus {
  return (CERTIFICATION_STATUS_VALUES as string[]).includes(value);
}

export async function GET(request: NextRequest) {
  await requireModuleAccess("certifications");

  const formatParam = request.nextUrl.searchParams.get("format") ?? "pdf";
  const type = request.nextUrl.searchParams.get("type");
  const statusParam = request.nextUrl.searchParams.get("status");

  const now = new Date();
  const where: Prisma.GuestCertificationWhereInput = {};
  let title = "Certifications Report";
  let subtitle = "All guest certifications";

  if (type === "pending") {
    where.status = { in: PENDING_REPORT_STATUSES };
    title = "Pending Certifications Report";
    subtitle = "Certifications that are not started or in progress";
  } else if (type === "completed") {
    where.completionDate = { gte: startOfMonth(now), lte: endOfMonth(now) };
    title = "Completed Certifications Report";
    subtitle = `Certifications completed in ${formatDate(now, "MMMM yyyy")}`;
  }

  if (statusParam && isCertificationStatus(statusParam)) {
    where.status = statusParam;
  }

  const certifications = await prisma.guestCertification.findMany({
    where,
    include: { guest: true, course: true, instructor: true },
    orderBy: { createdAt: "desc" },
  });

  const rows = certifications.map((c) => ({
    guest: c.guest.fullName,
    course: c.course.name,
    agency: AGENCY_LABELS[c.course.agency] ?? c.course.agency,
    instructor: c.instructor?.fullName ?? "Unassigned",
    status: CERTIFICATION_STATUS_LABELS[c.status],
    progress: `${c.progress}%`,
    certificateNumber: c.certificateNumber ?? "—",
    issueDate: c.issueDate ? formatDate(c.issueDate, "d MMM yyyy") : "—",
  }));

  const statusCounts = new Map<CertificationStatus, number>();
  for (const c of certifications) {
    statusCounts.set(c.status, (statusCounts.get(c.status) ?? 0) + 1);
  }

  const table: ReportTable = {
    id: "certifications",
    title,
    subtitle,
    generatedAt: now,
    summary: [
      { label: "Total certifications", value: String(certifications.length) },
      ...Array.from(statusCounts.entries()).map(([status, count]) => ({
        label: CERTIFICATION_STATUS_LABELS[status],
        value: String(count),
      })),
    ],
    columns: [
      { key: "guest", header: "Guest" },
      { key: "course", header: "Course" },
      { key: "agency", header: "Agency" },
      { key: "instructor", header: "Instructor" },
      { key: "status", header: "Status" },
      { key: "progress", header: "Progress", align: "right" },
      { key: "certificateNumber", header: "Certificate #" },
      { key: "issueDate", header: "Issue Date" },
    ],
    rows,
  };

  const filenameBase = `certifications-${type ?? "all"}-${formatDate(now, "yyyy-MM-dd")}`;

  if (formatParam === "excel") {
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
