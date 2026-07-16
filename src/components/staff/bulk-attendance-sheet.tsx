"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import type { AttendanceStatus, User } from "@prisma/client";
import { bulkAttendanceSchema, type BulkAttendanceInput } from "@/lib/validations/staff";
import { bulkMarkAttendance } from "@/actions/staff-attendance";
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
import { ATTENDANCE_STATUS_LABELS } from "@/lib/labels";

const STATUS_OPTIONS: AttendanceStatus[] = ["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "HOLIDAY"];

export function BulkAttendanceSheet({
  staff,
  defaultDate,
}: {
  staff: Pick<User, "id" | "fullName">[];
  defaultDate?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const router = useRouter();

  const defaultValues: BulkAttendanceInput = {
    date: defaultDate ?? new Date().toISOString().slice(0, 10),
    status: "PRESENT",
    userIds: staff.map((s) => s.id),
    notes: "",
  };

  const form = useForm<BulkAttendanceInput>({
    resolver: zodResolver(bulkAttendanceSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedIds = form.watch("userIds");
  const allSelected = staff.length > 0 && selectedIds.length === staff.length;

  function toggleAll() {
    form.setValue("userIds", allSelected ? [] : staff.map((s) => s.id), {
      shouldValidate: true,
    });
  }

  function toggleOne(id: string) {
    const next = selectedIds.includes(id)
      ? selectedIds.filter((x) => x !== id)
      : [...selectedIds, id];
    form.setValue("userIds", next, { shouldValidate: true });
  }

  async function onSubmit(data: BulkAttendanceInput) {
    setServerError(null);
    const result = await bulkMarkAttendance(data);

    if (result?.error) {
      setServerError(result.error);
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof BulkAttendanceInput, { message });
        });
      }
      return;
    }

    toast.success(`Attendance marked for ${data.userIds.length} staff`);
    setOpen(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Users /> Bulk Attendance
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Bulk Attendance</SheetTitle>
          <SheetDescription>
            Mark the same status for several staff members on one date.
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
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {STATUS_OPTIONS.map((option) => (
                          <SelectItem key={option} value={option}>
                            {ATTENDANCE_STATUS_LABELS[option]}
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
              name="userIds"
              render={() => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Staff</FormLabel>
                    <Button type="button" variant="ghost" size="sm" onClick={toggleAll}>
                      {allSelected ? "Clear all" : "Select all"}
                    </Button>
                  </div>
                  <div className="flex max-h-60 flex-col gap-2 overflow-y-auto rounded-md border p-3">
                    {staff.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active staff found.</p>
                    ) : (
                      staff.map((member) => (
                        <label
                          key={member.id}
                          className="flex items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={selectedIds.includes(member.id)}
                            onCheckedChange={() => toggleOne(member.id)}
                          />
                          {member.fullName}
                        </label>
                      ))
                    )}
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
                    <Textarea rows={2} placeholder="Optional, applied to every selected staff member" {...field} />
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
                Mark attendance
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
