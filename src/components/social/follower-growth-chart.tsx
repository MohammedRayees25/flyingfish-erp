"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { formatCompactNumber, ChartLegend, EmptyState } from "@/components/analytics/chart-utils";
import { PLATFORM_LABELS, PLATFORM_COLORS, SOCIAL_PLATFORMS } from "@/components/social/platform-meta";

export type FollowerGrowthPoint = {
  label: string;
  INSTAGRAM: number | null;
  FACEBOOK: number | null;
  YOUTUBE: number | null;
};

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number | null; dataKey: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md">
      <p className="mb-1.5 font-medium text-popover-foreground">{label}</p>
      {SOCIAL_PLATFORMS.map((platform) => {
        const value = payload.find((p) => p.dataKey === platform)?.value;
        if (value === null || value === undefined) return null;
        return (
          <div key={platform} className="mt-1 flex items-center gap-2 first:mt-0">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: PLATFORM_COLORS[platform] }}
            />
            <span className="text-muted-foreground">{PLATFORM_LABELS[platform]}</span>
            <span className="ml-auto font-medium tabular-nums">
              {formatCompactNumber(value)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function FollowerGrowthChart({ data }: { data: FollowerGrowthPoint[] }) {
  const hasData = data.some((point) =>
    SOCIAL_PLATFORMS.some((platform) => point[platform] !== null)
  );
  if (!hasData) return <EmptyState message="No follower snapshots recorded yet." />;

  return (
    <div className="flex h-full flex-col">
      <ChartLegend
        items={SOCIAL_PLATFORMS.map((platform) => ({
          label: PLATFORM_LABELS[platform],
          color: PLATFORM_COLORS[platform],
        }))}
      />
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
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
            width={48}
            tickFormatter={formatCompactNumber}
            tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
          />
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "var(--border)" }} />
          {SOCIAL_PLATFORMS.map((platform) => (
            <Line
              key={platform}
              type="monotone"
              dataKey={platform}
              stroke={PLATFORM_COLORS[platform]}
              strokeWidth={2}
              dot={false}
              connectNulls
              activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--card)" }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
