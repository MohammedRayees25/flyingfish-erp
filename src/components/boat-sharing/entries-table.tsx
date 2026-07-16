"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Search, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
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
import { Input } from "@/components/ui/input";
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

export function EntriesTable({
  entries,
  boats,
  total,
  page,
  pageSize,
  query,
}: {
  entries: Entry[];
  boats: { id: string; name: string }[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
}) {
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(query);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (search) params.set("q", search);
      else params.delete("q");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

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
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Search boat or vendor…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

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
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="icon" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              disabled={page >= totalPages}
              onClick={() => goToPage(page + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}

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
