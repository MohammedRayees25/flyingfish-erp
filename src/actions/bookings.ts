"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { bookingSchema, type BookingInput } from "@/lib/validations/booking";
import type { BookingStatus, PaymentStatus } from "@prisma/client";
import { fieldErrorsFrom } from "@/lib/form-errors";

export type BookingActionState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

export async function createBooking(
  input: BookingInput,
  paymentStatus: PaymentStatus
): Promise<BookingActionState> {
  await requireModuleAccess("bookings");

  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const data = parsed.data;

  const booking = await prisma.booking.create({
    data: {
      guestId: data.guestId,
      instructorId: data.instructorId || null,
      boatId: data.boatId || null,
      diveSiteId: data.diveSiteId || null,
      activityType: data.activityType,
      date: new Date(data.date),
      status: data.status,
      price: data.price,
      notes: data.notes || null,
    },
  });

  if (data.price > 0) {
    await prisma.payment.create({
      data: {
        guestId: data.guestId,
        bookingId: booking.id,
        amount: data.price,
        status: paymentStatus,
        paidAt: paymentStatus === "PAID" ? new Date() : null,
      },
    });
  }

  revalidatePath("/bookings");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}

export async function updateBooking(
  bookingId: string,
  input: BookingInput,
  paymentStatus: PaymentStatus
): Promise<BookingActionState> {
  await requireModuleAccess("bookings");

  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: "Please fix the highlighted fields.", fieldErrors: fieldErrorsFrom(parsed.error) };
  }
  const data = parsed.data;

  const [, existingPayment] = await Promise.all([
    prisma.booking.update({
      where: { id: bookingId },
      data: {
        guestId: data.guestId,
        instructorId: data.instructorId || null,
        boatId: data.boatId || null,
        diveSiteId: data.diveSiteId || null,
        activityType: data.activityType,
        date: new Date(data.date),
        status: data.status,
        price: data.price,
        notes: data.notes || null,
      },
    }),
    prisma.payment.findFirst({
      where: { bookingId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  if (data.price > 0) {
    if (existingPayment) {
      await prisma.payment.update({
        where: { id: existingPayment.id },
        data: {
          amount: data.price,
          status: paymentStatus,
          paidAt: paymentStatus === "PAID" ? (existingPayment.paidAt ?? new Date()) : null,
        },
      });
    } else {
      await prisma.payment.create({
        data: {
          guestId: data.guestId,
          bookingId,
          amount: data.price,
          status: paymentStatus,
          paidAt: paymentStatus === "PAID" ? new Date() : null,
        },
      });
    }
  }

  revalidatePath("/bookings");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}

export async function deleteBooking(bookingId: string): Promise<BookingActionState> {
  await requireModuleAccess("bookings");
  await prisma.payment.deleteMany({ where: { bookingId } });
  await prisma.booking.delete({ where: { id: bookingId } });
  revalidatePath("/bookings");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus
): Promise<BookingActionState> {
  await requireModuleAccess("bookings");
  await prisma.booking.update({ where: { id: bookingId }, data: { status } });
  revalidatePath("/bookings");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}
