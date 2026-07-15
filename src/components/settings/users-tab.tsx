"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserRole, toggleUserActive } from "@/actions/settings";
import { formatCurrencyINR } from "@/lib/labels";
import { ROLE_LABELS } from "@/lib/permissions";
import type { UserRole } from "@prisma/client";

export type SettingsUserRow = {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatarUrl: string | null;
  isActive: boolean;
  monthlySalary: number;
};

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

function UserRow({ user, isSelf }: { user: SettingsUserRow; isSelf: boolean }) {
  const router = useRouter();
  const [role, setRole] = React.useState<UserRole>(user.role);
  const [isActive, setIsActive] = React.useState(user.isActive);
  const [savingRole, setSavingRole] = React.useState(false);
  const [savingActive, setSavingActive] = React.useState(false);

  async function handleRoleChange(next: UserRole) {
    const prev = role;
    setRole(next);
    setSavingRole(true);
    const result = await updateUserRole(user.id, next);
    setSavingRole(false);
    if (result?.error) {
      toast.error(result.error);
      setRole(prev);
      return;
    }
    toast.success(`${user.fullName}'s role updated`);
    router.refresh();
  }

  async function handleActiveChange(next: boolean) {
    const prev = isActive;
    setIsActive(next);
    setSavingActive(true);
    const result = await toggleUserActive(user.id, next);
    setSavingActive(false);
    if (result?.error) {
      toast.error(result.error);
      setIsActive(prev);
      return;
    }
    toast.success(`${user.fullName} ${next ? "reactivated" : "deactivated"}`);
    router.refresh();
  }

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="size-8">
            {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt={user.fullName} /> : null}
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-medium">
              {user.fullName}
              {isSelf ? <span className="ml-1.5 text-xs text-muted-foreground">(you)</span> : null}
            </span>
            <span className="text-xs text-muted-foreground">{user.email}</span>
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{user.phone ?? "—"}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Select value={role} onValueChange={(v) => handleRoleChange(v as UserRole)} disabled={savingRole}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(ROLE_LABELS) as UserRole[]).map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_LABELS[r]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {savingRole ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground tabular-nums">
        {formatCurrencyINR(user.monthlySalary)}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Switch checked={isActive} disabled={savingActive} onCheckedChange={handleActiveChange} />
          {savingActive ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
        </div>
      </TableCell>
    </TableRow>
  );
}

export function UsersTab({
  users,
  currentUserId,
}: {
  users: SettingsUserRow[];
  currentUserId: string | null;
}) {
  const [search, setSearch] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) => u.fullName.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  }, [users, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          placeholder="Search name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-8"
        />
      </div>

      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Monthly salary</TableHead>
              <TableHead>Active</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((u) => <UserRow key={u.id} user={u} isSelf={u.id === currentUserId} />)
            )}
          </TableBody>
        </Table>
      </div>
      <p className="text-xs text-muted-foreground">
        Monthly salary is managed from Finance &gt; Staff Salary and shown here read-only.
      </p>
    </div>
  );
}
