"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { setStaffMonthlySalary, generateMonthlySalaries, markSalaryPaid } from "@/actions/finance";
import { formatCurrencyINR, PAYMENT_STATUS_LABELS } from "@/lib/labels";
import type { PaymentStatus } from "@prisma/client";

type StaffRow = { id: string; fullName: string; role: string; monthlySalary: number };
type PaymentRow = {
  id: string;
  userName: string;
  month: string;
  amount: number;
  status: PaymentStatus;
  paidAt: Date | null;
};

function SalaryInput({ staff }: { staff: StaffRow }) {
  const [value, setValue] = React.useState(staff.monthlySalary);
  const [saving, setSaving] = React.useState(false);
  const router = useRouter();

  async function save() {
    if (value === staff.monthlySalary) return;
    setSaving(true);
    const result = await setStaffMonthlySalary(staff.id, { monthlySalary: value });
    setSaving(false);
    if (result?.error) toast.error(result.error);
    else {
      toast.success(`${staff.fullName}'s salary updated`);
      router.refresh();
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => setValue(e.target.valueAsNumber || 0)}
        onBlur={save}
        className="w-32"
        disabled={saving}
      />
      {saving ? <Loader2 className="size-3.5 animate-spin text-muted-foreground" /> : null}
    </div>
  );
}

export function StaffSalaryPanel({
  staff,
  payments,
}: {
  staff: StaffRow[];
  payments: PaymentRow[];
}) {
  const [generating, startGenerating] = React.useTransition();
  const [markingId, setMarkingId] = React.useState<string | null>(null);
  const router = useRouter();
  const currentMonth = format(new Date(), "yyyy-MM");

  function handleGenerate() {
    startGenerating(async () => {
      const result = await generateMonthlySalaries(currentMonth);
      if (result?.error) toast.error(result.error);
      else {
        toast.success(`Salaries generated for ${format(new Date(), "MMMM yyyy")}`);
        router.refresh();
      }
    });
  }

  async function handleMarkPaid(id: string) {
    setMarkingId(id);
    const result = await markSalaryPaid(id);
    setMarkingId(null);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Salary marked as paid");
      router.refresh();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Staff monthly salary</CardTitle>
          <CardDescription>
            Set each staff member&apos;s monthly rate, then generate this month&apos;s payment rows.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Monthly Salary (₹)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.fullName}</TableCell>
                    <TableCell className="text-muted-foreground">{s.role}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <SalaryInput staff={s} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Button className="mt-4" onClick={handleGenerate} disabled={generating}>
            {generating ? <Loader2 className="size-4 animate-spin" /> : null}
            Generate {format(new Date(), "MMMM yyyy")} salaries
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Salary payments</CardTitle>
          <CardDescription>Most recent months first.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff</TableHead>
                  <TableHead>Month</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid At</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      No salary payments generated yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.userName}</TableCell>
                      <TableCell>{format(new Date(`${p.month}-01`), "MMMM yyyy")}</TableCell>
                      <TableCell>{formatCurrencyINR(p.amount)}</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "PAID" ? "success" : "warning"}>
                          {PAYMENT_STATUS_LABELS[p.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {p.paidAt ? format(p.paidAt, "d MMM yyyy") : "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {p.status !== "PAID" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            disabled={markingId === p.id}
                            onClick={() => handleMarkPaid(p.id)}
                          >
                            {markingId === p.id ? <Loader2 className="size-3.5 animate-spin" /> : null}
                            Mark paid
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
    </div>
  );
}
