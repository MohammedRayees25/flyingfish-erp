"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { snackConsumptionSchema, type SnackConsumptionInput } from "@/lib/validations/snacks";
import { createSnackConsumption } from "@/actions/snacks";
import { GuestCombobox } from "@/components/guests/guest-combobox";
import type { GuestOption } from "@/actions/guests";
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

type ItemOption = { id: string; name: string; unit: string; currentStock: number };
type BoatOption = { id: string; name: string };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function SnackConsumptionFormSheet({
  items,
  boats,
}: {
  items: ItemOption[];
  boats: BoatOption[];
}) {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [guestLabel, setGuestLabel] = React.useState<string | undefined>(undefined);
  const router = useRouter();

  const defaultValues: SnackConsumptionInput = {
    itemId: "",
    date: todayIso(),
    quantity: 1,
    guestId: "",
    boatId: "",
    notes: "",
  };

  const form = useForm<SnackConsumptionInput>({
    resolver: zodResolver(snackConsumptionSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) {
      form.reset(defaultValues);
      setGuestLabel(undefined);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const itemId = form.watch("itemId");
  const selectedItem = items.find((i) => i.id === itemId);
  const guestId = form.watch("guestId");

  async function onSubmit(data: SnackConsumptionInput) {
    setServerError(null);
    const result = await createSnackConsumption(data);

    if (result?.error) {
      setServerError(result.error);
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof SnackConsumptionInput, { message });
        });
      }
      return;
    }

    toast.success("Consumption recorded");
    setOpen(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button disabled={items.length === 0}>
          <Plus /> Record Consumption
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Record Consumption</SheetTitle>
          <SheetDescription>Log snack stock used for a guest or boat trip.</SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4 pb-4">
            <FormField
              control={form.control}
              name="itemId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Item</FormLabel>
                  <Select value={field.value || undefined} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select an item…" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {items.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name} ({item.currentStock} {item.unit} in stock)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Quantity {selectedItem ? `(${selectedItem.unit})` : ""}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        step="1"
                        value={field.value}
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
            </div>

            <FormField
              control={form.control}
              name="guestId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guest (optional)</FormLabel>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <GuestCombobox
                        value={field.value ?? ""}
                        initialLabel={guestLabel}
                        onChange={(id, guest: GuestOption) => {
                          field.onChange(id);
                          setGuestLabel(`${guest.fullName} · ${guest.phone}`);
                        }}
                      />
                    </div>
                    {guestId ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Clear guest"
                        onClick={() => {
                          field.onChange("");
                          setGuestLabel(undefined);
                        }}
                      >
                        <X className="size-4" />
                      </Button>
                    ) : null}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="boatId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Boat (optional)</FormLabel>
                  <Select
                    value={field.value || "none"}
                    onValueChange={(v) => field.onChange(v === "none" ? "" : v)}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {boats.map((boat) => (
                        <SelectItem key={boat.id} value={boat.id}>
                          {boat.name}
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
                Record consumption
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
