import type { CertificationAgency, CertificationStatus } from "@prisma/client";

export const CERTIFICATION_AGENCY_LABELS: Record<CertificationAgency, string> = {
  PADI: "PADI",
  SSI: "SSI",
  OTHER: "Other",
};

export type CertificationRow = {
  id: string;
  guestId: string;
  guestName: string;
  guestPhone: string;
  courseId: string;
  courseName: string;
  agency: CertificationAgency;
  instructorId: string | null;
  instructorName: string | null;
  status: CertificationStatus;
  progress: number;
  theoryCompletedAt: Date | null;
  poolCompletedAt: Date | null;
  openWaterDivesCompleted: number;
  openWaterDivesRequired: number;
  examPassedAt: Date | null;
  certificateNumber: string | null;
  startDate: Date | null;
  completionDate: Date | null;
  issueDate: Date | null;
  notes: string | null;
};

export type CourseOption = { id: string; name: string; agency: CertificationAgency };
export type InstructorOption = { id: string; fullName: string };

export type CertificationCourseRow = {
  id: string;
  name: string;
  agency: CertificationAgency;
  track: string | null;
  price: number;
};
