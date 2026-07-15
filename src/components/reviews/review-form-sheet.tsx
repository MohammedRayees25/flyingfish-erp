"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Pencil, X } from "lucide-react";
import { toast } from "sonner";
import { reviewSchema, type ReviewInput } from "@/lib/validations/reviews";
import { createReview, updateReview } from "@/actions/reviews";
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
import { StarRatingInput } from "@/components/reviews/star-rating";

const REPLY_STATUS_LABELS: Record<ReviewInput["replyStatus"], string> = {
  PENDING: "Pending",
  REPLIED: "Replied",
  NOT_NEEDED: "Not Needed",
};

const SENTIMENT_LABELS: Record<"POSITIVE" | "NEUTRAL" | "NEGATIVE", string> = {
  POSITIVE: "Positive",
  NEUTRAL: "Neutral",
  NEGATIVE: "Negative",
};

type ReviewForEdit = {
  id: string;
  reviewerName: string;
  guestId: string | null;
  guest: { fullName: string; phone: string } | null;
  rating: number;
  reviewText: string | null;
  reviewDate: Date;
  replyStatus: ReviewInput["replyStatus"];
  instructorMentionedId: string | null;
  sentiment: "POSITIVE" | "NEUTRAL" | "NEGATIVE" | null;
};

export function ReviewFormSheet({
  mode,
  review,
  instructors,
}: {
  mode: "create" | "edit";
  review?: ReviewForEdit;
  instructors: { id: string; fullName: string }[];
}) {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [guestLabel, setGuestLabel] = React.useState(
    review?.guest ? `${review.guest.fullName} · ${review.guest.phone}` : ""
  );
  const router = useRouter();

  const defaultValues: ReviewInput = review
    ? {
        reviewerName: review.reviewerName,
        guestId: review.guestId ?? "",
        rating: review.rating,
        reviewText: review.reviewText ?? "",
        reviewDate: review.reviewDate.toISOString().slice(0, 10),
        replyStatus: review.replyStatus,
        instructorMentionedId: review.instructorMentionedId ?? "",
        sentiment: review.sentiment ?? "",
      }
    : {
        reviewerName: "",
        guestId: "",
        rating: 5,
        reviewText: "",
        reviewDate: new Date().toISOString().slice(0, 10),
        replyStatus: "PENDING",
        instructorMentionedId: "",
        sentiment: "",
      };

  const form = useForm<ReviewInput>({
    resolver: zodResolver(reviewSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) {
      form.reset(defaultValues);
      setGuestLabel(review?.guest ? `${review.guest.fullName} · ${review.guest.phone}` : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(data: ReviewInput) {
    setServerError(null);
    const result = mode === "create" ? await createReview(data) : await updateReview(review!.id, data);

    if (result?.error) {
      setServerError(result.error);
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof ReviewInput, { message });
        });
      }
      return;
    }

    toast.success(mode === "create" ? "Review added" : "Review updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus /> Add Review
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Edit review">
            <Pencil className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "Add Review" : "Edit Review"}</SheetTitle>
          <SheetDescription>
            Log a Google review, link it to a guest and instructor, and track reply status.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4 pb-4">
            <FormField
              control={form.control}
              name="reviewerName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reviewer name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="guestId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Linked guest (optional)</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <div className="flex-1">
                        <GuestCombobox
                          value={field.value ?? ""}
                          onChange={(id, guest) => {
                            field.onChange(id);
                            setGuestLabel(`${guest.fullName} · ${guest.phone}`);
                          }}
                          initialLabel={guestLabel}
                        />
                      </div>
                      {field.value ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label="Clear linked guest"
                          onClick={() => {
                            field.onChange("");
                            setGuestLabel("");
                          }}
                        >
                          <X className="size-4" />
                        </Button>
                      ) : null}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Rating</FormLabel>
                  <FormControl>
                    <StarRatingInput value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reviewText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Review text (optional)</FormLabel>
                  <FormControl>
                    <Textarea rows={4} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="reviewDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Review date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="replyStatus"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Reply status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(REPLY_STATUS_LABELS).map(([value, label]) => (
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
                name="instructorMentionedId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Instructor mentioned</FormLabel>
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
                name="sentiment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sentiment</FormLabel>
                    <Select
                      value={field.value || "auto"}
                      onValueChange={(v) => field.onChange(v === "auto" ? "" : v)}
                    >
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="auto">Auto (from rating)</SelectItem>
                        {Object.entries(SENTIMENT_LABELS).map(([value, label]) => (
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

            {serverError ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {serverError}
              </p>
            ) : null}

            <SheetFooter className="px-0">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {mode === "create" ? "Add review" : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
