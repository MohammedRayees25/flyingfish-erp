"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { toast } from "sonner";
import { Loader2, Plus, Check } from "lucide-react";
import type { PaymentStatus } from "@prisma/client";
import {
  freelancerPaymentSchema,
  type FreelancerPaymentInput,
} from "@/lib/validations/freelancer";
import { recordFreelancerPayment, markFreelancerPaymentPaid } from "@/actions/freelancers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PAYMENT_STATUS_LABELS, formatCurrencyINR } from "@/lib/labels";
import { PAYMENT_BADGE_VARIANT } from "@/lib/status-badges";

const STATUS_OPTIONS: PaymentStatus[] = [
  "PENDING",
  "PARTIAL",
  "PAID",
  "REFUNDED",
  "CANCELLED",
];

export type FreelancerPaymentRow = {
  id: string;
  amount: number;
  status: PaymentStatus;
  dueDate: Date | null;
  paidAt: Date | null;
  notes: string | null;
  createdAt: Date;
};

const defaultValues: FreelancerPaymentInput = {
  amount: 0,
  status: "PENDING",
  dueDate: "",
  notes: "",
};

export function FreelancerPaymentsSection({
  freelancerId,
  payments,
}: {
  freelancerId: string;
  payments: FreelancerPaymentRow[];
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [markingId, setMarkingId] = React.useState<string | null>(null);
  const [isMarking, startMarking] = React.useTransition();

  const form = useForm<FreelancerPaymentInput>({
    resolver: zodResolver(freelancerPaymentSchema),
    defaultValues,
  });

  const totalPaid = payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + p.amount, 0);
  const totalPending = payments
    .filter((p) => p.status === "PENDING" || p.status === "PARTIAL")
    .reduce((sum, p) => sum + p.amount, 0);

  async function onSubmit(data: FreelancerPaymentInput) {
    setServerError(null);
    const result = await recordFreelancerPayment(freelancerId, data);

    if (result?.error) {
      setServerError(result.error);
      if (result.fieldErrors) {
        Object.entries(result.fieldErrors).forEach(([field, message]) => {
          form.setError(field as keyof FreelancerPaymentInput, { message });
        });
      }
      return;
    }

    setOpen(false);
    form.reset(defaultValues);
    router.refresh();
  }

  function handleMarkPaid(paymentId: string) {
    setMarkingId(paymentId);
    startMarking(async () => {
      const result = await markFreelancerPaymentPaid(paymentId);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Payment marked as paid");
        router.refresh();
      }
      setMarkingId(null);
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Payments</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus /> Record Payment
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>Add a new payment record for this freelancer.</DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                <FormField
                  control={form.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Amount (₹)</FormLabel>
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
                              {PAYMENT_STATUS_LABELS[option]}
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
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
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

                <DialogFooter>
                  <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : null}
                    Save payment
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total paid</p>
            <p className="text-lg font-semibold text-success">{formatCurrencyINR(totalPaid)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Total pending</p>
            <p className="text-lg font-semibold text-warning">
              {formatCurrencyINR(totalPending)}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead>Paid at</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                    No payments recorded.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell className="font-medium">
                      {formatCurrencyINR(payment.amount)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={PAYMENT_BADGE_VARIANT[payment.status]}>
                        {PAYMENT_STATUS_LABELS[payment.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {payment.dueDate ? format(payment.dueDate, "d MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      {payment.paidAt ? format(payment.paidAt, "d MMM yyyy") : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {payment.notes ?? "—"}
                    </TableCell>
                    <TableCell>
                      {payment.status === "PENDING" || payment.status === "PARTIAL" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isMarking && markingId === payment.id}
                          onClick={() => handleMarkPaid(payment.id)}
                        >
                          {isMarking && markingId === payment.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Check className="size-4" />
                          )}
                          Mark Paid
                        </Button>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
