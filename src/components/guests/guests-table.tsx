"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { MessageCircle, Phone, Search, ChevronLeft, ChevronRight } from "lucide-react";
import type { Guest } from "@prisma/client";
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
import { CERTIFICATION_LEVEL_LABELS } from "@/lib/labels";
import { whatsappHref, telHref } from "@/lib/contact-links";

type GuestRow = Guest & { _count: { bookings: number; payments: number } };

export function GuestsTable({
  guests,
  total,
  page,
  pageSize,
  query,
}: {
  guests: GuestRow[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [search, setSearch] = React.useState(query);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  React.useEffect(() => {
    const timeout = setTimeout(() => {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      router.push(`${pathname}${params.toString() ? `?${params}` : ""}`);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  function goToPage(p: number) {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    params.set("page", String(p));
    router.push(`${pathname}?${params}`);
  }

  const columns = React.useMemo<ColumnDef<GuestRow>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Name",
        cell: ({ row }) => (
          <Link
            href={`/guests/${row.original.id}`}
            className="font-medium hover:underline"
          >
            {row.original.fullName}
          </Link>
        ),
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => row.original.phone,
      },
      {
        accessorKey: "nationality",
        header: "Nationality",
        cell: ({ row }) => row.original.nationality ?? "—",
      },
      {
        accessorKey: "certificationLevel",
        header: "Certification",
        cell: ({ row }) => (
          <Badge variant="secondary">
            {CERTIFICATION_LEVEL_LABELS[row.original.certificationLevel]}
          </Badge>
        ),
      },
      {
        accessorKey: "previousDives",
        header: "Dives",
        cell: ({ row }) => row.original.previousDives,
      },
      {
        id: "bookings",
        header: "Bookings",
        cell: ({ row }) => row.original._count.bookings,
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
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: guests,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Search by name, phone, email, nationality…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
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
                  No guests found.
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
            <Button
              variant="outline"
              size="icon"
              disabled={page <= 1}
              onClick={() => goToPage(page - 1)}
            >
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
    </div>
  );
}
