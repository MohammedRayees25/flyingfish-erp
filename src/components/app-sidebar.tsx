"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Waves } from "lucide-react";
import { NAV_ITEMS } from "@/config/nav";
import { canAccess, type Module } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

export function AppSidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((item) => canAccess(role, item.module as Module));

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
      <div className="flex h-16 items-center gap-2 px-5">
        <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Waves className="size-4" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold">Flying Fish</p>
          <p className="text-[11px] text-sidebar-foreground/60">Scuba ERP</p>
        </div>
      </div>
      <ScrollArea className="flex-1 px-3">
        <nav className="flex flex-col gap-1 pb-4">
          {items.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.comingSoon ? "#" : item.href}
                aria-disabled={item.comingSoon}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                  item.comingSoon && "pointer-events-none opacity-40"
                )}
              >
                <item.icon className="size-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.comingSoon ? (
                  <Badge
                    variant="outline"
                    className="border-sidebar-border px-1.5 py-0 text-[10px] text-sidebar-foreground/50"
                  >
                    Soon
                  </Badge>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <div className="border-t border-sidebar-border p-3 text-[11px] text-sidebar-foreground/50">
        Flying Fish Scuba School ERP
      </div>
    </aside>
  );
}
