"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  certificationCourseSchema,
  type CertificationCourseInput,
} from "@/lib/validations/certifications";
import { createCertificationCourse, updateCertificationCourse } from "@/actions/certifications";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  CERTIFICATION_AGENCY_LABELS,
  type CertificationCourseRow,
} from "@/components/certifications/types";

export function CourseFormSheet({
  mode,
  course,
}: {
  mode: "create" | "edit";
  course?: CertificationCourseRow;
}) {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const router = useRouter();

  const defaultValues: CertificationCourseInput = course
    ? {
        name: course.name,
        agency: course.agency,
        track: course.track ?? "",
        price: course.price,
      }
    : {
        name: "",
        agency: "PADI",
        track: "",
        price: 0,
      };

  const form = useForm<CertificationCourseInput>({
    resolver: zodResolver(certificationCourseSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(data: CertificationCourseInput) {
    setServerError(null);
    const result =
      mode === "create"
        ? await createCertificationCourse(data)
        : await updateCertificationCourse(course!.id, data);

    if (result?.error) {
      setServerError(result.error);
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof CertificationCourseInput, { message });
        });
      }
      return;
    }

    toast.success(mode === "create" ? "Course created" : "Course updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus /> New Course
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Edit course">
            <Pencil className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "New Course" : "Edit Course"}</SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "Add a certification course to the catalog."
              : "Update this course's details."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4 pb-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Open Water Diver" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="agency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agency</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CERTIFICATION_AGENCY_LABELS).map(([value, label]) => (
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

            <FormField
              control={form.control}
              name="track"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Track (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Specialty, Professional" {...field} />
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
                {mode === "create" ? "Create course" : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
