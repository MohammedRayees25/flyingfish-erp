// Common shape every report builder returns, so one PDF/Excel/CSV exporter
// and one preview table can render any of the 12 report types uniformly.
export type ReportTable = {
  id: string;
  title: string;
  subtitle: string;
  generatedAt: Date;
  summary: { label: string; value: string }[];
  columns: { key: string; header: string; align?: "left" | "right" }[];
  rows: Record<string, string | number>[];
};

export type ReportPeriod = {
  start: Date;
  end: Date;
  label: string;
};
