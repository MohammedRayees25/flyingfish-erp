"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { Search, ChevronLeft, ChevronRight, Trash2, FileText, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
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
import { DiveLogFormSheet, type DiveLogWithRelations } from "@/components/dive-logs/dive-log-form-sheet";
import { deleteDiveLog } from "@/actions/dive-logs";

type Option = { id: string; fullName: string };

export type DiveLogRow = DiveLogWithRelations & {
  diveSite: { name: string } | null;
  boat: { name: string } | null;
  instructor: { fullName: string } | null;
  _count: { guests: number };
};

export function DiveLogsTable({
  logs,
  total,
  page,
  pageSize,
  query,
  start,
  end,
  diveSiteId,
  instructorId,
  boatId,
  instructors,
  boats,
  diveSites,
}: {
  logs: DiveLogRow[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  start: string;
  end: string;
  diveSiteId: string;
  instructorId: string;
  boatId: string;
  instructors: Option[];
  boats: Option[];
  diveSites: Option[];
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
    const result = await deleteDiveLog(deleteTarget);
    setDeleteTarget(null);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Dive log deleted");
      router.refresh();
    }
  }

  const exportHref = (fileFormat: "pdf" | "excel") => {
    const params = new URLSearchParams({ format: fileFormat });
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    if (diveSiteId) params.set("diveSiteId", diveSiteId);
    if (instructorId) params.set("instructorId", instructorId);
    return `/api/reports/dive-logs?${params.toString()}`;
  };

  const columns = React.useMemo<ColumnDef<DiveLogRow>[]>(
    () => [
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => format(row.original.date, "d MMM yyyy"),
      },
      {
        id: "diveSite",
        header: "Site",
        cell: ({ row }) => row.original.diveSite?.name ?? "—",
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
        id: "guests",
        header: "Guests",
        cell: ({ row }) => row.original._count.guests,
      },
      {
        id: "maxDepth",
        header: "Max depth",
        cell: ({ row }) => (row.original.maxDepth != null ? `${row.original.maxDepth} m` : "—"),
      },
      {
        id: "visibility",
        header: "Visibility",
        cell: ({ row }) => (row.original.visibility != null ? `${row.original.visibility} m` : "—"),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <DiveLogFormSheet
              mode="edit"
              log={row.original}
              instructors={instructors}
              boats={boats}
              diveSites={diveSites}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete dive log"
              onClick={() => setDeleteTarget(row.original.id)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [instructors, boats, diveSites]
  );

  const table = useReactTable({
    data: logs,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by site or instructor…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Input
          type="date"
          aria-label="Start date"
          value={start}
          max={end || undefined}
          onChange={(e) => updateParam("start", e.target.value)}
          className="w-[150px]"
        />
        <Input
          type="date"
          aria-label="End date"
          value={end}
          min={start || undefined}
          onChange={(e) => updateParam("end", e.target.value)}
          className="w-[150px]"
        />
        <Select value={diveSiteId || "ALL"} onValueChange={(v) => updateParam("diveSiteId", v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All sites" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All sites</SelectItem>
            {diveSites.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={instructorId || "ALL"}
          onValueChange={(v) => updateParam("instructorId", v === "ALL" ? "" : v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All instructors" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All instructors</SelectItem>
            {instructors.map((i) => (
              <SelectItem key={i.id} value={i.id}>
                {i.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={boatId || "ALL"} onValueChange={(v) => updateParam("boatId", v === "ALL" ? "" : v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All boats" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All boats</SelectItem>
            {boats.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={exportHref("pdf")}>
              <FileText /> Export PDF
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={exportHref("excel")}>
              <FileSpreadsheet /> Export Excel
            </a>
          </Button>
        </div>
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
                  No dive logs found.
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
            <AlertDialogTitle>Delete this dive log?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the dive log and its linked guest records. This cannot be
              undone.
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
