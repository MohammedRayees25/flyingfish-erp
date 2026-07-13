import { Waves } from "lucide-react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-sidebar via-background to-background p-6">
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-40 [background:radial-gradient(circle_at_20%_20%,_oklch(0.55_0.14_220_/_25%),_transparent_45%),radial-gradient(circle_at_80%_70%,_oklch(0.7_0.14_195_/_20%),_transparent_45%)]" />
      <div className="w-full max-w-sm space-y-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
            <Waves className="size-6" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">
            Flying Fish Scuba School
          </h1>
          <p className="text-sm text-muted-foreground">
            Sign in to the operations ERP
          </p>
        </div>
        <div className="glass rounded-xl p-6 shadow-xl">
          <LoginForm />
        </div>
        <p className="text-center text-xs text-muted-foreground">
          Access is by invitation only. Contact a Super Admin if you need an
          account.
        </p>
      </div>
    </div>
  );
}
