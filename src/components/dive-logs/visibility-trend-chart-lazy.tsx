"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const VisibilityTrendChart = dynamic(
  () => import("./visibility-trend-chart").then((mod) => mod.VisibilityTrendChart),
  { ssr: false, loading: () => <Skeleton className="h-[220px] w-full" /> }
);
