"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { GuestCombobox } from "@/components/guests/guest-combobox";
import type { GuestOption } from "@/actions/guests";

export function DiveLogGuestPicker({
  value,
  onChange,
  initialGuests = [],
}: {
  value: string[];
  onChange: (ids: string[]) => void;
  initialGuests?: GuestOption[];
}) {
  const [labels, setLabels] = React.useState<Map<string, GuestOption>>(
    () => new Map(initialGuests.map((g) => [g.id, g]))
  );

  function addGuest(id: string, guest: GuestOption) {
    setLabels((prev) => new Map(prev).set(id, guest));
    if (!value.includes(id)) onChange([...value, id]);
  }

  function removeGuest(id: string) {
    onChange(value.filter((v) => v !== id));
  }

  return (
    <div className="flex flex-col gap-2">
      <GuestCombobox key={value.length} value="" onChange={addGuest} />
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {value.map((id) => {
            const guest = labels.get(id);
            return (
              <Badge key={id} variant="secondary" className="gap-1 py-1 pr-1 pl-2">
                {guest ? guest.fullName : "Guest"}
                <button
                  type="button"
                  onClick={() => removeGuest(id)}
                  aria-label={`Remove ${guest?.fullName ?? "guest"}`}
                  className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No guests linked yet.</p>
      )}
    </div>
  );
}
