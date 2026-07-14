import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrencyINR } from "@/lib/labels";
import { EmptyState } from "./chart-utils";

type InstructorRow = {
  name: string;
  bookings: number;
  revenue: number;
  avgRating: number | null;
};

export function InstructorTable({ data }: { data: InstructorRow[] }) {
  if (data.length === 0) {
    return <EmptyState message="No instructor activity yet." />;
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Instructor</TableHead>
          <TableHead className="text-right">Bookings</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead className="text-right">Avg. rating</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.name}>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell className="text-right tabular-nums">{row.bookings}</TableCell>
            <TableCell className="text-right tabular-nums">
              {formatCurrencyINR(row.revenue)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {row.avgRating !== null ? row.avgRating.toFixed(1) : "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
