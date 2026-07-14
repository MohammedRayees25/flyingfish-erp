import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { SplitPaymentDialog } from "@/components/boat-sharing/split-payment-dialog";
import { formatCurrencyINR } from "@/lib/labels";
import type { PaymentStatus } from "@prisma/client";

type PendingSplit = {
  id: string;
  partyName: string;
  guestCount: number;
  amountDue: number;
  amountPaid: number;
  status: PaymentStatus;
  entry: { date: Date; boat: { name: string } | null };
};

export function PendingSplitsTable({ splits }: { splits: PendingSplit[] }) {
  if (splits.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        No pending party payments 🎉
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Boat</TableHead>
            <TableHead>Party</TableHead>
            <TableHead>Due</TableHead>
            <TableHead>Paid</TableHead>
            <TableHead>Remaining</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {splits.map((split) => {
            const remaining = split.amountDue - split.amountPaid;
            return (
              <TableRow key={split.id}>
                <TableCell>{format(split.entry.date, "d MMM yyyy")}</TableCell>
                <TableCell>{split.entry.boat?.name ?? "—"}</TableCell>
                <TableCell>{split.partyName}</TableCell>
                <TableCell>{formatCurrencyINR(split.amountDue)}</TableCell>
                <TableCell>{formatCurrencyINR(split.amountPaid)}</TableCell>
                <TableCell className="font-medium text-destructive">
                  {formatCurrencyINR(remaining)}
                </TableCell>
                <TableCell>
                  <Badge variant={split.status === "PARTIAL" ? "warning" : "destructive"}>
                    {split.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <SplitPaymentDialog splitId={split.id} partyName={split.partyName} remaining={remaining} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
