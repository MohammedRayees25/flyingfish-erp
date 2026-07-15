"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Download,
  MessageCircle,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import type { LeadStage } from "@prisma/client";
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
import { LeadFormSheet, type LeadForEdit } from "@/components/crm/lead-form-sheet";
import { deleteLead } from "@/actions/crm";
import { LEAD_STAGE_ORDER, LEAD_STAGE_LABELS, LEAD_STAGE_BADGE_VARIANT } from "@/lib/crm-labels";
import { whatsappHref, telHref } from "@/lib/contact-links";

export type LeadRow = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  stage: LeadStage;
  source: string | null;
  assignedToId: string | null;
  assignedToName: string | null;
  followUpAt: Date | null;
  isRepeatCustomer: boolean;
  referredById: string | null;
  referredByName: string | null;
  guestId: string | null;
  guestName: string | null;
  notes: string | null;
};

const ALL = "ALL";
const UNASSIGNED = "UNASSIGNED";

function toEditPayload(row: LeadRow): LeadForEdit {
  return {
    id: row.id,
    fullName: row.fullName,
    phone: row.phone,
    email: row.email,
    source: row.source,
    stage: row.stage,
    assignedToId: row.assignedToId,
    followUpAt: row.followUpAt,
    isRepeatCustomer: row.isRepeatCustomer,
    referredById: row.referredById,
    referredByName: row.referredByName,
    guestId: row.guestId,
    guestName: row.guestName,
    notes: row.notes,
  };
}

export function LeadsTable({
  leads,
  total,
  page,
  pageSize,
  query,
  stage,
  source,
  assignedToId,
  staffOptions,
  sourceOptions,
}: {
  leads: LeadRow[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  stage: string;
  source: string;
  assignedToId: string;
  staffOptions: { id: string; fullName: string }[];
  sourceOptions: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = React.useState(query);
  const [deleteTarget, setDeleteTarget] = React.useState<LeadRow | null>(null);
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

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value && value !== ALL) params.set(key, value);
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
    const result = await deleteLead(deleteTarget.id);
    setDeleteTarget(null);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Lead deleted");
      router.refresh();
    }
  }

  const columns = React.useMemo<ColumnDef<LeadRow>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Name",
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span className="font-medium">{row.original.fullName}</span>
            {row.original.isRepeatCustomer ? (
              <Badge variant="secondary" className="w-fit">
                Repeat
              </Badge>
            ) : null}
          </div>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => row.original.phone,
      },
      {
        accessorKey: "stage",
        header: "Stage",
        cell: ({ row }) => (
          <Badge variant={LEAD_STAGE_BADGE_VARIANT[row.original.stage]}>
            {LEAD_STAGE_LABELS[row.original.stage]}
          </Badge>
        ),
      },
      {
        accessorKey: "source",
        header: "Source",
        cell: ({ row }) => row.original.source ?? "—",
      },
      {
        accessorKey: "assignedToName",
        header: "Assigned",
        cell: ({ row }) => row.original.assignedToName ?? "—",
      },
      {
        accessorKey: "followUpAt",
        header: "Follow-up",
        cell: ({ row }) =>
          row.original.followUpAt ? format(row.original.followUpAt, "d MMM yyyy, h:mm a") : "—",
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" asChild>
              <a
                href={whatsappHref(row.original.phone)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`WhatsApp ${row.original.fullName}`}
                onClick={(e) => e.stopPropagation()}
              >
                <MessageCircle className="size-4 text-success" />
              </a>
            </Button>
            <Button variant="ghost" size="icon" asChild>
              <a
                href={telHref(row.original.phone)}
                aria-label={`Call ${row.original.fullName}`}
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="size-4 text-primary" />
              </a>
            </Button>
            <LeadFormSheet mode="edit" lead={toEditPayload(row.original)} staffOptions={staffOptions} />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete lead"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [staffOptions]
  );

  const table = useReactTable({ data: leads, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm sm:w-auto">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or phone…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <Select value={stage || ALL} onValueChange={(v) => updateFilter("stage", v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Stage" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All stages</SelectItem>
            {LEAD_STAGE_ORDER.map((s) => (
              <SelectItem key={s} value={s}>
                {LEAD_STAGE_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={source || ALL} onValueChange={(v) => updateFilter("source", v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sources</SelectItem>
            {sourceOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={assignedToId || ALL} onValueChange={(v) => updateFilter("assignedToId", v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Assigned to" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All staff</SelectItem>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {staffOptions.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.fullName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" className="sm:ml-auto" asChild>
          <a href={`/api/reports/crm${stage ? `?stage=${stage}` : ""}`}>
            <Download /> Export Excel
          </a>
        </Button>
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
                  No leads found.
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
            <AlertDialogTitle>Delete {deleteTarget?.fullName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Any leads referred by this lead will be unlinked.
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
