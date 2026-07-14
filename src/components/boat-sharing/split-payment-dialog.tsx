"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2, IndianRupee } from "lucide-react";
import { toast } from "sonner";
import { recordSplitPayment } from "@/actions/boat-sharing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { formatCurrencyINR } from "@/lib/labels";

export function SplitPaymentDialog({
  splitId,
  partyName,
  remaining,
}: {
  splitId: string;
  partyName: string;
  remaining: number;
}) {
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState(remaining);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    if (open) {
      setAmount(remaining);
      setError(null);
    }
  }, [open, remaining]);

  async function submit() {
    setIsSubmitting(true);
    setError(null);
    const result = await recordSplitPayment(splitId, amount);
    setIsSubmitting(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    toast.success(`Payment recorded for ${partyName}`);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
        <IndianRupee className="size-3.5" /> Record payment
      </Button>
      <DialogContent className="sm:max-w-xs">
        <DialogHeader>
          <DialogTitle>Record {partyName} payment</DialogTitle>
          <DialogDescription>Remaining due: {formatCurrencyINR(remaining)}</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="split-amount">Amount (₹)</Label>
          <Input
            id="split-amount"
            type="number"
            min={0}
            value={amount}
            onChange={(e) => setAmount(e.target.valueAsNumber || 0)}
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Record payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
