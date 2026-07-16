import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { ATTENDANCE_STATUS_LABELS } from "@/lib/labels";

function toDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export async function GET(request: NextRequest) {
  await requireModuleAccess("staff");

  const monthParam = request.nextUrl.searchParams.get("month");
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : format(new Date(), "yyyy-MM");

  const monthStart = startOfMonth(toDateOnly(`${month}-01`));
  const monthEnd = endOfMonth(monthStart);

  const records = await prisma.staffAttendance.findMany({
    where: { date: { gte: monthStart, lte: monthEnd } },
    select: { date: true, status: true, user: { select: { fullName: true } } },
    orderBy: [{ date: "asc" }, { user: { fullName: "asc" } }],
  });

  const rows = records.map((r) => ({
    staff: r.user.fullName,
    date: format(r.date, "yyyy-MM-dd"),
    status: ATTENDANCE_STATUS_LABELS[r.status],
  }));

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Staff Attendance");
  sheet.columns = [
    { header: "Staff", key: "staff", width: 24 },
    { header: "Date", key: "date", width: 14 },
    { header: "Status", key: "status", width: 14 },
  ];
  rows.forEach((r) => sheet.addRow(r));
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="staff-attendance-${month}.xlsx"`,
    },
  });
}
