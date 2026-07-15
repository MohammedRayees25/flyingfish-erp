"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Search, Trash2, ChevronLeft, ChevronRight, Download } from "lucide-react";
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
import { deleteSnackPurchase } from "@/actions/snacks";
import { formatCurrencyINR } from "@/lib/labels";

export type SnackPurchaseRow = {
  id: string;
  date: Date;
  itemName: string;
  quantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  vendor: string | null;
};

export function SnackPurchasesTable({
  purchases,
  total,
  page,
  pageSize,
  query,
  from,
  to,
}: {
  purchases: SnackPurchaseRow[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  from: string;
  to: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(query);
  const [deleteTarget, setDeleteTarget] = React.useState<SnackPurchaseRow | null>(null);
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

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteSnackPurchase(deleteTarget.id);
    setDeleteTarget(null);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Purchase deleted");
      router.refresh();
    }
  }

  const exportHref = React.useMemo(() => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    return `/api/reports/snacks${qs ? `?${qs}` : ""}`;
  }, [from, to]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search item or vendor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">From</label>
            <Input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => updateParam("from", e.target.value)}
              className="w-[150px]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">To</label>
            <Input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => updateParam("to", e.target.value)}
              className="w-[150px]"
            />
          </div>
        </div>
        <Button variant="outline" asChild>
          <a href={exportHref}>
            <Download /> Export Excel
          </a>
        </Button>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Unit cost</TableHead>
              <TableHead className="text-right">Total cost</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {purchases.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No purchases recorded yet.
                </TableCell>
              </TableRow>
            ) : (
              purchases.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{format(p.date, "d MMM yyyy")}</TableCell>
                  <TableCell className="font-medium">{p.itemName}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {p.quantity} {p.unit}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatCurrencyINR(p.unitCost)}
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatCurrencyINR(p.totalCost)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.vendor ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete purchase"
                        onClick={() => setDeleteTarget(p)}
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
            <AlertDialogTitle>Delete this purchase?</AlertDialogTitle>
            <AlertDialogDescription>
              This reverses the stock added by this purchase. This cannot be undone.
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
