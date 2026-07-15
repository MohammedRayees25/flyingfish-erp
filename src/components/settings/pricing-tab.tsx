import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { PricingActivitiesTable } from "@/components/settings/pricing-activities-table";
import { PricingRentalTable } from "@/components/settings/pricing-rental-table";
import { PricingCoursesList } from "@/components/settings/pricing-courses-list";
import type { ActivityType, CertificationAgency } from "@prisma/client";

export type PricingActivityRow = { activityType: ActivityType; price: number };
export type PricingRentalRow = { id: string; name: string; dailyRate: number; isActive: boolean };
export type PricingCourseRow = {
  id: string;
  name: string;
  agency: CertificationAgency;
  track: string | null;
  price: number;
};

export function PricingTab({
  activityRates,
  rentalItems,
  courses,
}: {
  activityRates: PricingActivityRow[];
  rentalItems: PricingRentalRow[];
  courses: PricingCourseRow[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Activities</CardTitle>
          <CardDescription>
            Default prices used to prefill new bookings. Editing here does not change the price on
            existing bookings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PricingActivitiesTable rates={activityRates} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rental equipment</CardTitle>
          <CardDescription>Daily rates for equipment rented out to guests.</CardDescription>
        </CardHeader>
        <CardContent>
          <PricingRentalTable items={rentalItems} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Certification courses</CardTitle>
          <CardDescription>
            Read-only price list. Manage courses in the{" "}
            <Link href="/certifications" className="underline underline-offset-2">
              Certifications module
            </Link>
            .
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PricingCoursesList courses={courses} />
        </CardContent>
      </Card>
    </div>
  );
}
