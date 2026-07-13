import { requireUser } from "@/lib/auth/current-user";
import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <div className="flex h-svh overflow-hidden">
      <AppSidebar role={user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <AppTopbar
          fullName={user.fullName}
          email={user.email}
          role={user.role}
          avatarUrl={user.avatarUrl}
        />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
