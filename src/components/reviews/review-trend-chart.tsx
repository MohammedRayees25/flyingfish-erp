"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ReviewTrendPoint } from "@/lib/reports/reviews-data";

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; payload: ReviewTrendPoint }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-popover-foreground">{label}</p>
      <div className="flex items-center gap-2">
        <span className="size-2 rounded-full bg-[var(--chart-1)]" />
        <span className="text-muted-foreground">Avg rating</span>
        <span className="ml-auto font-medium tabular-nums">
          {point.count > 0 ? point.avgRating.toFixed(2) : "—"}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <span className="size-2 rounded-full bg-transparent" />
        <span className="text-muted-foreground">Reviews</span>
        <span className="ml-auto font-medium tabular-nums">{point.count}</span>
      </div>
    </div>
  );
}

export function ReviewTrendChart({ data }: { data: ReviewTrendPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="ratingFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <YAxis
          domain={[0, 5]}
          ticks={[0, 1, 2, 3, 4, 5]}
          tickLine={false}
          axisLine={false}
          width={28}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border)" }} />
        <Area
          type="monotone"
          dataKey="avgRating"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#ratingFill)"
          dot={{ r: 3, strokeWidth: 0, fill: "var(--chart-1)" }}
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
          connectNulls
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
