"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { updateCompanySettings } from "@/actions/settings";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import type { CompanySettings } from "@prisma/client";

export function NotificationsTab({ settings }: { settings: CompanySettings }) {
  const router = useRouter();
  const [email, setEmail] = React.useState(settings.emailNotificationsEnabled);
  const [whatsapp, setWhatsapp] = React.useState(settings.whatsappNotificationsEnabled);
  const [saving, setSaving] = React.useState<"email" | "whatsapp" | null>(null);

  async function save(next: { emailNotificationsEnabled: boolean; whatsappNotificationsEnabled: boolean }) {
    const result = await updateCompanySettings({
      companyName: settings.companyName,
      logoUrl: settings.logoUrl ?? "",
      address: settings.address ?? "",
      gstNumber: settings.gstNumber ?? "",
      phone: settings.phone ?? "",
      email: settings.email ?? "",
      emailNotificationsEnabled: next.emailNotificationsEnabled,
      whatsappNotificationsEnabled: next.whatsappNotificationsEnabled,
    });
    if (result?.error) {
      toast.error(result.error);
      return false;
    }
    toast.success("Notification preferences saved");
    router.refresh();
    return true;
  }

  async function handleEmailChange(checked: boolean) {
    setEmail(checked);
    setSaving("email");
    const ok = await save({ emailNotificationsEnabled: checked, whatsappNotificationsEnabled: whatsapp });
    if (!ok) setEmail(!checked);
    setSaving(null);
  }

  async function handleWhatsappChange(checked: boolean) {
    setWhatsapp(checked);
    setSaving("whatsapp");
    const ok = await save({ emailNotificationsEnabled: email, whatsappNotificationsEnabled: checked });
    if (!ok) setWhatsapp(!checked);
    setSaving(null);
  }

  return (
    <div className="flex max-w-lg flex-col gap-6">
      <div className="flex items-center justify-between gap-4 rounded-md border p-4">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="email-notifications" className="text-sm font-medium">
            Email notifications
          </Label>
          <p className="text-sm text-muted-foreground">
            Send booking, payment and system emails to relevant staff.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving === "email" ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
          <Switch
            id="email-notifications"
            checked={email}
            disabled={saving !== null}
            onCheckedChange={handleEmailChange}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-4 rounded-md border p-4">
        <div className="flex flex-col gap-0.5">
          <Label htmlFor="whatsapp-notifications" className="text-sm font-medium">
            WhatsApp notifications
          </Label>
          <p className="text-sm text-muted-foreground">
            Send booking and payment reminders to guests over WhatsApp.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {saving === "whatsapp" ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
          <Switch
            id="whatsapp-notifications"
            checked={whatsapp}
            disabled={saving !== null}
            onCheckedChange={handleWhatsappChange}
          />
        </div>
      </div>
    </div>
  );
}
