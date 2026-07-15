import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { format } from "date-fns";
import type { LeadStage } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { LEAD_STAGE_ORDER, LEAD_STAGE_LABELS } from "@/lib/crm-labels";

export async function GET(request: NextRequest) {
  await requireModuleAccess("crm");

  const stageParam = request.nextUrl.searchParams.get("stage");
  const stage = (LEAD_STAGE_ORDER as readonly string[]).includes(stageParam ?? "")
    ? (stageParam as LeadStage)
    : null;

  // Summary always reflects the full funnel across every stage — the Detail
  // sheet is what respects the (optional) stage filter.
  const [totalLeads, stageCounts, detailLeads] = await Promise.all([
    prisma.lead.count(),
    prisma.lead.groupBy({ by: ["stage"], _count: true }),
    prisma.lead.findMany({
      where: stage ? { stage } : {},
      include: {
        assignedTo: { select: { fullName: true } },
        referredBy: { select: { fullName: true } },
        guest: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const countMap = new Map(stageCounts.map((s) => [s.stage, s._count]));
  const completedCount = countMap.get("COMPLETED") ?? 0;
  const conversionRate = totalLeads > 0 ? (completedCount / totalLeads) * 100 : 0;

  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 28 },
    { header: "Value", key: "value", width: 20 },
  ];
  summarySheet.addRows([
    { metric: "Total leads", value: totalLeads },
    ...LEAD_STAGE_ORDER.map((s) => ({ metric: LEAD_STAGE_LABELS[s], value: countMap.get(s) ?? 0 })),
    { metric: "Conversion rate (Completed / Total)", value: `${conversionRate.toFixed(1)}%` },
  ]);
  summarySheet.getRow(1).font = { bold: true };

  const detailSheet = workbook.addWorksheet("Detail");
  detailSheet.columns = [
    { header: "Name", key: "name", width: 24 },
    { header: "Phone", key: "phone", width: 16 },
    { header: "Email", key: "email", width: 24 },
    { header: "Stage", key: "stage", width: 14 },
    { header: "Source", key: "source", width: 16 },
    { header: "Assigned To", key: "assignedTo", width: 20 },
    { header: "Follow-up", key: "followUp", width: 20 },
    { header: "Repeat Customer", key: "repeat", width: 16 },
    { header: "Referred By", key: "referredBy", width: 20 },
    { header: "Linked Guest", key: "guest", width: 20 },
    { header: "Notes", key: "notes", width: 30 },
    { header: "Created", key: "created", width: 14 },
  ];
  detailLeads.forEach((lead) => {
    detailSheet.addRow({
      name: lead.fullName,
      phone: lead.phone,
      email: lead.email ?? "",
      stage: LEAD_STAGE_LABELS[lead.stage],
      source: lead.source ?? "",
      assignedTo: lead.assignedTo?.fullName ?? "",
      followUp: lead.followUpAt ? format(lead.followUpAt, "yyyy-MM-dd HH:mm") : "",
      repeat: lead.isRepeatCustomer ? "Yes" : "No",
      referredBy: lead.referredBy?.fullName ?? "",
      guest: lead.guest?.fullName ?? "",
      notes: lead.notes ?? "",
      created: format(lead.createdAt, "yyyy-MM-dd"),
    });
  });
  detailSheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  const suffix = stage ? `-${stage.toLowerCase()}` : "";
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="crm-leads${suffix}-${format(new Date(), "yyyy-MM-dd")}.xlsx"`,
    },
  });
}
