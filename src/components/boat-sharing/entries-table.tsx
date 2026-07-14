"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EntryFormSheet } from "@/components/boat-sharing/entry-form-sheet";
import { VendorPaymentDialog } from "@/components/boat-sharing/vendor-payment-dialog";
import { deleteBoatSharingEntry } from "@/actions/boat-sharing";
import { formatCurrencyINR } from "@/lib/labels";
import type { VendorPaymentStatus } from "@prisma/client";

type Entry = {
  id: string;
  date: Date;
  boatId: string | null;
  boat: { name: string } | null;
  boatVendorName: string | null;
  boatAmount: number;
  tempoAmount: number;
  ffGuests: number;
  dgGuests: number;
  seiGuests: number;
  totalGuests: number;
  vendorPaymentStatus: VendorPaymentStatus;
  outstandingAmount: number;
  notes: string | null;
};

const VENDOR_STATUS_VARIANT: Record<VendorPaymentStatus, "success" | "warning" | "destructive"> = {
  PAID: "success",
  PARTIAL: "warning",
  PENDING: "destructive",
};

export function EntriesTable({ entries, boats }: { entries: Entry[]; boats: { id: string; name: string }[] }) {
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const router = useRouter();

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteBoatSharingEntry(deleteTarget);
    setDeleteTarget(null);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Entry deleted");
      router.refresh();
    }
  }

  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Boat / Vendor</TableHead>
            <TableHead>Guests (FF/DG/SEI)</TableHead>
            <TableHead>Boat + Tempo</TableHead>
            <TableHead>Vendor Status</TableHead>
            <TableHead>Outstanding</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                No boat sharing entries yet.
              </TableCell>
            </TableRow>
          ) : (
            entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{format(entry.date, "d MMM yyyy")}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span>{entry.boat?.name ?? "—"}</span>
                    <span className="text-xs text-muted-foreground">{entry.boatVendorName ?? ""}</span>
                  </div>
                </TableCell>
                <TableCell>
                  {entry.ffGuests}/{entry.dgGuests}/{entry.seiGuests}{" "}
                  <span className="text-muted-foreground">({entry.totalGuests} total)</span>
                </TableCell>
                <TableCell>{formatCurrencyINR(entry.boatAmount + entry.tempoAmount)}</TableCell>
                <TableCell>
                  <Badge variant={VENDOR_STATUS_VARIANT[entry.vendorPaymentStatus]}>
                    {entry.vendorPaymentStatus}
                  </Badge>
                </TableCell>
                <TableCell className={entry.outstandingAmount > 0 ? "text-destructive font-medium" : ""}>
                  {formatCurrencyINR(entry.outstandingAmount)}
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    {entry.outstandingAmount > 0 ? (
                      <VendorPaymentDialog entryId={entry.id} outstandingAmount={entry.outstandingAmount} />
                    ) : null}
                    <EntryFormSheet
                      mode="edit"
                      entry={{ ...entry, boatVendorName: entry.boatVendorName }}
                      boats={boats}
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Delete entry"
                      onClick={() => setDeleteTarget(entry.id)}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the boat sharing entry, its party splits and vendor payment history.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
