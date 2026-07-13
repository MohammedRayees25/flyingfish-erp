"use client";

import Link from "next/link";
import { Menu, Waves } from "lucide-react";
import type { UserRole } from "@prisma/client";
import { CommandPalette } from "@/components/command-palette";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";
import { NAV_ITEMS } from "@/config/nav";
import { canAccess, type Module } from "@/lib/permissions";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function AppTopbar({
  fullName,
  email,
  role,
  avatarUrl,
}: {
  fullName: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
}) {
  const items = NAV_ITEMS.filter((item) => canAccess(role, item.module as Module));

  return (
    <header className="flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-sm sm:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 bg-sidebar p-0 text-sidebar-foreground">
          <SheetHeader className="h-16 flex-row items-center gap-2 border-b border-sidebar-border px-5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Waves className="size-4" />
            </div>
            <SheetTitle className="text-sidebar-foreground">
              Flying Fish
            </SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1 p-3">
            {items.map((item) => (
              <Link
                key={item.href}
                href={item.comingSoon ? "#" : item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              >
                <item.icon className="size-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 justify-center sm:justify-start">
        <CommandPalette role={role} />
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />
        <UserMenu
          fullName={fullName}
          email={email}
          role={role}
          avatarUrl={avatarUrl}
        />
      </div>
    </header>
  );
}
