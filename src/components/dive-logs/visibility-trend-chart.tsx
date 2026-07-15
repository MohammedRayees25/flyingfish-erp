"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type TrendPoint = { date: string; label: string; avgVisibility: number };

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium text-popover-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-[var(--chart-1)]" />
        <span className="text-muted-foreground">Avg. visibility</span>
        <span className="ml-auto font-medium tabular-nums">{payload[0].value} m</span>
      </div>
    </div>
  );
}

export function VisibilityTrendChart({ data }: { data: TrendPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
        No visibility data logged in the last 30 days.
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={32}
          tickFormatter={(v) => `${v}m`}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border)" }} />
        <Line
          type="monotone"
          dataKey="avgVisibility"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--chart-1)", strokeWidth: 0 }}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
