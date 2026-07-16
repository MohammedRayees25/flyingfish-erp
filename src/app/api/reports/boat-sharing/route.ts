import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";

export async function GET(request: NextRequest) {
  await requireModuleAccess("boatSharing");

  const type = request.nextUrl.searchParams.get("type") === "season" ? "season" : "monthly";
  let start: Date;
  let end: Date;
  let label: string;

  if (type === "season") {
    const seasonId = request.nextUrl.searchParams.get("seasonId");
    const season = seasonId
      ? await prisma.season.findUnique({
          where: { id: seasonId },
          select: { name: true, startDate: true, endDate: true },
        })
      : null;
    if (!season) {
      return new Response("Season not found", { status: 404 });
    }
    start = season.startDate;
    end = season.endDate;
    label = season.name.replace(/\s+/g, "-");
  } else {
    const month = request.nextUrl.searchParams.get("month") ?? format(new Date(), "yyyy-MM");
    start = new Date(`${month}-01T00:00:00`);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 23, 59, 59);
    label = month;
  }

  const entries = await prisma.boatSharingEntry.findMany({
    where: { date: { gte: start, lte: end } },
    select: {
      date: true,
      boatVendorName: true,
      boatAmount: true,
      tempoAmount: true,
      ffGuests: true,
      dgGuests: true,
      seiGuests: true,
      totalGuests: true,
      vendorPaymentStatus: true,
      outstandingAmount: true,
      boat: { select: { name: true } },
      splits: {
        select: { partyName: true, guestCount: true, amountDue: true, amountPaid: true, status: true },
      },
    },
    orderBy: { date: "asc" },
  });

  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 28 },
    { header: "Value", key: "value", width: 20 },
  ];
  const totalGuests = entries.reduce((sum, e) => sum + e.totalGuests, 0);
  const boatAmount = entries.reduce((sum, e) => sum + Number(e.boatAmount), 0);
  const tempoAmount = entries.reduce((sum, e) => sum + Number(e.tempoAmount), 0);
  const outstanding = entries.reduce((sum, e) => sum + Number(e.outstandingAmount), 0);
  summarySheet.addRows([
    { metric: "Period", value: label },
    { metric: "Trips", value: entries.length },
    { metric: "Total guests", value: totalGuests },
    { metric: "Boat amount", value: boatAmount },
    { metric: "Tempo amount", value: tempoAmount },
    { metric: "Total cost", value: boatAmount + tempoAmount },
    { metric: "Outstanding (vendor)", value: outstanding },
  ]);
  summarySheet.getRow(1).font = { bold: true };

  const entriesSheet = workbook.addWorksheet("Entries");
  entriesSheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Boat", key: "boat", width: 20 },
    { header: "Vendor", key: "vendor", width: 22 },
    { header: "Boat Amount", key: "boatAmount", width: 14 },
    { header: "Tempo Amount", key: "tempoAmount", width: 14 },
    { header: "FF Guests", key: "ff", width: 10 },
    { header: "DG Guests", key: "dg", width: 10 },
    { header: "SEI Guests", key: "sei", width: 10 },
    { header: "Total Guests", key: "total", width: 12 },
    { header: "Vendor Status", key: "vendorStatus", width: 14 },
    { header: "Outstanding", key: "outstanding", width: 14 },
  ];
  entries.forEach((e) => {
    entriesSheet.addRow({
      date: format(e.date, "yyyy-MM-dd"),
      boat: e.boat?.name ?? "",
      vendor: e.boatVendorName ?? "",
      boatAmount: Number(e.boatAmount),
      tempoAmount: Number(e.tempoAmount),
      ff: e.ffGuests,
      dg: e.dgGuests,
      sei: e.seiGuests,
      total: e.totalGuests,
      vendorStatus: e.vendorPaymentStatus,
      outstanding: Number(e.outstandingAmount),
    });
  });
  entriesSheet.getRow(1).font = { bold: true };

  const splitsSheet = workbook.addWorksheet("Party Splits");
  splitsSheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Boat", key: "boat", width: 20 },
    { header: "Party", key: "party", width: 16 },
    { header: "Guests", key: "guests", width: 10 },
    { header: "Amount Due", key: "due", width: 14 },
    { header: "Amount Paid", key: "paid", width: 14 },
    { header: "Status", key: "status", width: 12 },
  ];
  entries.forEach((e) => {
    e.splits.forEach((s) => {
      splitsSheet.addRow({
        date: format(e.date, "yyyy-MM-dd"),
        boat: e.boat?.name ?? "",
        party: s.partyName,
        guests: s.guestCount,
        due: Number(s.amountDue),
        paid: Number(s.amountPaid),
        status: s.status,
      });
    });
  });
  splitsSheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="boat-sharing-${type}-${label}.xlsx"`,
    },
  });
}
