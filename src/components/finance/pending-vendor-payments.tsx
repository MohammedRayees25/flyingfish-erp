import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { formatCurrencyINR } from "@/lib/labels";

type Rollup = {
  label: string;
  description: string;
  amount: number;
  count: number;
  href: string;
};

export function PendingVendorPayments({ rollups }: { rollups: Rollup[] }) {
  const total = rollups.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Total outstanding</CardTitle>
          <CardDescription>Across guests, freelancers, staff salary and boat/tempo vendors</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-semibold tabular-nums text-destructive">
            {formatCurrencyINR(total)}
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        {rollups.map((r) => (
          <Card key={r.label}>
            <CardContent className="flex items-center justify-between gap-4 pt-6">
              <div>
                <p className="text-sm font-medium">{r.label}</p>
                <p className="text-xs text-muted-foreground">{r.description}</p>
                <p className="mt-2 text-xl font-semibold tabular-nums">{formatCurrencyINR(r.amount)}</p>
                <p className="text-xs text-muted-foreground">{r.count} pending</p>
              </div>
              <Link
                href={r.href}
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              >
                <ArrowRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
