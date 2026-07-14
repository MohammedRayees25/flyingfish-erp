"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Search, ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { BookingFormSheet } from "@/components/bookings/booking-form-sheet";
import { deleteBooking, updateBookingStatus } from "@/actions/bookings";
import {
  ACTIVITY_LABELS,
  BOOKING_STATUS_LABELS,
  formatCurrencyINR,
} from "@/lib/labels";
import { format } from "date-fns";
import type { ActivityType, Boat, BookingStatus, DiveSite, User } from "@prisma/client";

type BookingRow = {
  id: string;
  guestId: string;
  guest: { fullName: string; phone: string };
  instructorId: string | null;
  instructor: Pick<User, "fullName"> | null;
  boatId: string | null;
  boat: Pick<Boat, "name"> | null;
  diveSiteId: string | null;
  diveSite: Pick<DiveSite, "name"> | null;
  activityType: ActivityType;
  date: Date;
  status: BookingStatus;
  price: number;
  notes: string | null;
  paymentStatus: string | null;
};

const STATUS_BADGE_VARIANT: Record<BookingStatus, "default" | "secondary" | "outline" | "destructive" | "success" | "warning"> = {
  PENDING: "warning",
  CONFIRMED: "default",
  COMPLETED: "success",
  CANCELLED: "destructive",
  NO_SHOW: "outline",
};

export function BookingsTable({
  bookings,
  total,
  page,
  pageSize,
  query,
  status,
  instructors,
  boats,
  diveSites,
  activityRates,
}: {
  bookings: BookingRow[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  status: string;
  instructors: { id: string; fullName: string }[];
  boats: { id: string; fullName: string }[];
  diveSites: { id: string; fullName: string }[];
  activityRates: Record<string, number>;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(query);
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);
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
    if (value && value !== "ALL") params.set(key, value);
    else params.delete(key);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  const handleStatusChange = React.useCallback(async (bookingId: string, newStatus: BookingStatus) => {
    const result = await updateBookingStatus(bookingId, newStatus);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Status updated");
      router.refresh();
    }
  }, [router]);

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteBooking(deleteTarget);
    setDeleteTarget(null);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Booking deleted");
      router.refresh();
    }
  }

  const columns = React.useMemo<ColumnDef<BookingRow>[]>(
    () => [
      {
        accessorKey: "guest",
        header: "Guest",
        cell: ({ row }) => (
          <Link href={`/guests/${row.original.guestId}`} className="font-medium hover:underline">
            {row.original.guest.fullName}
          </Link>
        ),
      },
      {
        accessorKey: "activityType",
        header: "Activity",
        cell: ({ row }) => ACTIVITY_LABELS[row.original.activityType],
      },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => format(row.original.date, "d MMM yyyy"),
      },
      {
        id: "instructor",
        header: "Instructor",
        cell: ({ row }) => row.original.instructor?.fullName ?? "—",
      },
      {
        id: "boat",
        header: "Boat",
        cell: ({ row }) => row.original.boat?.name ?? "—",
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => formatCurrencyINR(row.original.price),
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <Select
            value={row.original.status}
            onValueChange={(v) => handleStatusChange(row.original.id, v as BookingStatus)}
          >
            <SelectTrigger size="sm" className="h-7 w-[130px] border-none bg-transparent shadow-none">
              <Badge variant={STATUS_BADGE_VARIANT[row.original.status]}>
                {BOOKING_STATUS_LABELS[row.original.status]}
              </Badge>
            </SelectTrigger>
            <SelectContent>
              {Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <BookingFormSheet
              mode="edit"
              booking={{ ...row.original, price: Number(row.original.price) }}
              instructors={instructors}
              boats={boats}
              diveSites={diveSites}
              activityRates={activityRates}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete booking"
              onClick={() => setDeleteTarget(row.original.id)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [instructors, boats, diveSites, activityRates, handleStatusChange]
  );

  const table = useReactTable({
    data: bookings,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by guest name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={status || "ALL"} onValueChange={(v) => updateParam("status", v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            {Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No bookings found.
                </TableCell>
              </TableRow>
            ) : (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
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
            <AlertDialogTitle>Delete this booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the booking and its linked payment record. This
              cannot be undone.
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
