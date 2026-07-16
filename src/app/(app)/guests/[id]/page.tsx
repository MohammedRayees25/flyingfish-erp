import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { format } from "date-fns";
import {
  MessageCircle,
  Phone,
  CalendarDays,
  Wallet,
  Award,
  ShieldAlert,
  Waves,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { GuestFormSheet } from "@/components/guests/guest-form-sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  ACTIVITY_LABELS,
  BOOKING_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  CERTIFICATION_LEVEL_LABELS,
  CERTIFICATION_STATUS_LABELS,
  SWIMMING_STATUS_LABELS,
  formatCurrencyINR,
} from "@/lib/labels";
import { whatsappHref, telHref } from "@/lib/contact-links";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const guest = await prisma.guest.findUnique({ where: { id }, select: { fullName: true } });
  return { title: guest?.fullName ?? "Guest" };
}

type TimelineEvent = {
  date: Date;
  icon: typeof CalendarDays;
  title: string;
  description: string;
  badge?: { label: string; variant?: "default" | "secondary" | "outline" | "destructive" | "success" | "warning" };
};

export default async function GuestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireModuleAccess("guests");
  const { id } = await params;

  const guest = await prisma.guest.findUnique({
    where: { id },
    include: {
      bookings: {
        select: {
          date: true,
          activityType: true,
          status: true,
          boat: { select: { name: true } },
          diveSite: { select: { name: true } },
          instructor: { select: { fullName: true } },
        },
        orderBy: { date: "desc" },
      },
      payments: {
        select: { amount: true, method: true, status: true, paidAt: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
      certifications: {
        select: {
          startDate: true,
          createdAt: true,
          status: true,
          course: { select: { name: true } },
          instructor: { select: { fullName: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!guest) notFound();

  // Client components can't receive Prisma `Decimal` values (nested inside
  // bookings[].price / payments[].amount here), so only pass the guest's
  // own scalar fields down to the edit form.
  const { bookings: _bookings, payments: _payments, certifications: _certifications, ...guestFields } = guest;
  void _bookings;
  void _payments;
  void _certifications;

  const timeline: TimelineEvent[] = [
    ...guest.bookings.map((b) => ({
      date: b.date,
      icon: Waves,
      title: ACTIVITY_LABELS[b.activityType],
      description: [b.boat?.name, b.diveSite?.name, b.instructor?.fullName]
        .filter(Boolean)
        .join(" · ") || "—",
      badge: { label: BOOKING_STATUS_LABELS[b.status], variant: "outline" as const },
    })),
    ...guest.payments.map((p) => ({
      date: p.paidAt ?? p.createdAt,
      icon: Wallet,
      title: formatCurrencyINR(Number(p.amount)),
      description: p.method,
      badge: {
        label: PAYMENT_STATUS_LABELS[p.status],
        variant: p.status === "PAID" ? ("success" as const) : ("warning" as const),
      },
    })),
    ...guest.certifications.map((c) => ({
      date: c.startDate ?? c.createdAt,
      icon: Award,
      title: c.course.name,
      description: c.instructor?.fullName ?? "Unassigned instructor",
      badge: { label: CERTIFICATION_STATUS_LABELS[c.status], variant: "outline" as const },
    })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  const totalPaid = guest.payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalDue = guest.payments
    .filter((p) => p.status === "PENDING" || p.status === "PARTIAL")
    .reduce((sum, p) => sum + Number(p.amount), 0);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{guest.fullName}</h1>
            <Badge variant="secondary">
              {CERTIFICATION_LEVEL_LABELS[guest.certificationLevel]}
            </Badge>
            {guest.medicalDeclaration ? (
              <Badge variant="destructive" className="gap-1">
                <ShieldAlert className="size-3" /> Medical declaration
              </Badge>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground">
            {guest.nationality ?? "Nationality unknown"} · {guest.previousDives} previous dives
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={whatsappHref(guest.phone)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="text-success" /> WhatsApp
            </a>
          </Button>
          <Button variant="outline" asChild>
            <a href={telHref(guest.phone)}>
              <Phone className="text-primary" /> Call
            </a>
          </Button>
          <GuestFormSheet mode="edit" guest={guestFields} />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Profile</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <Field label="Phone" value={guest.phone} />
              <Field label="Email" value={guest.email ?? "—"} />
              <Field
                label="Swimming status"
                value={SWIMMING_STATUS_LABELS[guest.swimmingStatus]}
              />
              <Field
                label="Date of birth"
                value={guest.dateOfBirth ? format(guest.dateOfBirth, "d MMM yyyy") : "—"}
              />
              <Separator />
              <Field label="Emergency contact" value={guest.emergencyContactName ?? "—"} />
              <Field label="Emergency phone" value={guest.emergencyContactPhone ?? "—"} />
              <Separator />
              <Field label="Source" value={guest.source ?? "—"} />
              {guest.medicalNotes ? (
                <Field label="Medical notes" value={guest.medicalNotes} />
              ) : null}
              {guest.notes ? <Field label="Notes" value={guest.notes} /> : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Total paid</p>
                <p className="text-lg font-semibold text-success">
                  {formatCurrencyINR(totalPaid)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Outstanding</p>
                <p className="text-lg font-semibold text-destructive">
                  {formatCurrencyINR(totalDue)}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {timeline.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                No activity yet.
              </p>
            ) : (
              <ol className="flex flex-col gap-5">
                {timeline.map((event, idx) => (
                  <li key={idx} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <event.icon className="size-4" />
                      </div>
                      {idx < timeline.length - 1 ? (
                        <div className="mt-1 w-px flex-1 bg-border" />
                      ) : null}
                    </div>
                    <div className="flex-1 pb-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{event.title}</p>
                        {event.badge ? (
                          <Badge variant={event.badge.variant}>{event.badge.label}</Badge>
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground">{event.description}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {format(event.date, "d MMM yyyy")}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
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
