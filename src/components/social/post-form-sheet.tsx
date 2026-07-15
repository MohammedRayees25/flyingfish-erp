"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Pencil } from "lucide-react";
import { toast } from "sonner";
import { socialPostSchema, type SocialPostInput } from "@/lib/validations/social";
import { createSocialPost, updateSocialPost } from "@/actions/social";
import { PLATFORM_LABELS, SOCIAL_PLATFORMS } from "@/components/social/platform-meta";
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

type PostForEdit = {
  id: string;
  platform: SocialPostInput["platform"];
  postDate: Date;
  url: string | null;
  caption: string | null;
  isReel: boolean;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  reach: number;
  leadsGenerated: number;
};

const METRIC_FIELDS = [
  { name: "views", label: "Views" },
  { name: "likes", label: "Likes" },
  { name: "comments", label: "Comments" },
  { name: "shares", label: "Shares" },
  { name: "saves", label: "Saves" },
  { name: "reach", label: "Reach" },
  { name: "leadsGenerated", label: "Leads generated" },
] as const;

export function PostFormSheet({
  mode,
  post,
}: {
  mode: "create" | "edit";
  post?: PostForEdit;
}) {
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const router = useRouter();

  const defaultValues: SocialPostInput = post
    ? {
        platform: post.platform,
        postDate: post.postDate.toISOString().slice(0, 10),
        url: post.url ?? "",
        caption: post.caption ?? "",
        isReel: post.isReel,
        views: post.views,
        likes: post.likes,
        comments: post.comments,
        shares: post.shares,
        saves: post.saves,
        reach: post.reach,
        leadsGenerated: post.leadsGenerated,
      }
    : {
        platform: "INSTAGRAM",
        postDate: new Date().toISOString().slice(0, 10),
        url: "",
        caption: "",
        isReel: false,
        views: 0,
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0,
        reach: 0,
        leadsGenerated: 0,
      };

  const form = useForm<SocialPostInput>({
    resolver: zodResolver(socialPostSchema),
    defaultValues,
  });

  React.useEffect(() => {
    if (open) form.reset(defaultValues);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(data: SocialPostInput) {
    setServerError(null);
    const result = mode === "create" ? await createSocialPost(data) : await updateSocialPost(post!.id, data);

    if (result?.error) {
      setServerError(result.error);
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof SocialPostInput, { message });
        });
      }
      return;
    }

    toast.success(mode === "create" ? "Post recorded" : "Post updated");
    setOpen(false);
    router.refresh();
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {mode === "create" ? (
          <Button>
            <Plus /> Add Post
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Edit post">
            <Pencil className="size-4" />
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{mode === "create" ? "Record Post" : "Edit Post"}</SheetTitle>
          <SheetDescription>
            Track performance metrics for an Instagram, Facebook or YouTube post.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 px-4 pb-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SOCIAL_PLATFORMS.map((platform) => (
                          <SelectItem key={platform} value={platform}>
                            {PLATFORM_LABELS[platform]}
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
                name="postDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Post date</FormLabel>
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
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL</FormLabel>
                  <FormControl>
                    <Input type="text" placeholder="https://…" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="caption"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Caption</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="isReel"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start gap-2">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="font-normal">This is a Reel / Short</FormLabel>
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              {METRIC_FIELDS.map(({ name, label }) => (
                <FormField
                  key={name}
                  control={form.control}
                  name={name}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{label}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={0}
                          step={1}
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
              ))}
            </div>

            {serverError ? (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {serverError}
              </p>
            ) : null}

            <SheetFooter className="px-0">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {mode === "create" ? "Record post" : "Save changes"}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
