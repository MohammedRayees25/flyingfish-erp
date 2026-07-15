"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowDown, ArrowUp, Minus, Trash2 } from "lucide-react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { deleteFollowerSnapshot } from "@/actions/social";
import {
  PLATFORM_LABELS,
  PLATFORM_ICONS,
  PLATFORM_COLORS,
  SOCIAL_PLATFORMS,
  type UiSocialPlatform,
} from "@/components/social/platform-meta";

export type SnapshotRow = {
  id: string;
  date: Date;
  followers: number;
  delta: number | null;
};

export function FollowersPanel({
  snapshotsByPlatform,
}: {
  snapshotsByPlatform: Record<UiSocialPlatform, SnapshotRow[]>;
}) {
  const router = useRouter();
  const [deleteTarget, setDeleteTarget] = React.useState<string | null>(null);

  async function handleDelete() {
    if (!deleteTarget) return;
    const result = await deleteFollowerSnapshot(deleteTarget);
    setDeleteTarget(null);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Snapshot deleted");
      router.refresh();
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {SOCIAL_PLATFORMS.map((platform) => {
          const rows = snapshotsByPlatform[platform];
          const Icon = PLATFORM_ICONS[platform];
          return (
            <Card key={platform}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <span
                    className="flex size-6 items-center justify-center rounded-md"
                    style={{
                      backgroundColor: `color-mix(in oklab, ${PLATFORM_COLORS[platform]} 16%, transparent)`,
                      color: PLATFORM_COLORS[platform],
                    }}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  {PLATFORM_LABELS[platform]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {rows.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No snapshots recorded yet.
                  </p>
                ) : (
                  <div className="overflow-x-auto rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Followers</TableHead>
                          <TableHead className="text-right">Change</TableHead>
                          <TableHead className="w-8" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {rows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>{format(row.date, "d MMM yyyy")}</TableCell>
                            <TableCell className="text-right tabular-nums">
                              {row.followers.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right tabular-nums">
                              {row.delta === null ? (
                                <span className="text-muted-foreground">—</span>
                              ) : row.delta > 0 ? (
                                <span className="inline-flex items-center gap-0.5 text-success">
                                  <ArrowUp className="size-3" />
                                  {row.delta.toLocaleString()}
                                </span>
                              ) : row.delta < 0 ? (
                                <span className="inline-flex items-center gap-0.5 text-destructive">
                                  <ArrowDown className="size-3" />
                                  {Math.abs(row.delta).toLocaleString()}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 text-muted-foreground">
                                  <Minus className="size-3" />0
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label="Delete snapshot"
                                onClick={() => setDeleteTarget(row.id)}
                              >
                                <Trash2 className="size-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this snapshot?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
