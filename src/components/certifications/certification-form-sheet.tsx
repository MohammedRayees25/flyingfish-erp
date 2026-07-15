"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  guestCertificationSchema,
  type GuestCertificationInput,
} from "@/lib/validations/certifications";
import { createGuestCertification, updateGuestCertification } from "@/actions/certifications";
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
import { GuestCombobox } from "@/components/guests/guest-combobox";
import { CERTIFICATION_STATUS_LABELS } from "@/lib/labels";
import {
  CERTIFICATION_AGENCY_LABELS,
  type CertificationRow,
  type CourseOption,
  type InstructorOption,
} from "@/components/certifications/certifications-table";

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function toDateInputValue(date: Date | null): string {
  if (!date) return "";
  return date.toISOString().slice(0, 10);
}

export function CertificationFormSheet({
  mode,
  certification,
  courses,
  instructors,
}: {
  mode: "create" | "edit";
  certification?: CertificationRow;
  courses: CourseOption[];
  instructors: InstructorOption[];
}) {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const router = useRouter();

  const defaultValues: GuestCertificationInput = certification
    ? {
        guestId: certification.guestId,
        courseId: certification.courseId,
        instructorId: certification.instructorId ?? "",
        status: certification.status,
        progress: certification.progress,
        theoryCompletedAt: toDateInputValue(certification.theoryCompletedAt),
        poolCompletedAt: toDateInputValue(certification.poolCompletedAt),
        openWaterDivesCompleted: certification.openWaterDivesCompleted,
        openWaterDivesRequired: certification.openWaterDivesRequired,
        examPassedAt: toDateInputValue(certification.examPassedAt),
        certificateNumber: certification.certificateNumber ?? "",
        startDate: toDateInputValue(certification.startDate),
        completionDate: toDateInputValue(certification.completionDate),
        issueDate: toDateInputValue(certification.issueDate),
        notes: certification.notes ?? "",
      }
    : {
        guestId: "",
        courseId: courses[0]?.id ?? "",
        instructorId: "",
        status: "NOT_STARTED",
        progress: 0,
        theoryCompletedAt: "",
        poolCompletedAt: "",
        openWaterDivesCompleted: 0,
        openWaterDivesRequired: 4,
        examPassedAt: "",
        certificateNumber: "",
        startDate: "",
        completionDate: "",
        issueDate: "",
        notes: "",
      };

  const form = useForm<GuestCertificationInput>({
    resolver: zodResolver(guestCertificationSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(data: GuestCertificationInput) {
    setServerError(null);
    const result =
      mode === "create"
        ? await createGuestCertification(data)
        : await updateGuestCertification(certification!.id, data);

    if (result?.error) {
      setServerError(result.error);
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof GuestCertificationInput, { message });
        });
      }
      return;
    }

    toast.success(mode === "create" ? "Certification created" : "Certification updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus /> New Certification
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Edit certification">
            <Pencil className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "New Certification" : "Edit Certification"}</SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "Enroll a guest into a certification course and track their progress."
              : "Update this guest's certification progress."}
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
                        certification
                          ? `${certification.guestName} · ${certification.guestPhone}`
                          : undefined
                      }
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="courseId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a course" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {courses.length === 0 ? (
                        <div className="px-2 py-1.5 text-sm text-muted-foreground">
                          No courses yet — add one in the Courses tab.
                        </div>
                      ) : (
                        courses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} · {CERTIFICATION_AGENCY_LABELS[c.agency]}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="instructorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructor</FormLabel>
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
                        {Object.entries(CERTIFICATION_STATUS_LABELS).map(([value, label]) => (
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

            <FormField
              control={form.control}
              name="progress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Progress (%)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={0}
                      max={100}
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

            <div className="flex flex-col gap-2 rounded-md border p-3">
              <p className="text-sm font-medium">Course checklist</p>

              <FormField
                control={form.control}
                name="theoryCompletedAt"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(checked) => field.onChange(checked ? todayISO() : "")}
                      />
                    </FormControl>
                    <FormLabel className="flex-1 font-normal">
                      Theory completed
                      {field.value ? (
                        <span className="ml-2 text-xs text-muted-foreground">{field.value}</span>
                      ) : null}
                    </FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="poolCompletedAt"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(checked) => field.onChange(checked ? todayISO() : "")}
                      />
                    </FormControl>
                    <FormLabel className="flex-1 font-normal">
                      Pool / confined water completed
                      {field.value ? (
                        <span className="ml-2 text-xs text-muted-foreground">{field.value}</span>
                      ) : null}
                    </FormLabel>
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4 pt-1">
                <FormField
                  control={form.control}
                  name="openWaterDivesCompleted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Open water dives done</FormLabel>
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
                  name="openWaterDivesRequired"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dives required</FormLabel>
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

              <FormField
                control={form.control}
                name="examPassedAt"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center gap-2 space-y-0 pt-1">
                    <FormControl>
                      <Checkbox
                        checked={!!field.value}
                        onCheckedChange={(checked) => field.onChange(checked ? todayISO() : "")}
                      />
                    </FormControl>
                    <FormLabel className="flex-1 font-normal">
                      Exam passed
                      {field.value ? (
                        <span className="ml-2 text-xs text-muted-foreground">{field.value}</span>
                      ) : null}
                    </FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="certificateNumber"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Certificate number</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. PADI-123456" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="completionDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Completion date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="issueDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Issue date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                {mode === "create" ? "Create certification" : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
