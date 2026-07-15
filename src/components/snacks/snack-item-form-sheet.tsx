"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { snackItemSchema, type SnackItemInput } from "@/lib/validations/snacks";
import { createSnackItem, updateSnackItem } from "@/actions/snacks";
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

export type SnackItemScalar = {
  id: string;
  name: string;
  unit: string;
  costPerUnit: number;
  reorderLevel: number;
  isActive: boolean;
};

const defaultValues: SnackItemInput = {
  name: "",
  unit: "",
  costPerUnit: 0,
  reorderLevel: 10,
  isActive: true,
};

export function SnackItemFormSheet({
  mode,
  item,
}: {
  mode: "create" | "edit";
  item?: SnackItemScalar;
}) {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const router = useRouter();

  const form = useForm<SnackItemInput>({
    resolver: zodResolver(snackItemSchema),
    defaultValues: item
      ? {
          name: item.name,
          unit: item.unit,
          costPerUnit: item.costPerUnit,
          reorderLevel: item.reorderLevel,
          isActive: item.isActive,
        }
      : defaultValues,
  });

  React.useEffect(() => {
    if (open) {
      form.reset(
        item
          ? {
              name: item.name,
              unit: item.unit,
              costPerUnit: item.costPerUnit,
              reorderLevel: item.reorderLevel,
              isActive: item.isActive,
            }
          : defaultValues
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(data: SnackItemInput) {
    setServerError(null);
    const result = mode === "create" ? await createSnackItem(data) : await updateSnackItem(item!.id, data);

    if (result?.error) {
      setServerError(result.error);
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof SnackItemInput, { message });
        });
      }
      return;
    }

    toast.success(mode === "create" ? "Snack item added" : "Snack item updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus /> Add Item
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Edit item">
            <Pencil className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "Add Snack Item" : "Edit Snack Item"}</SheetTitle>
          <SheetDescription>
            {mode === "create" ? "Create a new snack inventory item." : "Update item details."}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4 pb-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Chicken Sandwich, Cold Drink…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="unit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Unit</FormLabel>
                    <FormControl>
                      <Input placeholder="box, piece, bottle…" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="costPerUnit"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cost per unit (₹)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step="0.01"
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
              name="reorderLevel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reorder level</FormLabel>
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
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
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
                {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {mode === "create" ? "Add item" : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
