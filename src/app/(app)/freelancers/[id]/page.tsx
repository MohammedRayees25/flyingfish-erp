import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { subDays } from "date-fns";
import { MessageCircle, Phone } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { FreelancerFormSheet } from "@/components/freelancers/freelancer-form-sheet";
import { FreelancerAttendanceSection } from "@/components/freelancers/freelancer-attendance-section";
import { FreelancerPaymentsSection } from "@/components/freelancers/freelancer-payments-section";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrencyINR } from "@/lib/labels";
import { whatsappHref, telHref } from "@/lib/contact-links";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const freelancer = await prisma.freelancer.findUnique({
    where: { id },
    select: { fullName: true },
  });
  return { title: freelancer?.fullName ?? "Freelancer" };
}

export default async function FreelancerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModuleAccess("freelancers");
  const { id } = await params;

  const thirtyDaysAgo = subDays(new Date(), 30);

  const [freelancer, attendance, payments] = await Promise.all([
    prisma.freelancer.findUnique({ where: { id } }),
    prisma.freelancerAttendance.findMany({
      where: { freelancerId: id, date: { gte: thirtyDaysAgo } },
      orderBy: { date: "desc" },
    }),
    prisma.freelancerPayment.findMany({
      where: { freelancerId: id },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  if (!freelancer) notFound();

  // Client components can't receive Prisma `Decimal` values, so only the
  // freelancer's own scalar fields (converted to number) go to the edit form.
  const freelancerScalar = {
    id: freelancer.id,
    fullName: freelancer.fullName,
    role: freelancer.role,
    phone: freelancer.phone,
    dayRate: Number(freelancer.dayRate),
    isActive: freelancer.isActive,
  };

  const attendanceRows = attendance.map((a) => ({
    id: a.id,
    date: a.date,
    status: a.status,
    notes: a.notes,
  }));

  const paymentRows = payments.map((p) => ({
    id: p.id,
    amount: Number(p.amount),
    status: p.status,
    dueDate: p.dueDate,
    paidAt: p.paidAt,
    notes: p.notes,
    createdAt: p.createdAt,
  }));

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{freelancer.fullName}</h1>
            <Badge variant="secondary">{freelancer.role}</Badge>
            <Badge variant={freelancer.isActive ? "success" : "outline"}>
              {freelancer.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Day rate {formatCurrencyINR(Number(freelancer.dayRate))}
          </p>
        </div>
        <div className="flex gap-2">
          {freelancer.phone ? (
            <>
              <Button variant="outline" asChild>
                <a href={whatsappHref(freelancer.phone)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="text-success" /> WhatsApp
                </a>
              </Button>
              <Button variant="outline" asChild>
                <a href={telHref(freelancer.phone)}>
                  <Phone className="text-primary" /> Call
                </a>
              </Button>
            </>
          ) : null}
          <FreelancerFormSheet mode="edit" freelancer={freelancerScalar} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Field label="Role" value={freelancer.role} />
            <Field label="Phone" value={freelancer.phone ?? "—"} />
            <Field label="Day rate" value={formatCurrencyINR(Number(freelancer.dayRate))} />
            <Field label="Status" value={freelancer.isActive ? "Active" : "Inactive"} />
          </CardContent>
        </Card>

        <FreelancerAttendanceSection freelancerId={freelancer.id} records={attendanceRows} />
        <FreelancerPaymentsSection freelancerId={freelancer.id} payments={paymentRows} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p>{value}</p>
    </div>
  );
}
