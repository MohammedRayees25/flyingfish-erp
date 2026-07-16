import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";

function toDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

export async function GET(request: NextRequest) {
  await requireModuleAccess("freelancers");

  const monthParam = request.nextUrl.searchParams.get("month");
  const month = monthParam && /^\d{4}-\d{2}$/.test(monthParam) ? monthParam : format(new Date(), "yyyy-MM");

  const monthStart = startOfMonth(toDateOnly(`${month}-01`));
  const monthEnd = endOfMonth(monthStart);

  const freelancers = await prisma.freelancer.findMany({
    orderBy: { fullName: "asc" },
    select: {
      fullName: true,
      role: true,
      attendance: {
        where: { date: { gte: monthStart, lte: monthEnd }, status: "PRESENT" },
        select: { id: true },
      },
      payments: { select: { status: true, amount: true } },
    },
  });

  const rows = freelancers.map((f) => {
    const totalPaid = f.payments
      .filter((p) => p.status === "PAID")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const totalPending = f.payments
      .filter((p) => p.status === "PENDING" || p.status === "PARTIAL")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    return {
      freelancer: f.fullName,
      role: f.role,
      daysPresent: f.attendance.length,
      totalPaid,
      totalPending,
    };
  });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Freelancers");
  sheet.columns = [
    { header: "Freelancer", key: "freelancer", width: 24 },
    { header: "Role", key: "role", width: 20 },
    { header: "Days Present", key: "daysPresent", width: 14 },
    { header: "Total Paid (₹)", key: "totalPaid", width: 16 },
    { header: "Total Pending (₹)", key: "totalPending", width: 18 },
  ];
  rows.forEach((r) => sheet.addRow(r));
  sheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="freelancers-${month}.xlsx"`,
    },
  });
}
