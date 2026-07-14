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
import { formatCurrencyINR } from "@/lib/labels";
import { formatCompactINR, ChartLegend, EmptyState } from "./chart-utils";

type ComparisonPoint = {
  revenue: number;
  expense: number;
  profit: number;
  [key: string]: string | number;
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
  const profit = payload.find((p) => p.dataKey === "profit")?.value ?? 0;

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
        <span className="size-2 rounded-full bg-[var(--chart-2)]" />
        <span className="text-muted-foreground">Expense</span>
        <span className="ml-auto font-medium tabular-nums">
          {formatCurrencyINR(expense)}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="size-2 rounded-full bg-[var(--chart-3)]" />
        <span className="text-muted-foreground">Profit</span>
        <span className="ml-auto font-medium tabular-nums">
          {formatCurrencyINR(profit)}
        </span>
      </div>
    </div>
  );
}

export function ComparisonBarChart({
  data,
  xKey,
  emptyMessage,
}: {
  data: ComparisonPoint[];
  xKey: string;
  emptyMessage: string;
}) {
  if (data.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <div className="flex h-full flex-col">
      <ChartLegend
        items={[
          { label: "Revenue", color: "var(--chart-1)" },
          { label: "Expense", color: "var(--chart-2)" },
          { label: "Profit", color: "var(--chart-3)" },
        ]}
      />
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={4}>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
          <XAxis
            dataKey={xKey}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <YAxis
            tickLine={false}
            axisLine={false}
            width={48}
            tickFormatter={formatCompactINR}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="revenue" fill="var(--chart-1)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          <Bar dataKey="expense" fill="var(--chart-2)" radius={[4, 4, 0, 0]} maxBarSize={24} />
          <Bar dataKey="profit" fill="var(--chart-3)" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
