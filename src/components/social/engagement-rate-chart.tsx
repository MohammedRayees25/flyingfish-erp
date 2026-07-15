"use client";

import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { EmptyState } from "@/components/analytics/chart-utils";
import { PLATFORM_COLORS } from "@/components/social/platform-meta";

export type EngagementPoint = {
  platform: string;
  label: string;
  rate: number;
};

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; payload: EngagementPoint }[];
}) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <div className="flex items-center gap-2">
        <span
          className="size-2 rounded-full"
          style={{ backgroundColor: PLATFORM_COLORS[point.platform as keyof typeof PLATFORM_COLORS] }}
        />
        <span className="font-medium text-popover-foreground">{point.label}</span>
        <span className="ml-auto font-medium tabular-nums">{point.rate.toFixed(1)}%</span>
      </div>
    </div>
  );
}

// Single measure (engagement rate) split by platform — categories are
// self-labeled on the x-axis, so no legend box is needed; bars still carry
// the platform's fixed identity color for continuity with the other charts
// on this page.
export function EngagementRateChart({ data }: { data: EngagementPoint[] }) {
  const hasData = data.some((d) => d.rate > 0);
  if (!hasData) return <EmptyState message="No engagement data for this period yet." />;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barGap={4}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={40}
          tickFormatter={(v: number) => `${v}%`}
          tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: "var(--muted)" }} />
        <Bar dataKey="rate" radius={[4, 4, 0, 0]} maxBarSize={56}>
          {data.map((entry) => (
            <Cell
              key={entry.platform}
              fill={PLATFORM_COLORS[entry.platform as keyof typeof PLATFORM_COLORS]}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
