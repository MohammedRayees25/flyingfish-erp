"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRating({ rating, className }: { rating: number; className?: string }) {
  return (
    <div
      className={cn("flex items-center gap-0.5", className)}
      aria-label={`${rating} out of 5 stars`}
    >
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "size-3.5",
            i < rating ? "fill-warning text-warning" : "fill-none text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

export function StarRatingInput({
  value,
  onChange,
  className,
}: {
  value: number;
  onChange: (rating: number) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-1", className)}>
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1;
        return (
          <button
            key={i}
            type="button"
            onClick={() => onChange(starValue)}
            aria-label={`${starValue} star${starValue === 1 ? "" : "s"}`}
            aria-pressed={value === starValue}
            className="rounded-sm p-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star
              className={cn(
                "size-6 transition-colors",
                starValue <= value
                  ? "fill-warning text-warning"
                  : "fill-none text-muted-foreground/30 hover:text-warning/60"
              )}
            />
          </button>
        );
      })}
      <span className="ml-2 text-sm text-muted-foreground tabular-nums">
        {value > 0 ? `${value} / 5` : "Select rating"}
      </span>
    </div>
  );
}
