"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const TrendChart = dynamic(
  () => import("./trend-chart").then((mod) => mod.TrendChart),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> }
);
