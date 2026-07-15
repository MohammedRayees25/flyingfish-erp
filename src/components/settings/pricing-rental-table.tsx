"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { RentalItemFormSheet } from "@/components/settings/rental-item-form-sheet";
import { deleteRentalItem } from "@/actions/settings";
import { formatCurrencyINR } from "@/lib/labels";
import type { PricingRentalRow } from "@/components/settings/pricing-tab";

export function PricingRentalTable({ items }: { items: PricingRentalRow[] }) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteRentalItem(deleteTarget);
    setDeleteTarget(null);
    if (result?.error) {
      toast.error(result.error);
    } else {
      toast.success("Rental item deleted");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <RentalItemFormSheet mode="create" />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Daily rate</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                  No rental items yet.
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="tabular-nums">{formatCurrencyINR(item.dailyRate)}</TableCell>
                  <TableCell>
                    <Badge variant={item.isActive ? "success" : "outline"}>
                      {item.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <RentalItemFormSheet mode="edit" item={item} />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Delete rental item"
                        onClick={() => setDeleteTarget(item.id)}
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this rental item?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
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
