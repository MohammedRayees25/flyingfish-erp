"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LabelList,
} from "recharts";

type FunnelPoint = { label: string; count: number };

function FunnelTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: FunnelPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="font-medium text-popover-foreground">{point.label}</p>
      <p className="text-muted-foreground">
        {point.count} lead{point.count === 1 ? "" : "s"}
      </p>
    </div>
  );
}

// Single-series horizontal bar in fixed pipeline order — a plain bar reads
// the funnel shape fine here; Recharts has no dedicated funnel primitive.
export function LeadFunnelChart({ data }: { data: FunnelPoint[] }) {
  const height = Math.max(220, data.length * 44);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 32, left: 0, bottom: 0 }}
        barCategoryGap="28%"
      >
        <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="0" />
        <XAxis
          type="number"
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={90}
          tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
        />
        <Tooltip content={<FunnelTooltip />} cursor={{ fill: "var(--muted)", opacity: 0.4 }} />
        <Bar dataKey="count" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={24}>
          <LabelList dataKey="count" position="right" fill="var(--muted-foreground)" fontSize={11} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
