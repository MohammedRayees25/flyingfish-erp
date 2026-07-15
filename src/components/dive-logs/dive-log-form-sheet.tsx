"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { diveLogSchema, type DiveLogInput } from "@/lib/validations/dive-logs";
import { createDiveLog, updateDiveLog } from "@/actions/dive-logs";
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
import { Separator } from "@/components/ui/separator";
import { DiveLogGuestPicker } from "@/components/dive-logs/dive-log-guest-picker";
import { PhotoUrlsField } from "@/components/dive-logs/photo-urls-field";
import type { GuestOption } from "@/actions/guests";

type Option = { id: string; fullName: string };

export type DiveLogWithRelations = {
  id: string;
  date: Date;
  diveSiteId: string | null;
  boatId: string | null;
  instructorId: string | null;
  entryTime: Date | null;
  exitTime: Date | null;
  bottomTimeMin: number | null;
  maxDepth: number | null;
  visibility: number | null;
  current: string | null;
  weather: string | null;
  temperature: number | null;
  equipmentUsed: string | null;
  cylinderType: string | null;
  weightsUsedKg: number | null;
  marineLifeSeen: string | null;
  problems: string | null;
  photoUrls: string[];
  notes: string | null;
  guests: { guest: GuestOption }[];
};

function emptyDefaults(): DiveLogInput {
  return {
    date: new Date().toISOString().slice(0, 10),
    diveSiteId: "",
    boatId: "",
    instructorId: "",
    entryTime: "",
    exitTime: "",
    bottomTimeMin: undefined,
    maxDepth: undefined,
    visibility: undefined,
    current: "",
    weather: "",
    temperature: undefined,
    equipmentUsed: "",
    cylinderType: "",
    weightsUsedKg: undefined,
    marineLifeSeen: "",
    problems: "",
    photoUrls: [],
    notes: "",
    guestIds: [],
  };
}

function defaultsFromLog(log: DiveLogWithRelations): DiveLogInput {
  return {
    date: log.date.toISOString().slice(0, 10),
    diveSiteId: log.diveSiteId ?? "",
    boatId: log.boatId ?? "",
    instructorId: log.instructorId ?? "",
    entryTime: log.entryTime ? log.entryTime.toISOString().slice(11, 16) : "",
    exitTime: log.exitTime ? log.exitTime.toISOString().slice(11, 16) : "",
    bottomTimeMin: log.bottomTimeMin ?? undefined,
    maxDepth: log.maxDepth ?? undefined,
    visibility: log.visibility ?? undefined,
    current: log.current ?? "",
    weather: log.weather ?? "",
    temperature: log.temperature ?? undefined,
    equipmentUsed: log.equipmentUsed ?? "",
    cylinderType: log.cylinderType ?? "",
    weightsUsedKg: log.weightsUsedKg ?? undefined,
    marineLifeSeen: log.marineLifeSeen ?? "",
    problems: log.problems ?? "",
    photoUrls: log.photoUrls ?? [],
    notes: log.notes ?? "",
    guestIds: log.guests.map((g) => g.guest.id),
  };
}

function numberField(value: number | undefined) {
  return value === undefined ? "" : value;
}

export function DiveLogFormSheet({
  mode,
  log,
  instructors,
  boats,
  diveSites,
}: {
  mode: "create" | "edit";
  log?: DiveLogWithRelations;
  instructors: Option[];
  boats: Option[];
  diveSites: Option[];
}) {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const router = useRouter();

  const defaultValues = log ? defaultsFromLog(log) : emptyDefaults();

  const form = useForm<DiveLogInput>({
    resolver: zodResolver(diveLogSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(data: DiveLogInput) {
    setServerError(null);
    const result = mode === "create" ? await createDiveLog(data) : await updateDiveLog(log!.id, data);

    if (result?.error) {
      setServerError(result.error);
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof DiveLogInput, { message });
        });
      }
      return;
    }

    toast.success(mode === "create" ? "Dive log created" : "Dive log updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus /> New Dive Log
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Edit dive log">
            <Pencil className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "New Dive Log" : "Edit Dive Log"}</SheetTitle>
          <SheetDescription>
            {mode === "create" ? "Record a new dive." : "Update this dive's details."}
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

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="entryTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entry time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="exitTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exit time</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="bottomTimeMin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bottom time (min)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={numberField(field.value)}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
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
                name="maxDepth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max depth (m)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.1"
                        value={numberField(field.value)}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
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
                name="visibility"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Visibility (m)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        value={numberField(field.value)}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
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
                name="temperature"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Water temp (°C)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        value={numberField(field.value)}
                        onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
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
                name="current"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Mild" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="weather"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Weather</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Sunny" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="equipmentUsed"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Equipment used</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Wetsuit, BCD, regulator" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cylinderType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cylinder type</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Aluminium 80" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="weightsUsedKg"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Weights used (kg)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      step="0.5"
                      value={numberField(field.value)}
                      onChange={(e) => field.onChange(e.target.value === "" ? undefined : e.target.valueAsNumber)}
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
              name="marineLifeSeen"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Fish spotted</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Marine life seen on this dive…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="problems"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Problems</FormLabel>
                  <FormControl>
                    <Textarea rows={2} placeholder="Any issues encountered…" {...field} />
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

            <Separator />

            <FormField
              control={form.control}
              name="photoUrls"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Photos</FormLabel>
                  <FormControl>
                    <PhotoUrlsField value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guestIds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Guests on this dive</FormLabel>
                  <FormControl>
                    <DiveLogGuestPicker
                      value={field.value}
                      onChange={field.onChange}
                      initialGuests={log?.guests.map((g) => g.guest)}
                    />
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
                {mode === "create" ? "Create dive log" : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
