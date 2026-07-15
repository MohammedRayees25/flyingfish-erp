import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyINR } from "@/lib/labels";
import type { PricingCourseRow } from "@/components/settings/pricing-tab";

const AGENCY_LABELS: Record<string, string> = {
  PADI: "PADI",
  SSI: "SSI",
  OTHER: "Other",
};

export function PricingCoursesList({ courses }: { courses: PricingCourseRow[] }) {
  return (
    <div className="overflow-x-auto rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Course</TableHead>
            <TableHead>Agency</TableHead>
            <TableHead>Track</TableHead>
            <TableHead className="text-right">Price</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {courses.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                No certification courses yet.
              </TableCell>
            </TableRow>
          ) : (
            courses.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{AGENCY_LABELS[c.agency] ?? c.agency}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.track ?? "—"}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrencyINR(c.price)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
