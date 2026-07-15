"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
import type { AuditAction } from "@prisma/client";

export type AuditLogRow = {
  id: string;
  userName: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  summary: string;
  createdAt: Date;
};

const ACTION_VARIANT: Record<AuditAction, "success" | "secondary" | "destructive"> = {
  CREATE: "success",
  UPDATE: "secondary",
  DELETE: "destructive",
};

export function AuditLogTab({
  logs,
  total,
  page,
  pageSize,
}: {
  logs: AuditLogRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function goToPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "audit");
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Summary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No audit log entries yet.
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground">
                    {format(log.createdAt, "d MMM yyyy, h:mm a")}
                  </TableCell>
                  <TableCell>{log.userName ?? "System"}</TableCell>
                  <TableCell>
                    <Badge variant={ACTION_VARIANT[log.action]}>{log.action}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{log.entityType}</TableCell>
                  <TableCell className="max-w-md truncate">{log.summary}</TableCell>
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
    </div>
  );
}
