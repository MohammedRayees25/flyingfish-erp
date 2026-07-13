"use client";

import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrencyINR } from "@/lib/labels";

function formatCompactINR(value: number): string {
  if (Math.abs(value) >= 100000) return `₹${(value / 100000).toFixed(1)}L`;
  if (Math.abs(value) >= 1000) return `₹${Math.round(value / 1000)}k`;
  return `₹${value}`;
}

type TrendPoint = {
  date: string;
  label: string;
  revenue: number;
  expense: number;
  profit: number;
};

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
  const revenue = payload.find((p) => p.dataKey === "revenue")?.value ?? 0;
  const expense = payload.find((p) => p.dataKey === "expense")?.value ?? 0;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-popover-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-[var(--chart-1)]" />
        <span className="text-muted-foreground">Revenue</span>
        <span className="ml-auto font-medium tabular-nums">
          {formatCurrencyINR(revenue)}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="size-2 rounded-full bg-muted-foreground" />
        <span className="text-muted-foreground">Expense</span>
        <span className="ml-auto font-medium tabular-nums">
          {formatCurrencyINR(expense)}
        </span>
      </div>
    </div>
  );
}

export function RevenueChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-[var(--chart-1)]" />
          <span className="text-muted-foreground">Revenue</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-muted-foreground" />
          <span className="text-muted-foreground">Expense</span>
        </span>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="var(--border)"
            strokeDasharray="0"
          />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            interval={4}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={formatCompactINR}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border)" }} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--chart-1)"
            strokeWidth={2}
            fill="url(#revenueFill)"
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          />
          <Line
            type="monotone"
            dataKey="expense"
            stroke="var(--muted-foreground)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
