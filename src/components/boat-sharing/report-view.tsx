"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Download } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrencyINR } from "@/lib/labels";

export type BoatSharingReportData = {
  trips: number;
  totalGuests: number;
  boatAmount: number;
  tempoAmount: number;
  outstanding: number;
  pendingPartyAmount: number;
  partyTotals: { partyName: string; guestCount: number; amountDue: number; amountPaid: number }[];
};

function ReportCards({ data }: { data: BoatSharingReportData }) {
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Trips" value={data.trips} />
        <Stat label="Total guests" value={data.totalGuests} />
        <Stat label="Boat + Tempo cost" value={formatCurrencyINR(data.boatAmount + data.tempoAmount)} />
        <Stat
          label="Outstanding"
          value={formatCurrencyINR(data.outstanding)}
          tone={data.outstanding > 0 ? "critical" : undefined}
        />
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Per-party breakdown</CardTitle>
          <CardDescription>Automatic cost split across Flying Fish, Dive Goa and SEI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col divide-y divide-border">
            {data.partyTotals.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No data for this period.</p>
            ) : (
              data.partyTotals.map((p) => (
                <div key={p.partyName} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="font-medium">{p.partyName}</p>
                    <p className="text-xs text-muted-foreground">{p.guestCount} guests</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrencyINR(p.amountDue)}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatCurrencyINR(p.amountPaid)} paid
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: React.ReactNode;
  tone?: "critical";
}) {
  return (
    <div className="glass rounded-xl p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-semibold tabular-nums ${tone === "critical" ? "text-destructive" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export function ReportView({
  month,
  monthlyData,
  season,
  seasonData,
}: {
  month: string;
  monthlyData: BoatSharingReportData;
  season: { id: string; name: string } | null;
  seasonData: BoatSharingReportData | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setMonth(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("tab", "reports");
    params.set("month", value);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold">Monthly report</h3>
          <div className="flex items-center gap-2">
            <Input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-40"
            />
            <Button variant="outline" asChild>
              <a href={`/api/reports/boat-sharing?type=monthly&month=${month}`}>
                <Download className="size-4" /> Export Excel
              </a>
            </Button>
          </div>
        </div>
        <ReportCards data={monthlyData} />
      </div>

      {season ? (
        <div className="flex flex-col gap-3 border-t pt-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-base font-semibold">Season report — {season.name}</h3>
            <Button variant="outline" asChild>
              <a href={`/api/reports/boat-sharing?type=season&seasonId=${season.id}`}>
                <Download className="size-4" /> Export Excel
              </a>
            </Button>
          </div>
          {seasonData ? <ReportCards data={seasonData} /> : null}
        </div>
      ) : (
        <p className="border-t pt-6 text-sm text-muted-foreground">
          Mark a season active to see season-to-date boat sharing totals.
        </p>
      )}
    </div>
  );
}
