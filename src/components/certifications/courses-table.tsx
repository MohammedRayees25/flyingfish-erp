"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
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
import { CourseFormSheet } from "@/components/certifications/course-form-sheet";
import { CERTIFICATION_AGENCY_LABELS } from "@/components/certifications/certifications-table";
import { deleteCertificationCourse } from "@/actions/certifications";
import { formatCurrencyINR } from "@/lib/labels";
import type { CertificationAgency } from "@prisma/client";

export type CertificationCourseRow = {
  id: string;
  name: string;
  agency: CertificationAgency;
  track: string | null;
  price: number;
};

export function CoursesTable({ courses }: { courses: CertificationCourseRow[] }) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteCertificationCourse(deleteTarget);
    setDeleteTarget(null);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Course deleted");
      router.refresh();
    }
  }

  const columns = React.useMemo<ColumnDef<CertificationCourseRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
      },
      {
        accessorKey: "agency",
        header: "Agency",
        cell: ({ row }) => (
          <Badge variant="secondary">{CERTIFICATION_AGENCY_LABELS[row.original.agency]}</Badge>
        ),
      },
      {
        accessorKey: "track",
        header: "Track",
        cell: ({ row }) => row.original.track ?? "—",
      },
      {
        accessorKey: "price",
        header: "Price",
        cell: ({ row }) => formatCurrencyINR(row.original.price),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <CourseFormSheet mode="edit" course={row.original} />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete course"
              onClick={() => setDeleteTarget(row.original.id)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  const table = useReactTable({
    data: courses,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
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
                  No courses yet. Add PADI, SSI or other courses to build your catalog.
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this course?</AlertDialogTitle>
            <AlertDialogDescription>
              This cannot be undone. Courses with guest certifications linked to them cannot be
              deleted.
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
