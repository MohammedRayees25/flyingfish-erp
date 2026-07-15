"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { upsertActivityRate } from "@/actions/activity-rates";
import { ACTIVITY_LABELS } from "@/lib/labels";
import type { PricingActivityRow } from "@/components/settings/pricing-tab";
import type { ActivityType } from "@prisma/client";

export function PricingActivitiesTable({ rates }: { rates: PricingActivityRow[] }) {
  const router = useRouter();
  const [values, setValues] = React.useState<Record<string, number>>(
    Object.fromEntries(rates.map((r) => [r.activityType, r.price]))
  );
  const [savingKey, setSavingKey] = React.useState<ActivityType | null>(null);

  async function save(activityType: ActivityType) {
    setSavingKey(activityType);
    const result = await upsertActivityRate(activityType, values[activityType] ?? 0);
    setSavingKey(null);
    if (result?.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`${ACTIVITY_LABELS[activityType]} rate saved`);
    router.refresh();
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Activity</TableHead>
            <TableHead>Price (₹)</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rates.map((r) => (
            <TableRow key={r.activityType}>
              <TableCell className="font-medium">{ACTIVITY_LABELS[r.activityType]}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  min={0}
                  className="w-32"
                  value={values[r.activityType] ?? 0}
                  onChange={(e) =>
                    setValues((v) => ({ ...v, [r.activityType]: e.target.valueAsNumber || 0 }))
                  }
                />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={savingKey === r.activityType}
                  onClick={() => save(r.activityType)}
                >
                  {savingKey === r.activityType ? <Loader2 className="size-3.5 animate-spin" /> : "Save"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
