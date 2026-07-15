import type { LeadStage } from "@prisma/client";

// Fixed pipeline order — used for the Kanban board, the funnel chart and the
// stage <Select> everywhere in the CRM module so the ordering is always
// consistent (do not derive this from Object.keys, enum member order in
// generated JS is not guaranteed).
export const LEAD_STAGE_ORDER: LeadStage[] = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "BOOKED",
  "COMPLETED",
  "LOST",
];

export const LEAD_STAGE_LABELS: Record<LeadStage, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  INTERESTED: "Interested",
  BOOKED: "Booked",
  COMPLETED: "Completed",
  LOST: "Lost",
};

export const LEAD_STAGE_BADGE_VARIANT: Record<
  LeadStage,
  "default" | "secondary" | "outline" | "success" | "warning" | "destructive"
> = {
  NEW: "outline",
  CONTACTED: "secondary",
  INTERESTED: "warning",
  BOOKED: "default",
  COMPLETED: "success",
  LOST: "destructive",
};
