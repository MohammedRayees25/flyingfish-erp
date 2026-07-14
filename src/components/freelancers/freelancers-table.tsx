"use client";

import * as React from "react";
import Link from "next/link";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { MessageCircle, Phone } from "lucide-react";
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
import { formatCurrencyINR } from "@/lib/labels";
import { whatsappHref, telHref } from "@/lib/contact-links";

export type FreelancerRow = {
  id: string;
  fullName: string;
  role: string;
  phone: string | null;
  dayRate: number;
  isActive: boolean;
  pendingAmount: number;
};

export function FreelancersTable({ freelancers }: { freelancers: FreelancerRow[] }) {
  const columns = React.useMemo<ColumnDef<FreelancerRow>[]>(
    () => [
      {
        accessorKey: "fullName",
        header: "Name",
        cell: ({ row }) => (
          <Link href={`/freelancers/${row.original.id}`} className="font-medium hover:underline">
            {row.original.fullName}
          </Link>
        ),
      },
      {
        accessorKey: "role",
        header: "Role",
        cell: ({ row }) => row.original.role,
      },
      {
        accessorKey: "phone",
        header: "Phone",
        cell: ({ row }) => row.original.phone ?? "—",
      },
      {
        accessorKey: "dayRate",
        header: "Day rate",
        cell: ({ row }) => formatCurrencyINR(row.original.dayRate),
      },
      {
        accessorKey: "isActive",
        header: "Active",
        cell: ({ row }) => (
          <Badge variant={row.original.isActive ? "success" : "outline"}>
            {row.original.isActive ? "Active" : "Inactive"}
          </Badge>
        ),
      },
      {
        accessorKey: "pendingAmount",
        header: "Pending amount",
        cell: ({ row }) =>
          row.original.pendingAmount > 0 ? (
            <span className="font-medium text-warning">
              {formatCurrencyINR(row.original.pendingAmount)}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) =>
          row.original.phone ? (
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
          ) : null,
      },
    ],
    []
  );

  const table = useReactTable({
    data: freelancers,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
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
                No freelancers found.
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
  );
}
