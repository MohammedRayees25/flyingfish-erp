"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

export const BoatUtilizationChart = dynamic(
  () => import("./boat-utilization-chart").then((mod) => mod.BoatUtilizationChart),
  { ssr: false, loading: () => <Skeleton className="h-[140px] w-full" /> }
);
