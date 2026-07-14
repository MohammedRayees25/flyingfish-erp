"use client";

import * as React from "react";
import { Settings2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ACTIVITY_LABELS } from "@/lib/labels";
import { upsertActivityRate } from "@/actions/activity-rates";
import type { ActivityType } from "@prisma/client";

export function ActivityRatesDialog({
  rates,
}: {
  rates: Record<string, number>;
}) {
  const [open, setOpen] = React.useState(false);
  const [values, setValues] = React.useState<Record<string, number>>(rates);
  const [savingKey, setSavingKey] = React.useState<string | null>(null);

  async function save(activityType: ActivityType) {
    setSavingKey(activityType);
    const result = await upsertActivityRate(activityType, values[activityType] ?? 0);
    setSavingKey(null);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success(`${ACTIVITY_LABELS[activityType]} rate saved`);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Settings2 /> Activity Rates
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Manage activity rates</DialogTitle>
          <DialogDescription>
            Default prices used to prefill new bookings. Editing here does not
            change the price on existing bookings.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96 pr-4">
          <div className="flex flex-col gap-3">
            {(Object.keys(ACTIVITY_LABELS) as ActivityType[]).map((activityType) => (
              <div key={activityType} className="flex items-center gap-2">
                <span className="flex-1 text-sm">{ACTIVITY_LABELS[activityType]}</span>
                <Input
                  type="number"
                  min={0}
                  className="w-28"
                  value={values[activityType] ?? 0}
                  onChange={(e) =>
                    setValues((v) => ({
                      ...v,
                      [activityType]: e.target.valueAsNumber || 0,
                    }))
                  }
                />
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={savingKey === activityType}
                  onClick={() => save(activityType)}
                >
                  {savingKey === activityType ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
