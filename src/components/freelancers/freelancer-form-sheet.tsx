"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Pencil } from "lucide-react";
import { freelancerSchema, type FreelancerInput } from "@/lib/validations/freelancer";
import { createFreelancer, updateFreelancer } from "@/actions/freelancers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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

export type FreelancerScalar = {
  id: string;
  fullName: string;
  role: string;
  phone: string | null;
  dayRate: number;
  isActive: boolean;
};

const defaultValues: FreelancerInput = {
  fullName: "",
  role: "",
  phone: "",
  dayRate: 0,
  isActive: true,
};

export function FreelancerFormSheet({
  mode,
  freelancer,
}: {
  mode: "create" | "edit";
  freelancer?: FreelancerScalar;
}) {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const router = useRouter();

  const form = useForm<FreelancerInput>({
    resolver: zodResolver(freelancerSchema),
    defaultValues: freelancer
      ? {
          fullName: freelancer.fullName,
          role: freelancer.role,
          phone: freelancer.phone ?? "",
          dayRate: freelancer.dayRate,
          isActive: freelancer.isActive,
        }
      : defaultValues,
  });

  async function onSubmit(data: FreelancerInput) {
    setServerError(null);
    const result =
      mode === "create"
        ? await createFreelancer(data)
        : await updateFreelancer(freelancer!.id, data);

    if (result?.error) {
      setServerError(result.error);
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof FreelancerInput, { message });
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
            <Plus /> Add Freelancer
          </Button>
        ) : (
          <Button variant="outline" size="sm">
            <Pencil /> Edit
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "Add Freelancer" : "Edit Freelancer"}</SheetTitle>
          <SheetDescription>
            {mode === "create"
              ? "Create a new freelancer record."
              : "Update freelancer details."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4 px-4 pb-4"
          >
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

            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <FormControl>
                    <Input placeholder="Dive Guide, Photographer, Boat Captain…" {...field} />
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
                name="dayRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day rate (₹)</FormLabel>
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
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-2">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">Active</FormLabel>
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
                {mode === "create" ? "Create freelancer" : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
