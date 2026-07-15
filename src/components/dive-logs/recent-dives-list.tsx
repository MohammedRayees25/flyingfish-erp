import { format } from "date-fns";

export type RecentDive = {
  id: string;
  date: Date;
  diveSiteName: string | null;
  instructorName: string | null;
  guestCount: number;
};

export function RecentDivesList({ dives }: { dives: RecentDive[] }) {
  if (dives.length === 0) {
    return <p className="py-6 text-center text-sm text-muted-foreground">No dive logs yet.</p>;
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {dives.map((dive) => (
        <li key={dive.id} className="flex items-center justify-between py-2.5 text-sm">
          <div>
            <p className="font-medium">{dive.diveSiteName ?? "Unknown site"}</p>
            <p className="text-xs text-muted-foreground">
              {format(dive.date, "d MMM yyyy")} · {dive.instructorName ?? "Unassigned"}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">
            {dive.guestCount} guest{dive.guestCount === 1 ? "" : "s"}
          </span>
        </li>
      ))}
    </ul>
  );
}
