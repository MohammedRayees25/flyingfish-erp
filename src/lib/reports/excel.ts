import ExcelJS from "exceljs";
import { format } from "date-fns";
import type { ReportTable } from "./types";

export async function renderReportExcel(table: ReportTable): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Flying Fish Scuba School ERP";
  workbook.created = table.generatedAt;

  if (table.summary.length > 0) {
    const summarySheet = workbook.addWorksheet("Summary");
    summarySheet.columns = [
      { header: "Metric", key: "metric", width: 28 },
      { header: "Value", key: "value", width: 22 },
    ];
    summarySheet.addRow({ metric: "Report", value: table.title });
    summarySheet.addRow({ metric: "Period", value: table.subtitle });
    summarySheet.addRow({ metric: "Generated", value: format(table.generatedAt, "d MMM yyyy, HH:mm") });
    summarySheet.addRow({});
    table.summary.forEach((s) => summarySheet.addRow({ metric: s.label, value: s.value }));
    summarySheet.getRow(1).font = { bold: true };
  }

  const detailSheet = workbook.addWorksheet("Detail");
  detailSheet.columns = table.columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: Math.max(14, c.header.length + 4),
  }));
  table.rows.forEach((row) => detailSheet.addRow(row));
  detailSheet.getRow(1).font = { bold: true };
  detailSheet.getRow(1).eachCell((cell) => {
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F5C7A" } };
    cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
  });

  return workbook.xlsx.writeBuffer();
}
