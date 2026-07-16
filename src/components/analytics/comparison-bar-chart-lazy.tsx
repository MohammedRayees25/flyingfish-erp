"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const ComparisonBarChart = dynamic(
  () => import("./comparison-bar-chart").then((mod) => mod.ComparisonBarChart),
  { ssr: false, loading: () => <Skeleton className="h-[280px] w-full" /> }
);
