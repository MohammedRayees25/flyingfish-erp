"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Download, Moon } from "lucide-react";
import { toast } from "sonner";
import { companySettingsSchema, type CompanySettingsInput } from "@/lib/validations/settings";
import { updateCompanySettings } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import type { CompanySettings } from "@prisma/client";

export function CompanyTab({ settings }: { settings: CompanySettings }) {
  const router = useRouter();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [exporting, setExporting] = React.useState(false);

  const defaultValues: CompanySettingsInput = {
    companyName: settings.companyName,
    logoUrl: settings.logoUrl ?? "",
    address: settings.address ?? "",
    gstNumber: settings.gstNumber ?? "",
    phone: settings.phone ?? "",
    email: settings.email ?? "",
    emailNotificationsEnabled: settings.emailNotificationsEnabled,
    whatsappNotificationsEnabled: settings.whatsappNotificationsEnabled,
  };

  const form = useForm<CompanySettingsInput>({
    resolver: zodResolver(companySettingsSchema),
    defaultValues,
  });

  async function onSubmit(data: CompanySettingsInput) {
    setServerError(null);
    const result = await updateCompanySettings(data);

    if (result?.error) {
      setServerError(result.error);
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof CompanySettingsInput, { message });
        });
      }
      return;
    }

    toast.success("Company settings saved");
    router.refresh();
  }

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch("/api/settings/export");
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `flying-fish-data-snapshot-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success("Data snapshot downloaded");
    } catch {
      toast.error("Could not export data snapshot");
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex max-w-2xl flex-col gap-4">
          <FormField
            control={form.control}
            name="companyName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="logoUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Logo URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://…" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Textarea rows={2} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="gstNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>GST number</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input type="email" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {serverError ? (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {serverError}
            </p>
          ) : null}

          <div>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Save changes
            </Button>
          </div>
        </form>
      </Form>

      <Separator />

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Appearance</h3>
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Moon className="size-4" />
          Dark / light mode is controlled from the theme toggle in the top bar and applies across
          the whole app.
        </p>
      </div>

      <Separator />

      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-medium">Data</h3>
        <p className="text-sm text-muted-foreground">
          Download a JSON snapshot with record counts for guests, bookings, finance transactions
          and users, plus an export timestamp.
        </p>
        <div>
          <Button type="button" variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
            Export data snapshot (JSON)
          </Button>
        </div>
      </div>
    </div>
  );
}
