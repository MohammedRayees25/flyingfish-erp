"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { LeadStage } from "@prisma/client";
import { leadSchema, type LeadInput } from "@/lib/validations/crm";
import { LEAD_STAGE_ORDER, LEAD_STAGE_LABELS } from "@/lib/crm-labels";
import { createLead, updateLead } from "@/actions/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { LeadCombobox } from "@/components/crm/lead-combobox";
import { GuestCombobox } from "@/components/guests/guest-combobox";

export type LeadForEdit = {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  source: string | null;
  stage: LeadStage;
  assignedToId: string | null;
  followUpAt: Date | null;
  isRepeatCustomer: boolean;
  referredById: string | null;
  referredByName: string | null;
  guestId: string | null;
  guestName: string | null;
  notes: string | null;
};

const UNASSIGNED = "UNASSIGNED";

const emptyValues: LeadInput = {
  fullName: "",
  phone: "",
  email: "",
  source: "",
  stage: "NEW",
  assignedToId: "",
  followUpAt: "",
  isRepeatCustomer: false,
  referredById: "",
  guestId: "",
  notes: "",
};

export function LeadFormSheet({
  mode,
  lead,
  staffOptions,
}: {
  mode: "create" | "edit";
  lead?: LeadForEdit;
  staffOptions: { id: string; fullName: string }[];
}) {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [guestResetKey, setGuestResetKey] = React.useState(0);
  const router = useRouter();

  const defaultValues: LeadInput = lead
    ? {
        fullName: lead.fullName,
        phone: lead.phone,
        email: lead.email ?? "",
        source: lead.source ?? "",
        stage: lead.stage,
        assignedToId: lead.assignedToId ?? "",
        followUpAt: lead.followUpAt ? format(lead.followUpAt, "yyyy-MM-dd'T'HH:mm") : "",
        isRepeatCustomer: lead.isRepeatCustomer,
        referredById: lead.referredById ?? "",
        guestId: lead.guestId ?? "",
        notes: lead.notes ?? "",
      }
    : emptyValues;

  const form = useForm<LeadInput>({
    resolver: zodResolver(leadSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) {
      form.reset(defaultValues);
      setGuestResetKey((k) => k + 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(data: LeadInput) {
    setServerError(null);
    const result = mode === "create" ? await createLead(data) : await updateLead(lead!.id, data);

    if (result?.error) {
      setServerError(result.error);
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof LeadInput, { message });
        });
      }
      return;
    }

    toast.success(mode === "create" ? "Lead created" : "Lead updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus /> Add Lead
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Edit lead">
            <Pencil className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "Add Lead" : "Edit Lead"}</SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "Capture a new lead in the pipeline."
              : "Update lead details."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4 pb-4">
            <FormField
              control={form.control}
              name="fullName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <FormControl>
                      <Input placeholder="Instagram, Referral, Walk-in…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stage</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LEAD_STAGE_ORDER.map((s) => (
                          <SelectItem key={s} value={s}>
                            {LEAD_STAGE_LABELS[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assignedToId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assigned to</FormLabel>
                    <Select
                      value={field.value || UNASSIGNED}
                      onValueChange={(v) => field.onChange(v === UNASSIGNED ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                        {staffOptions.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="followUpAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Follow-up</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="isRepeatCustomer"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">Repeat customer</FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="referredById"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Referred by</FormLabel>
                  <FormControl>
                    <LeadCombobox
                      value={field.value || ""}
                      onChange={(id) => field.onChange(id)}
                      initialLabel={lead?.referredByName ?? undefined}
                      excludeId={lead?.id}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guestId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Linked guest</FormLabel>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <FormControl>
                        <GuestCombobox
                          key={guestResetKey}
                          value={field.value || ""}
                          onChange={(id) => field.onChange(id)}
                          initialLabel={lead?.guestName ?? undefined}
                        />
                      </FormControl>
                    </div>
                    {field.value ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          field.onChange("");
                          setGuestResetKey((k) => k + 1);
                        }}
                      >
                        Clear
                      </Button>
                    ) : null}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
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

            <SheetFooter className="px-0">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {mode === "create" ? "Create lead" : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
