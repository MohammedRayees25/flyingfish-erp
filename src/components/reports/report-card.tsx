"use client";

import * as React from "react";
import { format } from "date-fns";
import { ChevronDown, FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { previewReport } from "@/actions/reports";
import type { ReportId } from "@/lib/reports/registry";
import type { ReportTable } from "@/lib/reports/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const PREVIEW_ROW_LIMIT = 15;

export function ReportCard({
  id,
  label,
  description,
}: {
  id: ReportId;
  label: string;
  description: string;
}) {
  const [start, setStart] = React.useState("");
  const [end, setEnd] = React.useState("");
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [preview, setPreview] = React.useState<ReportTable | null>(null);
  const [previewError, setPreviewError] = React.useState<string | null>(null);
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (!previewOpen) return;

    startTransition(async () => {
      const result = await previewReport(id, start || undefined, end || undefined);
      if ("error" in result) {
        setPreviewError(result.error);
        setPreview(null);
      } else {
        setPreviewError(null);
        setPreview(result);
      }
    });
  }, [previewOpen, start, end, id]);

  const downloadHref = (fileFormat: "pdf" | "excel" | "csv") => {
    const params = new URLSearchParams({ format: fileFormat });
    if (start) params.set("start", start);
    if (end) params.set("end", end);
    return `/api/reports/generate/${id}?${params.toString()}`;
  };

  const extraRowCount = preview ? preview.rows.length - PREVIEW_ROW_LIMIT : 0;

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle>{label}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-start`} className="text-xs text-muted-foreground">
              Start date
            </Label>
            <Input
              id={`${id}-start`}
              type="date"
              value={start}
              max={end || undefined}
              onChange={(e) => setStart(e.target.value)}
              className="h-8 w-40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-end`} className="text-xs text-muted-foreground">
              End date
            </Label>
            <Input
              id={`${id}-end`}
              type="date"
              value={end}
              min={start || undefined}
              onChange={(e) => setEnd(e.target.value)}
              className="h-8 w-40"
            />
          </div>
          <p className="pb-1.5 text-xs text-muted-foreground">
            Leave blank to use the report&apos;s default period.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" asChild>
            <a href={downloadHref("pdf")}>
              <FileText /> PDF
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={downloadHref("excel")}>
              <FileSpreadsheet /> Excel
            </a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={downloadHref("csv")}>
              <FileDown /> CSV
            </a>
          </Button>

          <Separator orientation="vertical" className="mx-1 h-6" />

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPreviewOpen((v) => !v)}
            aria-expanded={previewOpen}
          >
            <ChevronDown
              className={previewOpen ? "rotate-180 transition-transform" : "transition-transform"}
            />
            {previewOpen ? "Hide preview" : "Preview"}
          </Button>
        </div>

        {previewOpen ? (
          <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4">
            {isPending ? (
              <div className="flex flex-col gap-3">
                <Skeleton className="h-4 w-1/3" />
                <div className="flex gap-3">
                  <Skeleton className="h-14 w-32" />
                  <Skeleton className="h-14 w-32" />
                  <Skeleton className="h-14 w-32" />
                </div>
                <Skeleton className="h-32 w-full" />
              </div>
            ) : previewError ? (
              <p className="text-sm text-destructive">{previewError}</p>
            ) : preview ? (
              <>
                <div>
                  <p className="text-sm font-medium">{preview.subtitle}</p>
                  <p className="text-xs text-muted-foreground">
                    Generated {format(preview.generatedAt, "d MMM yyyy, HH:mm")}
                  </p>
                </div>

                {preview.summary.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {preview.summary.map((stat) => (
                      <div
                        key={stat.label}
                        className="flex flex-col gap-0.5 rounded-md border bg-background px-3 py-2"
                      >
                        <span className="text-xs text-muted-foreground">{stat.label}</span>
                        <span className="text-sm font-semibold tabular-nums">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="overflow-x-auto rounded-md border bg-background">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {preview.columns.map((column) => (
                          <TableHead
                            key={column.key}
                            className={column.align === "right" ? "text-right" : undefined}
                          >
                            {column.header}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.rows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={preview.columns.length}
                            className="h-20 text-center text-muted-foreground"
                          >
                            No data for this period.
                          </TableCell>
                        </TableRow>
                      ) : (
                        preview.rows.slice(0, PREVIEW_ROW_LIMIT).map((row, index) => (
                          <TableRow key={index}>
                            {preview.columns.map((column) => (
                              <TableCell
                                key={column.key}
                                className={column.align === "right" ? "text-right" : undefined}
                              >
                                {row[column.key]}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                {extraRowCount > 0 ? (
                  <p className="text-xs text-muted-foreground">
                    +{extraRowCount} more row{extraRowCount === 1 ? "" : "s"} — download for the
                    full report.
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
