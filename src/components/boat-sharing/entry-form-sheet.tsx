"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  boatSharingEntrySchema,
  type BoatSharingEntryInput,
} from "@/lib/validations/boat-sharing";
import { computeBoatSharingSplits } from "@/lib/boat-sharing";
import { createBoatSharingEntry, updateBoatSharingEntry } from "@/actions/boat-sharing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { formatCurrencyINR } from "@/lib/labels";

type Option = { id: string; name: string };

type EntryForEdit = {
  id: string;
  date: Date;
  boatId: string | null;
  boatVendorName: string | null;
  boatAmount: number;
  tempoAmount: number;
  ffGuests: number;
  dgGuests: number;
  seiGuests: number;
  notes: string | null;
};

function SplitPreview({ values }: { values: BoatSharingEntryInput }) {
  const splits = computeBoatSharingSplits(values);
  const total = values.boatAmount + values.tempoAmount;

  return (
    <div className="rounded-md border bg-muted/40 p-3 text-sm">
      <div className="mb-2 flex items-center justify-between font-medium">
        <span>Automatic cost split</span>
        <span>{formatCurrencyINR(total)}</span>
      </div>
      {splits.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Add guest counts to preview the per-party split.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {splits.map((s) => (
            <li key={s.partyName} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {s.partyName} ({s.guestCount} guest{s.guestCount === 1 ? "" : "s"})
              </span>
              <span className="font-medium tabular-nums">{formatCurrencyINR(s.amountDue)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function EntryFormSheet({
  mode,
  entry,
  boats,
}: {
  mode: "create" | "edit";
  entry?: EntryForEdit;
  boats: Option[];
}) {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const router = useRouter();

  const defaultValues: BoatSharingEntryInput = entry
    ? {
        date: entry.date.toISOString().slice(0, 10),
        boatId: entry.boatId ?? "",
        boatVendorName: entry.boatVendorName ?? "",
        boatAmount: entry.boatAmount,
        tempoAmount: entry.tempoAmount,
        ffGuests: entry.ffGuests,
        dgGuests: entry.dgGuests,
        seiGuests: entry.seiGuests,
        notes: entry.notes ?? "",
      }
    : {
        date: new Date().toISOString().slice(0, 10),
        boatId: "",
        boatVendorName: "",
        boatAmount: 0,
        tempoAmount: 0,
        ffGuests: 0,
        dgGuests: 0,
        seiGuests: 0,
        notes: "",
      };

  const form = useForm<BoatSharingEntryInput>({
    resolver: zodResolver(boatSharingEntrySchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const watched = useWatch({ control: form.control });

  async function onSubmit(data: BoatSharingEntryInput) {
    setServerError(null);
    const result =
      mode === "create"
        ? await createBoatSharingEntry(data)
        : await updateBoatSharingEntry(entry!.id, data);

    if (result?.error) {
      setServerError(result.error);
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof BoatSharingEntryInput, { message });
        });
      }
      return;
    }

    toast.success(mode === "create" ? "Boat sharing entry created" : "Entry updated");
    setOpen(false);
    router.refresh();
  }

  function numberField(name: keyof BoatSharingEntryInput, label: string) {
    return (
      <FormField
        control={form.control}
        name={name}
        render={({ field }) => (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={0}
                value={field.value as number}
                onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    );
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus /> New Entry
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Edit entry">
            <Pencil className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "New Boat Sharing Entry" : "Edit Entry"}</SheetTitle>
          <SheetDescription>
            Record a boat trip&apos;s cost and guest split across Flying Fish, Dive Goa and SEI.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="boatId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Boat</FormLabel>
                    <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {boats.map((b) => (
                          <SelectItem key={b.id} value={b.id}>
                            {b.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="boatVendorName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendor name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Goa Boatmen Co-op" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {numberField("boatAmount", "Boat amount (₹)")}
              {numberField("tempoAmount", "Tempo amount (₹)")}
            </div>

            <div className="grid grid-cols-3 gap-4">
              {numberField("ffGuests", "Flying Fish guests")}
              {numberField("dgGuests", "Dive Goa guests")}
              {numberField("seiGuests", "SEI guests")}
            </div>

            <SplitPreview values={{ ...defaultValues, ...watched } as BoatSharingEntryInput} />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
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
                {mode === "create" ? "Create entry" : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
