"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, TriangleAlert, Pencil } from "lucide-react";
import type { Guest } from "@prisma/client";
import { guestSchema, type GuestInput } from "@/lib/validations/guest";
import { createGuest, updateGuest, findDuplicateGuests } from "@/actions/guests";
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
import { SWIMMING_STATUS_LABELS, CERTIFICATION_LEVEL_LABELS } from "@/lib/labels";

const defaultValues: GuestInput = {
  fullName: "",
  phone: "",
  email: "",
  nationality: "",
  emergencyContactName: "",
  emergencyContactPhone: "",
  medicalDeclaration: false,
  medicalNotes: "",
  swimmingStatus: "COMPETENT_SWIMMER",
  certificationLevel: "NONE",
  previousDives: 0,
  dateOfBirth: "",
  source: "",
  notes: "",
};

export function GuestFormSheet({
  mode,
  guest,
}: {
  mode: "create" | "edit";
  guest?: Guest;
}) {
  const [open, setOpen] = React.useState(false);
  const [isPending, startTransition] = React.useTransition();
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [duplicates, setDuplicates] = React.useState<Guest[]>([]);
  const router = useRouter();

  const form = useForm<GuestInput>({
    resolver: zodResolver(guestSchema),
    defaultValues: guest
      ? {
          fullName: guest.fullName,
          phone: guest.phone,
          email: guest.email ?? "",
          nationality: guest.nationality ?? "",
          emergencyContactName: guest.emergencyContactName ?? "",
          emergencyContactPhone: guest.emergencyContactPhone ?? "",
          medicalDeclaration: guest.medicalDeclaration,
          medicalNotes: guest.medicalNotes ?? "",
          swimmingStatus: guest.swimmingStatus,
          certificationLevel: guest.certificationLevel,
          previousDives: guest.previousDives,
          dateOfBirth: guest.dateOfBirth
            ? guest.dateOfBirth.toISOString().slice(0, 10)
            : "",
          source: guest.source ?? "",
          notes: guest.notes ?? "",
        }
      : defaultValues,
  });

  const phone = form.watch("phone");
  const fullName = form.watch("fullName");

  React.useEffect(() => {
    if (!open) return;
    if (phone.trim().length < 5 && fullName.trim().length < 3) {
      setDuplicates([]);
      return;
    }
    const timeout = setTimeout(() => {
      startTransition(async () => {
        const matches = await findDuplicateGuests(phone, fullName);
        setDuplicates(matches.filter((m) => m.id !== guest?.id));
      });
    }, 400);
    return () => clearTimeout(timeout);
  }, [phone, fullName, open, guest?.id]);

  async function onSubmit(data: GuestInput) {
    setServerError(null);
    const result =
      mode === "create"
        ? await createGuest(data)
        : await updateGuest(guest!.id, data);

    if (result?.error) {
      setServerError(result.error);
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof GuestInput, { message });
        });
      }
      return;
    }

    setOpen(false);
    form.reset(mode === "create" ? defaultValues : data);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus /> Add Guest
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Pencil /> Edit
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "Add Guest" : "Edit Guest"}</SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "Create a new guest record."
              : "Update guest details."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4 px-4 pb-4"
          >
            {isPending ? (
              <p className="text-xs text-muted-foreground">Checking for duplicates…</p>
            ) : null}
            {duplicates.length > 0 ? (
              <div className="flex flex-col gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm">
                <p className="flex items-center gap-2 font-medium text-warning-foreground">
                  <TriangleAlert className="size-4 text-warning" />
                  Possible duplicate guest{duplicates.length > 1 ? "s" : ""}
                </p>
                <ul className="flex flex-col gap-1">
                  {duplicates.map((d) => (
                    <li key={d.id}>
                      <Link
                        href={`/guests/${d.id}`}
                        target="_blank"
                        className="underline underline-offset-2"
                      >
                        {d.fullName}
                      </Link>{" "}
                      <span className="text-muted-foreground">· {d.phone}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

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
                name="nationality"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nationality</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dateOfBirth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="emergencyContactName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency contact name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="emergencyContactPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Emergency contact phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="swimmingStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Swimming status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(SWIMMING_STATUS_LABELS).map(([value, label]) => (
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
              <FormField
                control={form.control}
                name="certificationLevel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certification level</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CERTIFICATION_LEVEL_LABELS).map(([value, label]) => (
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
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="previousDives"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Previous dives</FormLabel>
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
              <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Source</FormLabel>
                    <FormControl>
                      <Input placeholder="Walk-in, website, agent…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="medicalDeclaration"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Guest has declared a medical condition
                  </FormLabel>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="medicalNotes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Medical notes</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
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
                {form.formState.isSubmitting ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : null}
                {mode === "create" ? "Create guest" : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
