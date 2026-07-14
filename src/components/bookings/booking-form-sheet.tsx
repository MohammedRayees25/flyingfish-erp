"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { bookingSchema, type BookingInput } from "@/lib/validations/booking";
import { createBooking, updateBooking } from "@/actions/bookings";
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
import { GuestCombobox } from "@/components/guests/guest-combobox";
import { ACTIVITY_LABELS, BOOKING_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/labels";
import type { PaymentStatus } from "@prisma/client";

type Option = { id: string; fullName: string };

type BookingWithGuest = {
  id: string;
  guestId: string;
  guest: { fullName: string; phone: string };
  instructorId: string | null;
  boatId: string | null;
  diveSiteId: string | null;
  activityType: BookingInput["activityType"];
  date: Date;
  status: BookingInput["status"];
  price: number;
  notes: string | null;
};

const PAYMENT_STATUS_OPTIONS: PaymentStatus[] = ["PENDING", "PARTIAL", "PAID"];

export function BookingFormSheet({
  mode,
  booking,
  instructors,
  boats,
  diveSites,
  activityRates,
  defaultDate,
  compactTrigger,
}: {
  mode: "create" | "edit";
  booking?: BookingWithGuest;
  instructors: Option[];
  boats: Option[];
  diveSites: Option[];
  activityRates: Record<string, number>;
  defaultDate?: string;
  compactTrigger?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = React.useState<PaymentStatus>("PENDING");
  const router = useRouter();

  const defaultValues: BookingInput = booking
    ? {
        guestId: booking.guestId,
        instructorId: booking.instructorId ?? "",
        boatId: booking.boatId ?? "",
        diveSiteId: booking.diveSiteId ?? "",
        activityType: booking.activityType,
        date: booking.date.toISOString().slice(0, 10),
        status: booking.status,
        price: booking.price,
        notes: booking.notes ?? "",
      }
    : {
        guestId: "",
        instructorId: "",
        boatId: "",
        diveSiteId: "",
        activityType: "FUN_DIVE",
        date: defaultDate ?? new Date().toISOString().slice(0, 10),
        status: "PENDING",
        price: activityRates.FUN_DIVE ?? 0,
        notes: "",
      };

  const form = useForm<BookingInput>({
    resolver: zodResolver(bookingSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(data: BookingInput) {
    setServerError(null);
    const result =
      mode === "create"
        ? await createBooking(data, paymentStatus)
        : await updateBooking(booking!.id, data, paymentStatus);

    if (result?.error) {
      setServerError(result.error);
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof BookingInput, { message });
        });
      }
      return;
    }

    toast.success(mode === "create" ? "Booking created" : "Booking updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {mode === "create" ? (
          compactTrigger ? (
            <Button variant="ghost" size="icon" className="size-5" aria-label="New booking">
              <Plus className="size-3.5" />
            </Button>
          ) : (
            <Button>
              <Plus /> New Booking
            </Button>
          )
        ) : (
          <Button variant="ghost" size="icon" aria-label="Edit booking">
            <Pencil className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "New Booking" : "Edit Booking"}</SheetTitle>
          <SheetDescription>
            {mode === "create" ? "Create a new activity booking." : "Update booking details."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4 pb-4">
            <FormField
              control={form.control}
              name="guestId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guest</FormLabel>
                  <FormControl>
                    <GuestCombobox
                      value={field.value}
                      onChange={(id) => field.onChange(id)}
                      initialLabel={
                        booking ? `${booking.guest.fullName} · ${booking.guest.phone}` : undefined
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="activityType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Activity</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      const rate = activityRates[value];
                      if (rate !== undefined && mode === "create") {
                        form.setValue("price", rate);
                      }
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(ACTIVITY_LABELS).map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
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
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="instructorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructor</FormLabel>
                    <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">Unassigned</SelectItem>
                        {instructors.map((i) => (
                          <SelectItem key={i.id} value={i.id}>
                            {i.fullName}
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
                            {b.fullName}
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
              name="diveSiteId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dive site</FormLabel>
                  <Select value={field.value || "none"} onValueChange={(v) => field.onChange(v === "none" ? "" : v)}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {diveSites.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.fullName}
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Booking status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(BOOKING_STATUS_LABELS).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormItem>
                <FormLabel>Payment status</FormLabel>
                <Select value={paymentStatus} onValueChange={(v) => setPaymentStatus(v as PaymentStatus)}>
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PAYMENT_STATUS_OPTIONS.map((value) => (
                      <SelectItem key={value} value={value}>
                        {PAYMENT_STATUS_LABELS[value]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FormItem>
            </div>

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
                {mode === "create" ? "Create booking" : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
