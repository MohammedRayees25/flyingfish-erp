import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  icon: Icon,
  subtext,
  tone = "default",
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon: LucideIcon;
  subtext?: React.ReactNode;
  tone?: "default" | "warning" | "critical";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass flex flex-col gap-3 rounded-xl p-4 transition-shadow hover:shadow-md",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <div
          className={cn(
            "flex size-8 items-center justify-center rounded-lg",
            tone === "critical"
              ? "bg-destructive/10 text-destructive"
              : tone === "warning"
                ? "bg-warning/15 text-warning"
                : "bg-primary/10 text-primary"
          )}
        >
          <Icon className="size-4" />
        </div>
      </div>
      <div className="text-2xl font-semibold tracking-tight tabular-nums">
        {value}
      </div>
      {subtext ? (
        <p className="text-xs text-muted-foreground">{subtext}</p>
      ) : null}
    </div>
  );
}
