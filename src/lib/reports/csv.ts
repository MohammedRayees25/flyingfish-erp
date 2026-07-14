import type { ReportTable } from "./types";

function escapeCsvCell(value: string | number): string {
  const str = String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function renderReportCsv(table: ReportTable): string {
  const lines: string[] = [];
  lines.push(table.columns.map((c) => escapeCsvCell(c.header)).join(","));
  for (const row of table.rows) {
    lines.push(table.columns.map((c) => escapeCsvCell(row[c.key] ?? "")).join(","));
  }
  // ﻿: UTF-8 BOM so Excel opens non-ASCII (₹, names) correctly.
  return `﻿${lines.join("\r\n")}`;
}
