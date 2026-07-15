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
import { Search, ChevronLeft, ChevronRight, Trash2, Video, ExternalLink } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
import { PostFormSheet } from "@/components/social/post-form-sheet";
import { deleteSocialPost } from "@/actions/social";
import { PLATFORM_LABELS, PLATFORM_COLORS, SOCIAL_PLATFORMS, type UiSocialPlatform } from "@/components/social/platform-meta";

export type PostRow = {
  id: string;
  platform: UiSocialPlatform;
  postDate: Date;
  url: string | null;
  caption: string | null;
  isReel: boolean;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  leadsGenerated: number;
};

export function PostsTable({
  posts,
  total,
  page,
  pageSize,
  query,
  platform,
  start,
  end,
  reelOnly,
}: {
  posts: PostRow[];
  total: number;
  page: number;
  pageSize: number;
  query: string;
  platform: string;
  start: string;
  end: string;
  reelOnly: boolean;
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
    const result = await deleteSocialPost(deleteTarget);
    setDeleteTarget(null);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Post deleted");
      router.refresh();
    }
  }

  const columns = React.useMemo<ColumnDef<PostRow>[]>(
    () => [
      {
        accessorKey: "platform",
        header: "Platform",
        cell: ({ row }) => (
          <Badge variant="outline" className="gap-1.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: PLATFORM_COLORS[row.original.platform] }}
            />
            {PLATFORM_LABELS[row.original.platform]}
          </Badge>
        ),
      },
      {
        accessorKey: "postDate",
        header: "Date",
        cell: ({ row }) => format(row.original.postDate, "d MMM yyyy"),
      },
      {
        accessorKey: "caption",
        header: "Caption",
        cell: ({ row }) => {
          const caption = row.original.caption;
          const text = caption ? (caption.length > 60 ? `${caption.slice(0, 60)}…` : caption) : "—";
          return row.original.url ? (
            <a
              href={row.original.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex max-w-xs items-center gap-1 truncate text-foreground hover:underline"
              title={caption ?? undefined}
            >
              <span className="truncate">{text}</span>
              <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
            </a>
          ) : (
            <span className="block max-w-xs truncate text-muted-foreground" title={caption ?? undefined}>
              {text}
            </span>
          );
        },
      },
      {
        accessorKey: "isReel",
        header: "Reel",
        cell: ({ row }) =>
          row.original.isReel ? (
            <Badge variant="secondary" className="gap-1">
              <Video className="size-3" /> Reel
            </Badge>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        accessorKey: "views",
        header: () => <div className="text-right">Views</div>,
        cell: ({ row }) => <div className="text-right tabular-nums">{row.original.views.toLocaleString()}</div>,
      },
      {
        accessorKey: "likes",
        header: () => <div className="text-right">Likes</div>,
        cell: ({ row }) => <div className="text-right tabular-nums">{row.original.likes.toLocaleString()}</div>,
      },
      {
        accessorKey: "comments",
        header: () => <div className="text-right">Comments</div>,
        cell: ({ row }) => <div className="text-right tabular-nums">{row.original.comments.toLocaleString()}</div>,
      },
      {
        accessorKey: "reach",
        header: () => <div className="text-right">Reach</div>,
        cell: ({ row }) => <div className="text-right tabular-nums">{row.original.reach.toLocaleString()}</div>,
      },
      {
        accessorKey: "leadsGenerated",
        header: () => <div className="text-right">Leads</div>,
        cell: ({ row }) => (
          <div className="text-right tabular-nums">
            {row.original.leadsGenerated > 0 ? (
              <span className="font-medium text-success">{row.original.leadsGenerated}</span>
            ) : (
              row.original.leadsGenerated
            )}
          </div>
        ),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="flex justify-end gap-1">
            <PostFormSheet mode="edit" post={row.original} />
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete post"
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
    data: posts,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search caption…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">Platform</Label>
          <Select value={platform || "ALL"} onValueChange={(v) => updateParam("platform", v === "ALL" ? "" : v)}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All platforms</SelectItem>
              {SOCIAL_PLATFORMS.map((p) => (
                <SelectItem key={p} value={p}>
                  {PLATFORM_LABELS[p]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input
            type="date"
            value={start}
            onChange={(e) => updateParam("start", e.target.value)}
            className="w-[150px]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input
            type="date"
            value={end}
            onChange={(e) => updateParam("end", e.target.value)}
            className="w-[150px]"
          />
        </div>

        <div className="flex items-center gap-2 pb-2">
          <Switch
            id="reel-only"
            checked={reelOnly}
            onCheckedChange={(checked) => updateParam("reelOnly", checked ? "1" : "")}
          />
          <Label htmlFor="reel-only" className="text-sm font-normal">
            Reels only
          </Label>
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
                  No posts found.
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
            Page {page} of {totalPages} ({total} posts)
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
            <AlertDialogTitle>Delete this post?</AlertDialogTitle>
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
