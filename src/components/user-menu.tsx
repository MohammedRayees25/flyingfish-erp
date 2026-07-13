"use client";

import { LogOut, User as UserIcon } from "lucide-react";
import { signOut } from "@/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu({
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
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full outline-none ring-ring/50 focus-visible:ring-2">
          <Avatar className="size-8">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={fullName} /> : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials(fullName)}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex flex-col">
          <span className="font-medium">{fullName}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <UserIcon />
          {ROLE_LABELS[role]}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onSelect={(e) => {
            e.preventDefault();
            void signOut();
          }}
        >
          <LogOut />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
