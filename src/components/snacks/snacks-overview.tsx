import { format } from "date-fns";
import { Cookie, Wallet, AlertTriangle, Activity, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyINR } from "@/lib/labels";

export type LowStockItem = {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  reorderLevel: number;
};

export type RecentActivityEntry = {
  id: string;
  kind: "purchase" | "consumption";
  date: Date;
  itemName: string;
  quantity: number;
  unit: string;
  detail: string | null;
};

export function SnacksOverview({
  todayConsumptionQty,
  monthPurchaseCost,
  lowStockItems,
  recentActivity,
}: {
  todayConsumptionQty: number;
  monthPurchaseCost: number;
  lowStockItems: LowStockItem[];
  recentActivity: RecentActivityEntry[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard label="Today's Consumption" value={todayConsumptionQty} icon={Cookie} />
        <StatCard
          label="This Month's Purchase Cost"
          value={formatCurrencyINR(monthPurchaseCost)}
          icon={Wallet}
        />
        <StatCard
          label="Low Stock Items"
          value={lowStockItems.length}
          icon={AlertTriangle}
          tone={lowStockItems.length > 0 ? "warning" : "default"}
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-warning" /> Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            {lowStockItems.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                All items are stocked above their reorder level.
              </p>
            ) : (
              <ul className="flex flex-col divide-y">
                {lowStockItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Reorder level: {item.reorderLevel} {item.unit}
                      </p>
                    </div>
                    <Badge variant="destructive">
                      {item.currentStock} {item.unit} left
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="size-4 text-primary" /> Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No purchases or consumption recorded yet.
              </p>
            ) : (
              <ul className="flex flex-col divide-y">
                {recentActivity.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {entry.kind === "purchase" ? (
                        <ArrowDownCircle className="size-4 shrink-0 text-success" />
                      ) : (
                        <ArrowUpCircle className="size-4 shrink-0 text-destructive" />
                      )}
                      <div>
                        <p className="text-sm font-medium">
                          {entry.itemName}
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            {entry.kind === "purchase" ? "purchased" : "consumed"}
                          </span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(entry.date, "d MMM yyyy")}
                          {entry.detail ? ` · ${entry.detail}` : ""}
                        </p>
                      </div>
                    </div>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {entry.quantity} {entry.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
