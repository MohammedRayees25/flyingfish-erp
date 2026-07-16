import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

// Generic shape shared by every list-style module page (Guests, Bookings,
// Snacks, Dive Logs, etc.): a title + action button header, an optional row
// of tabs, a search/filter toolbar, and a table. Used as the loading.tsx
// fallback so navigating to any of these pages never shows a blank screen.
export function ListPageSkeleton({
  tabs = 0,
  rows = 8,
}: {
  tabs?: number;
  rows?: number;
}) {
  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>

      {tabs > 0 ? (
        <div className="flex gap-2">
          {Array.from({ length: tabs }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-28" />
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-36" />
        <Skeleton className="h-9 w-28" />
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-3">
            <Skeleton className="h-8 w-full" />
            {Array.from({ length: rows }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
