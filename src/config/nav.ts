import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Users,
  CalendarCheck,
  Ship,
  ClipboardList,
  UserCog,
  Cookie,
  Waves,
  Award,
  Wallet,
  Star,
  Share2,
  Heart,
  FileBarChart,
  LineChart,
  Settings,
} from "lucide-react";
import type { Module } from "@/lib/permissions";

export type NavItem = {
  module: Module;
  label: string;
  href: string;
  icon: LucideIcon;
  comingSoon?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { module: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard },
  { module: "guests", label: "Guests", href: "/guests", icon: Users },
  {
    module: "bookings",
    label: "Bookings",
    href: "/bookings",
    icon: CalendarCheck,
  },
  {
    module: "boatSharing",
    label: "Boat Sharing",
    href: "/boat-sharing",
    icon: Ship,
  },
  {
    module: "staff",
    label: "Staff Attendance",
    href: "/staff",
    icon: ClipboardList,
  },
  {
    module: "freelancers",
    label: "Freelancers",
    href: "/freelancers",
    icon: UserCog,
  },
  {
    module: "snacks",
    label: "Novotel Snacks",
    href: "/snacks",
    icon: Cookie,
    comingSoon: true,
  },
  {
    module: "diveLogs",
    label: "Dive Logs",
    href: "/dive-logs",
    icon: Waves,
    comingSoon: true,
  },
  {
    module: "certifications",
    label: "Certifications",
    href: "/certifications",
    icon: Award,
    comingSoon: true,
  },
  {
    module: "finance",
    label: "Finance",
    href: "/finance",
    icon: Wallet,
  },
  {
    module: "reviews",
    label: "Google Reviews",
    href: "/reviews",
    icon: Star,
    comingSoon: true,
  },
  {
    module: "social",
    label: "Social Media",
    href: "/social",
    icon: Share2,
    comingSoon: true,
  },
  { module: "crm", label: "CRM", href: "/crm", icon: Heart, comingSoon: true },
  {
    module: "reports",
    label: "Reports",
    href: "/reports",
    icon: FileBarChart,
  },
  {
    module: "analytics",
    label: "Analytics",
    href: "/analytics",
    icon: LineChart,
  },
  {
    module: "settings",
    label: "Settings",
    href: "/settings",
    icon: Settings,
    comingSoon: true,
  },
];
