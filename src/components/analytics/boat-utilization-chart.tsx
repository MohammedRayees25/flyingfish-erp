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
  type RenderableText,
} from "recharts";
import { EmptyState } from "./chart-utils";

type BoatPoint = { boat: string; trips: number; utilizationPct: number };

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: BoatPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-popover-foreground">{point.boat}</p>
      <div className="flex items-center gap-2">
        <span className="text-muted-foreground">Trips</span>
        <span className="ml-auto font-medium tabular-nums">{point.trips}</span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-muted-foreground">Utilization</span>
        <span className="ml-auto font-medium tabular-nums">
          {point.utilizationPct}%
        </span>
      </div>
    </div>
  );
}

function percentLabel(value: RenderableText): string {
  return `${value ?? 0}%`;
}

export function BoatUtilizationChart({ data }: { data: BoatPoint[] }) {
  if (data.length === 0) return <EmptyState message="No active boats yet." />;

  const height = Math.max(140, data.length * 48);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={data}
        layout="vertical"
        margin={{ top: 4, right: 36, left: 8, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} stroke="var(--border)" strokeDasharray="0" />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickFormatter={percentLabel}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="boat"
          width={96}
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="utilizationPct" fill="var(--chart-1)" radius={[0, 4, 4, 0]} maxBarSize={20}>
          <LabelList
            dataKey="utilizationPct"
            position="right"
            formatter={percentLabel}
            fill="var(--muted-foreground)"
            fontSize={11}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
