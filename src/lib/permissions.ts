import { UserRole } from "@prisma/client";

export const MODULES = [
  "dashboard",
  "guests",
  "bookings",
  "boatSharing",
  "staff",
  "freelancers",
  "snacks",
  "diveLogs",
  "certifications",
  "finance",
  "reviews",
  "social",
  "crm",
  "reports",
  "analytics",
  "settings",
] as const;

export type Module = (typeof MODULES)[number];

const ALL_MODULES: Module[] = [...MODULES];

// Which modules each role can see/access. This is a coarse, module-level
// gate for navigation and route protection — finer-grained (per-record)
// authorization happens in the data layer.
export const ROLE_PERMISSIONS: Record<UserRole, Module[]> = {
  SUPER_ADMIN: ALL_MODULES,
  FOUNDER: ALL_MODULES,
  MANAGER: [
    "dashboard",
    "guests",
    "bookings",
    "boatSharing",
    "staff",
    "freelancers",
    "snacks",
    "diveLogs",
    "certifications",
    "reviews",
    "social",
    "crm",
    "reports",
    "analytics",
  ],
  INSTRUCTOR: ["dashboard", "guests", "bookings", "diveLogs", "certifications"],
  MARKETING: ["dashboard", "guests", "reviews", "social", "crm", "reports", "analytics"],
  ACCOUNTANT: [
    "dashboard",
    "guests",
    "finance",
    "boatSharing",
    "freelancers",
    "reports",
    "analytics",
  ],
};

export function canAccess(role: UserRole, module: Module): boolean {
  return ROLE_PERMISSIONS[role]?.includes(module) ?? false;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  SUPER_ADMIN: "Super Admin",
  FOUNDER: "Founder",
  MANAGER: "Manager",
  INSTRUCTOR: "Instructor",
  MARKETING: "Marketing",
  ACCOUNTANT: "Accountant",
};
