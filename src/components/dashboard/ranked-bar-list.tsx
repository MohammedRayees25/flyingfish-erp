export function RankedBarList({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...items.map((i) => i.value));

  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No data yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-3">
          <span className="w-32 shrink-0 truncate text-sm text-foreground/90">
            {item.label}
          </span>
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[var(--chart-1)]"
              style={{ width: `${Math.max(6, (item.value / max) * 100)}%` }}
            />
          </div>
          <span className="w-8 shrink-0 text-right text-sm font-medium tabular-nums">
            {item.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
