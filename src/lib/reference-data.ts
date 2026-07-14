import "server-only";
import { prisma } from "@/lib/prisma";

export async function getInstructors() {
  return prisma.user.findMany({
    where: { role: "INSTRUCTOR", isActive: true },
    orderBy: { fullName: "asc" },
    select: { id: true, fullName: true },
  });
}

export async function getActiveStaff() {
  return prisma.user.findMany({
    where: { isActive: true },
    orderBy: { fullName: "asc" },
  });
}

export async function getBoats() {
  return prisma.boat.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getDiveSites() {
  return prisma.diveSite.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

export async function getActivityRates() {
  const rates = await prisma.activityRate.findMany();
  return new Map(rates.map((r) => [r.activityType, Number(r.price)]));
}
