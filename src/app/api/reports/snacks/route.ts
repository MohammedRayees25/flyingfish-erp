import ExcelJS from "exceljs";
import { NextRequest } from "next/server";
import { format } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";

function monthRange(monthStr: string) {
  const start = new Date(`${monthStr}-01T00:00:00.000Z`);
  const end = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0, 23, 59, 59, 999)
  );
  return { start, end };
}

export async function GET(request: NextRequest) {
  await requireModuleAccess("snacks");

  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");

  let start: Date;
  let end: Date;
  let label: string;

  if (from || to) {
    start = from ? new Date(`${from}T00:00:00.000Z`) : new Date("2000-01-01T00:00:00.000Z");
    end = to ? new Date(`${to}T23:59:59.999Z`) : new Date();
    label = `${from ?? "start"}_to_${to ?? format(new Date(), "yyyy-MM-dd")}`;
  } else {
    const month = request.nextUrl.searchParams.get("month") ?? format(new Date(), "yyyy-MM");
    const range = monthRange(month);
    start = range.start;
    end = range.end;
    label = month;
  }

  const [purchases, consumptions, items] = await Promise.all([
    prisma.snackPurchase.findMany({
      where: { date: { gte: start, lte: end } },
      include: { item: true },
      orderBy: { date: "asc" },
    }),
    prisma.snackConsumption.findMany({
      where: { date: { gte: start, lte: end } },
      include: { item: true, guest: true, boat: true },
      orderBy: { date: "asc" },
    }),
    prisma.snackItem.findMany({ orderBy: { name: "asc" } }),
  ]);

  const totalPurchaseCost = purchases.reduce((sum, p) => sum + Number(p.totalCost), 0);
  const totalConsumptionQty = consumptions.reduce((sum, c) => sum + c.quantity, 0);
  const totalConsumptionValue = consumptions.reduce(
    (sum, c) => sum + c.quantity * Number(c.item.costPerUnit),
    0
  );
  const lowStockItems = items.filter((i) => i.currentStock <= i.reorderLevel);

  const workbook = new ExcelJS.Workbook();

  const summarySheet = workbook.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 22 },
  ];
  summarySheet.addRows([
    { metric: "Period", value: label },
    { metric: "Total purchases cost", value: totalPurchaseCost },
    { metric: "Total consumption quantity", value: totalConsumptionQty },
    { metric: "Total consumption value (est.)", value: totalConsumptionValue },
    { metric: "Low stock items", value: lowStockItems.length },
  ]);
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.addRow({});

  const breakdownHeaderRow = summarySheet.addRow({ metric: "Per-item breakdown", value: "" });
  breakdownHeaderRow.font = { bold: true };
  const breakdownHeader = summarySheet.addRow([
    "Item",
    "Unit",
    "Current Stock",
    "Reorder Level",
    "Purchased Qty",
    "Purchased Cost",
    "Consumed Qty",
    "Consumed Value (est.)",
  ]);
  breakdownHeader.font = { bold: true };
  items.forEach((item) => {
    const itemPurchases = purchases.filter((p) => p.itemId === item.id);
    const itemConsumptions = consumptions.filter((c) => c.itemId === item.id);
    const purchasedQty = itemPurchases.reduce((sum, p) => sum + p.quantity, 0);
    const purchasedCost = itemPurchases.reduce((sum, p) => sum + Number(p.totalCost), 0);
    const consumedQty = itemConsumptions.reduce((sum, c) => sum + c.quantity, 0);
    const consumedValue = consumedQty * Number(item.costPerUnit);
    summarySheet.addRow([
      item.name,
      item.unit,
      item.currentStock,
      item.reorderLevel,
      purchasedQty,
      purchasedCost,
      consumedQty,
      consumedValue,
    ]);
  });

  const purchasesSheet = workbook.addWorksheet("Purchases");
  purchasesSheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Item", key: "item", width: 24 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Quantity", key: "quantity", width: 12 },
    { header: "Unit Cost", key: "unitCost", width: 12 },
    { header: "Total Cost", key: "totalCost", width: 14 },
    { header: "Vendor", key: "vendor", width: 22 },
    { header: "Notes", key: "notes", width: 28 },
  ];
  purchases.forEach((p) => {
    purchasesSheet.addRow({
      date: format(p.date, "yyyy-MM-dd"),
      item: p.item.name,
      unit: p.item.unit,
      quantity: p.quantity,
      unitCost: Number(p.unitCost),
      totalCost: Number(p.totalCost),
      vendor: p.vendor ?? "",
      notes: p.notes ?? "",
    });
  });
  purchasesSheet.getRow(1).font = { bold: true };

  const consumptionSheet = workbook.addWorksheet("Consumption");
  consumptionSheet.columns = [
    { header: "Date", key: "date", width: 14 },
    { header: "Item", key: "item", width: 24 },
    { header: "Unit", key: "unit", width: 10 },
    { header: "Quantity", key: "quantity", width: 12 },
    { header: "Est. Value", key: "value", width: 14 },
    { header: "Guest", key: "guest", width: 22 },
    { header: "Boat", key: "boat", width: 18 },
    { header: "Notes", key: "notes", width: 28 },
  ];
  consumptions.forEach((c) => {
    consumptionSheet.addRow({
      date: format(c.date, "yyyy-MM-dd"),
      item: c.item.name,
      unit: c.item.unit,
      quantity: c.quantity,
      value: c.quantity * Number(c.item.costPerUnit),
      guest: c.guest?.fullName ?? "",
      boat: c.boat?.name ?? "",
      notes: c.notes ?? "",
    });
  });
  consumptionSheet.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="snacks-${label}.xlsx"`,
    },
  });
}
