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
import { Progress } from "@/components/ui/progress";
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
import { CertificationFormSheet } from "@/components/certifications/certification-form-sheet";
import { deleteGuestCertification } from "@/actions/certifications";
import { CERTIFICATION_STATUS_LABELS } from "@/lib/labels";
import type { CertificationAgency, CertificationStatus } from "@prisma/client";

export const CERTIFICATION_AGENCY_LABELS: Record<CertificationAgency, string> = {
  PADI: "PADI",
  SSI: "SSI",
  OTHER: "Other",
};

const STATUS_BADGE_VARIANT: Record<
  CertificationStatus,
  "outline" | "secondary" | "warning" | "success"
> = {
  NOT_STARTED: "outline",
  IN_PROGRESS: "secondary",
  COMPLETED: "success",
  PENDING_CARD: "warning",
  ISSUED: "success",
};

export type CertificationRow = {
  id: string;
  guestId: string;
  guestName: string;
  guestPhone: string;
  courseId: string;
  courseName: string;
  agency: CertificationAgency;
  instructorId: string | null;
  instructorName: string | null;
  status: CertificationStatus;
  progress: number;
  theoryCompletedAt: Date | null;
  poolCompletedAt: Date | null;
  openWaterDivesCompleted: number;
  openWaterDivesRequired: number;
  examPassedAt: Date | null;
  certificateNumber: string | null;
  startDate: Date | null;
  completionDate: Date | null;
  issueDate: Date | null;
  notes: string | null;
};

export type CourseOption = { id: string; name: string; agency: CertificationAgency };
export type InstructorOption = { id: string; fullName: string };

export function CertificationsTable({
  certifications,
  total,
  page,
  pageSize,
  query,
  status,
  agency,
  courseId,
  courses,
  instructors,
}: {
  certifications: CertificationRow[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  status: string;
  agency: string;
  courseId: string;
  courses: CourseOption[];
  instructors: InstructorOption[];
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

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete(key);
    else params.set(key, value);
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
    const result = await deleteGuestCertification(deleteTarget);
    setDeleteTarget(null);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Certification deleted");
      router.refresh();
    }
  }

  const columns = React.useMemo<ColumnDef<CertificationRow>[]>(
    () => [
      {
        accessorKey: "guestName",
        header: "Guest",
        cell: ({ row }) => <span className="font-medium">{row.original.guestName}</span>,
      },
      {
        accessorKey: "courseName",
        header: "Course",
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span>{row.original.courseName}</span>
            <span className="text-xs text-muted-foreground">
              {CERTIFICATION_AGENCY_LABELS[row.original.agency]}
            </span>
          </div>
        ),
      },
      {
        accessorKey: "instructorName",
        header: "Instructor",
        cell: ({ row }) => row.original.instructorName ?? "Unassigned",
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={STATUS_BADGE_VARIANT[row.original.status]}>
            {CERTIFICATION_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        accessorKey: "progress",
        header: "Progress",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <Progress value={row.original.progress} className="w-20" />
            <span className="text-xs text-muted-foreground tabular-nums">
              {row.original.progress}%
            </span>
          </div>
        ),
      },
      {
        id: "dives",
        header: "Dives",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.openWaterDivesCompleted}/{row.original.openWaterDivesRequired}
          </span>
        ),
      },
      {
        accessorKey: "certificateNumber",
        header: "Certificate #",
        cell: ({ row }) => row.original.certificateNumber ?? "—",
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <CertificationFormSheet
              mode="edit"
              certification={row.original}
              courses={courses}
              instructors={instructors}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete certification"
              onClick={() => setDeleteTarget(row.original.id)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [courses, instructors]
  );

  const table = useReactTable({
    data: certifications,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] max-w-sm flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search by guest name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={(v) => updateFilter("status", v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {Object.entries(CERTIFICATION_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={agency} onValueChange={(v) => updateFilter("agency", v)}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Agency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All agencies</SelectItem>
            {Object.entries(CERTIFICATION_AGENCY_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={courseId} onValueChange={(v) => updateFilter("courseId", v)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Course" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All courses</SelectItem>
            {courses.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} · {CERTIFICATION_AGENCY_LABELS[c.agency]}
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
                  No certifications found.
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
            <AlertDialogTitle>Delete this certification record?</AlertDialogTitle>
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
