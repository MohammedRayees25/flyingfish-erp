"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { EmptyState } from "./chart-utils";

type GrowthPoint = { month: string; newGuests: number; cumulativeGuests: number };

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const newGuests = payload.find((p) => p.dataKey === "newGuests")?.value ?? 0;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-popover-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-[var(--chart-1)]" />
        <span className="text-muted-foreground">New guests</span>
        <span className="ml-auto font-medium tabular-nums">{newGuests}</span>
      </div>
    </div>
  );
}

// Single series (new guests per month) — cumulative total is shown as a
// companion stat card by the caller rather than a second scale on this
// chart, per the "never dual-axis" rule (new-guest counts and a running
// cumulative total live on very different magnitudes).
export function GuestGrowthChart({ data }: { data: GrowthPoint[] }) {
  if (data.length === 0) return <EmptyState message="No guest data yet." />;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
        <XAxis
          dataKey="month"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={32}
          allowDecimals={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="newGuests" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
