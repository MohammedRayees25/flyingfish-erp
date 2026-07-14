import { formatCurrencyINR } from "@/lib/labels";
import { EmptyState } from "./chart-utils";

/**
 * Same visual language as `RankedBarList` (see
 * src/components/dashboard/ranked-bar-list.tsx), but the trailing value is
 * formatted as INR currency instead of a raw count — used wherever the
 * ranked metric is a rupee amount rather than a plain number.
 */
export function AmountRankedList({
  items,
  emptyMessage = "No data yet.",
}: {
  items: { label: string; value: number; subtext?: string }[];
  emptyMessage?: string;
}) {
  const max = Math.max(1, ...items.map((i) => i.value));

  if (items.length === 0) return <EmptyState message={emptyMessage} />;

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 text-sm text-foreground/90">
            <span className="block truncate">{item.label}</span>
            {item.subtext ? (
              <span className="block truncate text-xs text-muted-foreground">
                {item.subtext}
              </span>
            ) : null}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[var(--chart-1)]"
              style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }}
            />
          </div>
          <span className="w-24 shrink-0 text-right text-sm font-medium tabular-nums">
            {formatCurrencyINR(item.value)}
          </span>
        </li>
      ))}
    </ul>
  );
}
