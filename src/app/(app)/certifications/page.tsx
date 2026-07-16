import type { Metadata } from "next";
import Link from "next/link";
import { addDays, endOfMonth, startOfDay, startOfMonth } from "date-fns";
import { Download } from "lucide-react";
import { Prisma } from "@prisma/client";
import type { CertificationAgency, CertificationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireModuleAccess } from "@/lib/auth/current-user";
import { getInstructors } from "@/lib/reference-data";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CertificationsOverview } from "@/components/certifications/certifications-overview";
import { CertificationsTable } from "@/components/certifications/certifications-table";
import { CertificationFormSheet } from "@/components/certifications/certification-form-sheet";
import { CoursesTable } from "@/components/certifications/courses-table";
import { CourseFormSheet } from "@/components/certifications/course-form-sheet";
import type { CourseOption, InstructorOption } from "@/components/certifications/types";

export const metadata: Metadata = { title: "Certifications" };

const PAGE_SIZE = 20;
// Matches the definition already used by the CEO dashboard's
// pending.certificationsCount widget (src/lib/dashboard.ts) so the two
// numbers stay consistent across the app.
const OVERVIEW_PENDING_STATUSES = ["NOT_STARTED", "IN_PROGRESS", "PENDING_CARD"] as const;
const TABS = ["overview", "certifications", "courses"] as const;
type TabValue = (typeof TABS)[number];

function isTabValue(value: string | undefined): value is TabValue {
  return !!value && (TABS as readonly string[]).includes(value);
}

export default async function CertificationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    tab?: string;
    q?: string;
    status?: string;
    agency?: string;
    courseId?: string;
    page?: string;
  }>;
}) {
  await requireModuleAccess("certifications");
  const params = await searchParams;
  const tab: TabValue = isTabValue(params.tab) ? params.tab : "overview";
  const q = params.q?.trim() ?? "";
  const status = params.status ?? "all";
  const agency = params.agency ?? "all";
  const courseId = params.courseId ?? "all";
  const page = Math.max(1, Number(params.page) || 1);

  const [coursesRaw, instructors] = await Promise.all([
    prisma.certificationCourse.findMany({ orderBy: [{ agency: "asc" }, { name: "asc" }] }),
    getInstructors(),
  ]);

  const courseOptions: CourseOption[] = coursesRaw.map((c) => ({
    id: c.id,
    name: c.name,
    agency: c.agency,
  }));
  const instructorOptions: InstructorOption[] = instructors;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Certifications</h1>
          <p className="text-sm text-muted-foreground">
            Track guest certification progress across PADI and SSI courses.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tab === "certifications" ? (
            <>
              <Button variant="outline" asChild>
                <a
                  href={`/api/reports/certifications${status !== "all" ? `?status=${status}` : ""}`}
                >
                  <Download /> Export PDF
                </a>
              </Button>
              <CertificationFormSheet
                mode="create"
                courses={courseOptions}
                instructors={instructorOptions}
              />
            </>
          ) : null}
          {tab === "courses" ? <CourseFormSheet mode="create" /> : null}
        </div>
      </div>

      <Tabs value={tab}>
        <TabsList>
          <TabsTrigger value="overview" asChild>
            <Link href="/certifications?tab=overview">Overview</Link>
          </TabsTrigger>
          <TabsTrigger value="certifications" asChild>
            <Link href="/certifications?tab=certifications">Certifications</Link>
          </TabsTrigger>
          <TabsTrigger value="courses" asChild>
            <Link href="/certifications?tab=courses">Courses</Link>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">{tab === "overview" ? <OverviewTab /> : null}</TabsContent>

        <TabsContent value="certifications">
          {tab === "certifications" ? (
            <Card>
              <CardContent className="pt-6">
                <CertificationsList
                  q={q}
                  status={status}
                  agency={agency}
                  courseId={courseId}
                  page={page}
                  courses={courseOptions}
                  instructors={instructorOptions}
                />
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="courses">
          {tab === "courses" ? (
            <Card>
              <CardContent className="pt-6">
                <CoursesTable
                  courses={coursesRaw.map((c) => ({
                    id: c.id,
                    name: c.name,
                    agency: c.agency,
                    track: c.track,
                    price: Number(c.price),
                  }))}
                />
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>
      </Tabs>
    </div>
  );
}

async function OverviewTab() {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const todayStart = startOfDay(now);
  const upcomingEnd = addDays(now, 14);

  const [pendingCount, completedThisMonthCount, statusBreakdownRaw, upcomingRaw] =
    await Promise.all([
      prisma.guestCertification.count({
        where: { status: { in: [...OVERVIEW_PENDING_STATUSES] } },
      }),
      prisma.guestCertification.count({
        where: { completionDate: { gte: monthStart, lte: monthEnd } },
      }),
      prisma.guestCertification.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.guestCertification.findMany({
        where: {
          startDate: { gte: todayStart, lte: upcomingEnd },
          status: { notIn: ["COMPLETED", "ISSUED"] },
        },
        select: {
          id: true,
          startDate: true,
          guest: { select: { fullName: true } },
          course: { select: { name: true, agency: true } },
          instructor: { select: { fullName: true } },
        },
        orderBy: { startDate: "asc" },
        take: 10,
      }),
    ]);

  const breakdown = statusBreakdownRaw.map((row) => ({
    status: row.status,
    count: row._count,
  }));

  const upcoming = upcomingRaw.map((c) => ({
    id: c.id,
    guestName: c.guest.fullName,
    courseName: c.course.name,
    agency: c.course.agency,
    instructorName: c.instructor?.fullName ?? "Unassigned",
    startDate: c.startDate,
  }));

  return (
    <CertificationsOverview
      pendingCount={pendingCount}
      completedThisMonthCount={completedThisMonthCount}
      breakdown={breakdown}
      upcoming={upcoming}
    />
  );
}

async function CertificationsList({
  q,
  status,
  agency,
  courseId,
  page,
  courses,
  instructors,
}: {
  q: string;
  status: string;
  agency: string;
  courseId: string;
  page: number;
  courses: CourseOption[];
  instructors: InstructorOption[];
}) {
  const where: Prisma.GuestCertificationWhereInput = {
    ...(q ? { guest: { fullName: { contains: q, mode: "insensitive" } } } : {}),
    ...(status !== "all" ? { status: status as CertificationStatus } : {}),
    ...(agency !== "all" ? { course: { agency: agency as CertificationAgency } } : {}),
    ...(courseId !== "all" ? { courseId } : {}),
  };

  const [certificationsRaw, total] = await Promise.all([
    prisma.guestCertification.findMany({
      where,
      select: {
        id: true,
        guestId: true,
        courseId: true,
        instructorId: true,
        status: true,
        progress: true,
        theoryCompletedAt: true,
        poolCompletedAt: true,
        openWaterDivesCompleted: true,
        openWaterDivesRequired: true,
        examPassedAt: true,
        certificateNumber: true,
        startDate: true,
        completionDate: true,
        issueDate: true,
        notes: true,
        guest: { select: { fullName: true, phone: true } },
        course: { select: { name: true, agency: true } },
        instructor: { select: { fullName: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.guestCertification.count({ where }),
  ]);

  const certifications = certificationsRaw.map((c) => ({
    id: c.id,
    guestId: c.guestId,
    guestName: c.guest.fullName,
    guestPhone: c.guest.phone,
    courseId: c.courseId,
    courseName: c.course.name,
    agency: c.course.agency,
    instructorId: c.instructorId,
    instructorName: c.instructor?.fullName ?? null,
    status: c.status,
    progress: c.progress,
    theoryCompletedAt: c.theoryCompletedAt,
    poolCompletedAt: c.poolCompletedAt,
    openWaterDivesCompleted: c.openWaterDivesCompleted,
    openWaterDivesRequired: c.openWaterDivesRequired,
    examPassedAt: c.examPassedAt,
    certificateNumber: c.certificateNumber,
    startDate: c.startDate,
    completionDate: c.completionDate,
    issueDate: c.issueDate,
    notes: c.notes,
  }));

  return (
    <CertificationsTable
      certifications={certifications}
      total={total}
      page={page}
      pageSize={PAGE_SIZE}
      query={q}
      status={status}
      agency={agency}
      courseId={courseId}
      courses={courses}
      instructors={instructors}
    />
  );
}
