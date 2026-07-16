"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { fieldErrorsFrom } from "@/lib/form-errors";
import {
  certificationCourseSchema,
  guestCertificationSchema,
  type CertificationCourseInput,
  type GuestCertificationInput,
} from "@/lib/validations/certifications";

export type CertificationActionState =
  | { error?: string; fieldErrors?: Record<string, string> }
  | undefined;

function toDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

// --- Certification courses (catalog) ---

export async function createCertificationCourse(
  input: CertificationCourseInput
): Promise<CertificationActionState> {
  await requireModuleAccess("certifications");

  const parsed = certificationCourseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = parsed.data;

  try {
    await prisma.certificationCourse.create({
      data: {
        name: data.name,
        agency: data.agency,
        track: data.track || null,
        price: data.price,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "A course with this name and agency already exists." };
    }
    throw error;
  }

  revalidatePath("/certifications");
  return undefined;
}

export async function updateCertificationCourse(
  courseId: string,
  input: CertificationCourseInput
): Promise<CertificationActionState> {
  await requireModuleAccess("certifications");

  const parsed = certificationCourseSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const data = parsed.data;

  try {
    await prisma.certificationCourse.update({
      where: { id: courseId },
      data: {
        name: data.name,
        agency: data.agency,
        track: data.track || null,
        price: data.price,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "A course with this name and agency already exists." };
    }
    throw error;
  }

  revalidatePath("/certifications");
  return undefined;
}

export async function deleteCertificationCourse(
  courseId: string
): Promise<CertificationActionState> {
  await requireModuleAccess("certifications");

  try {
    await prisma.certificationCourse.delete({ where: { id: courseId } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return {
        error:
          "This course has guest certifications linked to it and cannot be deleted. Reassign or delete those certifications first.",
      };
    }
    throw error;
  }

  revalidatePath("/certifications");
  return undefined;
}

// --- Guest certifications ---

function buildCertificationData(data: GuestCertificationInput) {
  return {
    guestId: data.guestId,
    courseId: data.courseId,
    instructorId: data.instructorId || null,
    status: data.status,
    progress: data.progress,
    theoryCompletedAt: data.theoryCompletedAt ? toDateOnly(data.theoryCompletedAt) : null,
    poolCompletedAt: data.poolCompletedAt ? toDateOnly(data.poolCompletedAt) : null,
    openWaterDivesCompleted: data.openWaterDivesCompleted,
    openWaterDivesRequired: data.openWaterDivesRequired,
    examPassedAt: data.examPassedAt ? toDateOnly(data.examPassedAt) : null,
    certificateNumber: data.certificateNumber || null,
    startDate: data.startDate ? toDateOnly(data.startDate) : null,
    completionDate: data.completionDate ? toDateOnly(data.completionDate) : null,
    issueDate: data.issueDate ? toDateOnly(data.issueDate) : null,
    notes: data.notes || null,
  };
}

export async function createGuestCertification(
  input: GuestCertificationInput
): Promise<CertificationActionState> {
  await requireModuleAccess("certifications");

  const parsed = guestCertificationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  await prisma.guestCertification.create({ data: buildCertificationData(parsed.data) });

  revalidatePath("/certifications");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}

export async function updateGuestCertification(
  certificationId: string,
  input: GuestCertificationInput
): Promise<CertificationActionState> {
  await requireModuleAccess("certifications");

  const parsed = guestCertificationSchema.safeParse(input);
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  await prisma.guestCertification.update({
    where: { id: certificationId },
    data: buildCertificationData(parsed.data),
  });

  revalidatePath("/certifications");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}

export async function deleteGuestCertification(
  certificationId: string
): Promise<CertificationActionState> {
  await requireModuleAccess("certifications");

  await prisma.guestCertification.delete({ where: { id: certificationId } });

  revalidatePath("/certifications");
  revalidatePath("/");
  revalidateTag("dashboard");
  return undefined;
}
