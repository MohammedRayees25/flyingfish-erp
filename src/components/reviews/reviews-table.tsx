"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from "@tanstack/react-table";
import { format } from "date-fns";
import { Search, ChevronLeft, ChevronRight, Trash2, CheckCheck } from "lucide-react";
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
import { ReviewFormSheet } from "@/components/reviews/review-form-sheet";
import { StarRating } from "@/components/reviews/star-rating";
import { deleteReview, updateReplyStatus } from "@/actions/reviews";
import type { ReviewInput } from "@/lib/validations/reviews";

export type ReviewRow = {
  id: string;
  reviewerName: string;
  guestId: string | null;
  guest: { id: string; fullName: string; phone: string } | null;
  rating: number;
  reviewText: string | null;
  reviewDate: Date;
  replyStatus: ReviewInput["replyStatus"];
  instructorMentionedId: string | null;
  instructorMentioned: { fullName: string } | null;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | null;
};

const REPLY_STATUS_LABELS: Record<ReviewInput["replyStatus"], string> = {
  PENDING: "Pending",
  REPLIED: "Replied",
  NOT_NEEDED: "Not Needed",
};

const REPLY_STATUS_VARIANT: Record<
  ReviewInput["replyStatus"],
  "default" | "secondary" | "outline" | "destructive" | "success" | "warning"
> = {
  PENDING: "warning",
  REPLIED: "success",
  NOT_NEEDED: "outline",
};

const SENTIMENT_LABELS: Record<"POSITIVE" | "NEUTRAL" | "NEGATIVE", string> = {
  POSITIVE: "Positive",
  NEUTRAL: "Neutral",
  NEGATIVE: "Negative",
};

const SENTIMENT_VARIANT: Record<
  "POSITIVE" | "NEUTRAL" | "NEGATIVE",
  "default" | "secondary" | "outline" | "destructive" | "success" | "warning"
> = {
  POSITIVE: "success",
  NEUTRAL: "secondary",
  NEGATIVE: "destructive",
};

export function ReviewsTable({
  reviews,
  total,
  page,
  pageSize,
  query,
  rating,
  replyStatus,
  sentiment,
  dateFrom,
  dateTo,
  instructors,
}: {
  reviews: ReviewRow[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  rating: string;
  replyStatus: string;
  sentiment: string;
  dateFrom: string;
  dateTo: string;
  instructors: { id: string; fullName: string }[];
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

  const handleMarkReplied = React.useCallback(
    async (id: string) => {
      const result = await updateReplyStatus(id, "REPLIED");
      if (result?.error) toast.error(result.error);
      else {
        toast.success("Marked as replied");
        router.refresh();
      }
    },
    [router]
  );

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteReview(deleteTarget);
    setDeleteTarget(null);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Review deleted");
      router.refresh();
    }
  }

  const columns = React.useMemo<ColumnDef<ReviewRow>[]>(
    () => [
      {
        accessorKey: "reviewerName",
        header: "Reviewer",
        cell: ({ row }) => <span className="font-medium">{row.original.reviewerName}</span>,
      },
      {
        id: "guest",
        header: "Guest",
        cell: ({ row }) =>
          row.original.guest ? (
            <Link href={`/guests/${row.original.guest.id}`} className="hover:underline">
              {row.original.guest.fullName}
            </Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "rating",
        header: "Rating",
        cell: ({ row }) => <StarRating rating={row.original.rating} />,
      },
      {
        id: "reviewText",
        header: "Review",
        cell: ({ row }) =>
          row.original.reviewText ? (
            <span className="line-clamp-2 max-w-xs text-sm text-muted-foreground">
              {row.original.reviewText}
            </span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "reviewDate",
        header: "Date",
        cell: ({ row }) => format(row.original.reviewDate, "d MMM yyyy"),
      },
      {
        id: "sentiment",
        header: "Sentiment",
        cell: ({ row }) =>
          row.original.sentiment ? (
            <Badge variant={SENTIMENT_VARIANT[row.original.sentiment]}>
              {SENTIMENT_LABELS[row.original.sentiment]}
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "replyStatus",
        header: "Reply status",
        cell: ({ row }) => (
          <Badge variant={REPLY_STATUS_VARIANT[row.original.replyStatus]}>
            {REPLY_STATUS_LABELS[row.original.replyStatus]}
          </Badge>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            {row.original.replyStatus !== "REPLIED" ? (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Mark replied"
                title="Mark replied"
                onClick={() => handleMarkReplied(row.original.id)}
              >
                <CheckCheck className="size-4 text-success" />
              </Button>
            ) : null}
            <ReviewFormSheet
              mode="edit"
              review={{
                id: row.original.id,
                reviewerName: row.original.reviewerName,
                guestId: row.original.guestId,
                guest: row.original.guest
                  ? { fullName: row.original.guest.fullName, phone: row.original.guest.phone }
                  : null,
                rating: row.original.rating,
                reviewText: row.original.reviewText,
                reviewDate: row.original.reviewDate,
                replyStatus: row.original.replyStatus,
                instructorMentionedId: row.original.instructorMentionedId,
                sentiment: row.original.sentiment,
              }}
              instructors={instructors}
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete review"
              onClick={() => setDeleteTarget(row.original.id)}
            >
              <Trash2 className="size-4 text-destructive" />
            </Button>
          </div>
        ),
      },
    ],
    [instructors, handleMarkReplied]
  );

  const table = useReactTable({
    data: reviews,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search reviewer or review text…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={rating || "ALL"} onValueChange={(v) => updateParam("rating", v)}>
          <SelectTrigger className="w-[130px]">
            <SelectValue placeholder="All ratings" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All ratings</SelectItem>
            {[5, 4, 3, 2, 1].map((r) => (
              <SelectItem key={r} value={String(r)}>
                {r} star{r === 1 ? "" : "s"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={replyStatus || "ALL"} onValueChange={(v) => updateParam("replyStatus", v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All reply status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All reply status</SelectItem>
            {Object.entries(REPLY_STATUS_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sentiment || "ALL"} onValueChange={(v) => updateParam("sentiment", v)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="All sentiment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All sentiment</SelectItem>
            {Object.entries(SENTIMENT_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground" htmlFor="review-date-from">
            From
          </label>
          <Input
            id="review-date-from"
            type="date"
            value={dateFrom}
            onChange={(e) => updateParam("from", e.target.value)}
            className="w-[150px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground" htmlFor="review-date-to">
            To
          </label>
          <Input
            id="review-date-to"
            type="date"
            value={dateTo}
            onChange={(e) => updateParam("to", e.target.value)}
            className="w-[150px]"
          />
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
                  No reviews found.
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
            <AlertDialogTitle>Delete this review?</AlertDialogTitle>
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
