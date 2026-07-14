import {
  PrismaClient,
  ActivityType,
  BookingStatus,
  PaymentMethod,
  PaymentStatus,
  AttendanceStatus,
  CertificationAgency,
  CertificationStatus,
  SwimmingStatus,
  CertificationLevel,
  TransactionType,
  ExpenseCategory,
  RevenueCategory,
  ReviewReplyStatus,
  ReviewSentiment,
  SocialPlatform,
  FollowUpType,
  FollowUpChannel,
  FollowUpStatus,
  VendorPaymentStatus,
  UserRole,
} from "@prisma/client";
import { computeBoatSharingSplits } from "@/lib/boat-sharing";
import { ensureDefaultAdmin } from "@/lib/supabase/bootstrap-admin";

const prisma = new PrismaClient();

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
function pick<T>(arr: T[]): T {
  return arr[randInt(0, arr.length - 1)];
}
function pickSome<T>(arr: T[], n: number): T[] {
  return [...arr].sort(() => Math.random() - 0.5).slice(0, n);
}
function daysAgo(n: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d;
}
function daysFromNow(n: number): Date {
  return daysAgo(-n);
}

async function main() {
  console.log("Seeding Flying Fish Scuba School ERP demo data…");

  // ---------------------------------------------------------------------
  // Users (staff). These use fixed placeholder UUIDs so the seed is
  // idempotent. They do NOT correspond to real Supabase Auth accounts —
  // invite real staff via Supabase Auth (see README) and their profile
  // rows will be created automatically by the DB trigger. These seeded
  // users exist purely to give demo bookings/attendance/etc. realistic
  // instructor/staff references.
  // ---------------------------------------------------------------------
  const users = [
    { id: "11111111-1111-4111-8111-111111111101", email: "asha@flyingfish.in", fullName: "Asha Kapoor", role: UserRole.SUPER_ADMIN },
    { id: "11111111-1111-4111-8111-111111111102", email: "rohan@flyingfish.in", fullName: "Rohan Mehta", role: UserRole.FOUNDER },
    { id: "11111111-1111-4111-8111-111111111103", email: "priya@flyingfish.in", fullName: "Priya Nair", role: UserRole.MANAGER },
    { id: "11111111-1111-4111-8111-111111111104", email: "diego@flyingfish.in", fullName: "Diego Alves", role: UserRole.INSTRUCTOR },
    { id: "11111111-1111-4111-8111-111111111105", email: "sana@flyingfish.in", fullName: "Sana Fernandes", role: UserRole.INSTRUCTOR },
    { id: "11111111-1111-4111-8111-111111111106", email: "karan@flyingfish.in", fullName: "Karan Shah", role: UserRole.MARKETING },
    { id: "11111111-1111-4111-8111-111111111107", email: "meera@flyingfish.in", fullName: "Meera Iyer", role: UserRole.ACCOUNTANT },
  ];
  for (const u of users) {
    await prisma.user.upsert({ where: { id: u.id }, update: u, create: u });
  }
  const instructors = users.filter((u) => u.role === UserRole.INSTRUCTOR);

  // ---------------------------------------------------------------------
  // Dive sites & boats
  // ---------------------------------------------------------------------
  const diveSiteNames = [
    { name: "Grande Island", location: "Goa" },
    { name: "Suzy's Wreck", location: "Goa" },
    { name: "Shelter Cove", location: "Goa" },
    { name: "St. George Reef", location: "Goa" },
    { name: "Pigeon Island", location: "Goa" },
  ];
  const diveSites = [];
  for (const s of diveSiteNames) {
    diveSites.push(
      await prisma.diveSite.upsert({
        where: { name: s.name },
        update: {},
        create: s,
      })
    );
  }

  const boatDefs = [
    { name: "MV Flying Fish 1", vendor: "Goa Boatmen Co-op", capacity: 20 },
    { name: "MV Flying Fish 2", vendor: "Anjuna Marine Services", capacity: 16 },
  ];
  const boats = [];
  for (const b of boatDefs) {
    const existing = await prisma.boat.findFirst({ where: { name: b.name } });
    boats.push(existing ?? (await prisma.boat.create({ data: b })));
  }

  // ---------------------------------------------------------------------
  // Activity rates (default prices, prefill new bookings)
  // ---------------------------------------------------------------------
  const activityRateDefs: Record<ActivityType, number> = {
    BOAT_RIDE: 1200,
    SHORT_DIVE: 3500,
    LONG_DIVE: 5500,
    LONG_DOUBLE_DIVE: 9500,
    FUN_DIVE: 4500,
    DIVE_GOA: 6000,
    SEI: 6000,
    FLYING_FISH: 4000,
    PADI_OWD: 28000,
    SSI_OWD: 27000,
    PADI_AOW: 22000,
    SSI_AOW: 21000,
    EANX: 8000,
    RESCUE: 25000,
    REACT_RIGHT: 6000,
    PPB: 5000,
    ADVANCED_ADVENTURE: 20000,
    WRECK_SPECIALTY: 12000,
  };
  for (const [activityType, price] of Object.entries(activityRateDefs)) {
    await prisma.activityRate.upsert({
      where: { activityType: activityType as ActivityType },
      update: { price },
      create: { activityType: activityType as ActivityType, price },
    });
  }

  // ---------------------------------------------------------------------
  // Certification courses
  // ---------------------------------------------------------------------
  const courseDefs = [
    { name: "Open Water Diver", agency: CertificationAgency.PADI, track: "Entry level" },
    { name: "Advanced Open Water", agency: CertificationAgency.PADI, track: "Advanced" },
    { name: "Rescue Diver", agency: CertificationAgency.PADI, track: "Rescue" },
    { name: "Enriched Air (EANx)", agency: CertificationAgency.PADI, track: "Specialty" },
    { name: "Open Water Diver", agency: CertificationAgency.SSI, track: "Entry level" },
    { name: "Advanced Adventurer", agency: CertificationAgency.SSI, track: "Advanced" },
    { name: "Stress & Rescue", agency: CertificationAgency.SSI, track: "Rescue" },
  ];
  const courses = [];
  for (const c of courseDefs) {
    courses.push(
      await prisma.certificationCourse.upsert({
        where: { name_agency: { name: c.name, agency: c.agency } },
        update: {},
        create: c,
      })
    );
  }

  // ---------------------------------------------------------------------
  // Guests
  // ---------------------------------------------------------------------
  const guestNames: { name: string; nationality: string }[] = [
    { name: "Aarav Sharma", nationality: "Indian" },
    { name: "Vivaan Gupta", nationality: "Indian" },
    { name: "Ananya Reddy", nationality: "Indian" },
    { name: "Ishita Verma", nationality: "Indian" },
    { name: "Kabir Malhotra", nationality: "Indian" },
    { name: "Diya Joshi", nationality: "Indian" },
    { name: "Rohan Bhatt", nationality: "Indian" },
    { name: "Saanvi Rao", nationality: "Indian" },
    { name: "James Wilson", nationality: "British" },
    { name: "Emily Clarke", nationality: "British" },
    { name: "Oliver Bennett", nationality: "British" },
    { name: "Anna Petrova", nationality: "Russian" },
    { name: "Dmitri Ivanov", nationality: "Russian" },
    { name: "Natasha Volkov", nationality: "Russian" },
    { name: "Lukas Müller", nationality: "German" },
    { name: "Hannah Schmidt", nationality: "German" },
    { name: "Noa Cohen", nationality: "Israeli" },
    { name: "Itai Levi", nationality: "Israeli" },
    { name: "Emma Johnson", nationality: "American" },
    { name: "Michael Brown", nationality: "American" },
    { name: "Sophie Dubois", nationality: "French" },
    { name: "Lucas Martin", nationality: "French" },
    { name: "Chiara Rossi", nationality: "Italian" },
    { name: "Marco Bianchi", nationality: "Italian" },
    { name: "Yuki Tanaka", nationality: "Japanese" },
    { name: "Wei Chen", nationality: "Chinese" },
    { name: "Sarah Ng", nationality: "Singaporean" },
    { name: "Liam O'Brien", nationality: "Irish" },
    { name: "Isabella Silva", nationality: "Brazilian" },
    { name: "Arjun Nair", nationality: "Indian" },
    { name: "Meher Kapoor", nationality: "Indian" },
    { name: "Tara Singh", nationality: "Indian" },
    { name: "Karan Oberoi", nationality: "Indian" },
    { name: "Priyanka Das", nationality: "Indian" },
    { name: "Rahul Menon", nationality: "Indian" },
  ];

  const swimmingStatuses = Object.values(SwimmingStatus);
  const certLevels = Object.values(CertificationLevel);
  const sources = ["Walk-in", "Website", "Instagram", "Repeat Guest", "Travel Agent", "Novotel Concierge"];

  const guests = [];
  for (let i = 0; i < guestNames.length; i++) {
    const g = guestNames[i];
    const phone = `9${randInt(100000000, 999999999)}`;
    const guest = await prisma.guest.create({
      data: {
        fullName: g.name,
        phone,
        email: `${g.name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
        nationality: g.nationality,
        emergencyContactName: "Emergency Contact",
        emergencyContactPhone: `9${randInt(100000000, 999999999)}`,
        medicalDeclaration: Math.random() < 0.1,
        medicalNotes: Math.random() < 0.1 ? "Mild asthma, cleared by physician." : null,
        swimmingStatus: pick(swimmingStatuses),
        certificationLevel: pick(certLevels),
        previousDives: randInt(0, 120),
        source: pick(sources),
      },
    });
    guests.push(guest);
  }

  // ---------------------------------------------------------------------
  // Bookings + Payments (last 45 days -> next 14 days)
  // ---------------------------------------------------------------------
  const activityTypes = Object.values(ActivityType);
  const bookingCount = 90;
  for (let i = 0; i < bookingCount; i++) {
    const dayOffset = randInt(-45, 14);
    const date = dayOffset >= 0 ? daysFromNow(dayOffset) : daysAgo(-dayOffset);
    const isPast = dayOffset < 0;
    const status = isPast
      ? pick([BookingStatus.COMPLETED, BookingStatus.COMPLETED, BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.NO_SHOW])
      : pick([BookingStatus.CONFIRMED, BookingStatus.PENDING]);
    const activityType = pick(activityTypes);
    const guest = pick(guests);
    const price = activityType === ActivityType.BOAT_RIDE ? randInt(800, 1500) : randInt(2500, 15000);

    const booking = await prisma.booking.create({
      data: {
        guestId: guest.id,
        instructorId: pick(instructors).id,
        boatId: pick(boats).id,
        diveSiteId: activityType === ActivityType.BOAT_RIDE ? null : pick(diveSites).id,
        activityType,
        date,
        status,
        price,
        notes: null,
      },
    });

    if (status === BookingStatus.COMPLETED || (status === BookingStatus.CONFIRMED && Math.random() < 0.6)) {
      const paymentStatus =
        status === BookingStatus.COMPLETED
          ? pick([PaymentStatus.PAID, PaymentStatus.PAID, PaymentStatus.PAID, PaymentStatus.PENDING, PaymentStatus.PARTIAL])
          : pick([PaymentStatus.PENDING, PaymentStatus.PARTIAL, PaymentStatus.PAID]);

      await prisma.payment.create({
        data: {
          guestId: guest.id,
          bookingId: booking.id,
          amount: price,
          method: pick(Object.values(PaymentMethod)),
          status: paymentStatus,
          paidAt: paymentStatus === PaymentStatus.PAID ? date : null,
          dueDate: paymentStatus !== PaymentStatus.PAID ? daysFromNow(randInt(1, 10)) : null,
        },
      });
    }
  }

  // A few bookings + a completed payment explicitly for *today* so the
  // dashboard's "Today" widgets aren't empty on a fresh seed.
  for (let i = 0; i < 4; i++) {
    const guest = pick(guests);
    const activityType = pick(activityTypes.filter((a) => a !== ActivityType.BOAT_RIDE));
    const price = randInt(3000, 12000);
    const booking = await prisma.booking.create({
      data: {
        guestId: guest.id,
        instructorId: pick(instructors).id,
        boatId: pick(boats).id,
        diveSiteId: pick(diveSites).id,
        activityType,
        date: daysAgo(0),
        status: i < 2 ? BookingStatus.COMPLETED : BookingStatus.CONFIRMED,
        price,
      },
    });
    await prisma.payment.create({
      data: {
        guestId: guest.id,
        bookingId: booking.id,
        amount: price,
        method: pick(Object.values(PaymentMethod)),
        status: i < 2 ? PaymentStatus.PAID : PaymentStatus.PENDING,
        paidAt: i < 2 ? new Date() : null,
        dueDate: i >= 2 ? daysFromNow(3) : null,
      },
    });
  }

  // ---------------------------------------------------------------------
  // Boat sharing (current month)
  // ---------------------------------------------------------------------
  for (let i = 0; i < 16; i++) {
    const date = daysAgo(randInt(0, 27));
    const ff = randInt(2, 10);
    const dg = randInt(0, 6);
    const sei = randInt(0, 4);
    const total = ff + dg + sei;
    const boatAmount = randInt(4000, 9000);
    const tempoAmount = randInt(500, 1500);
    const totalCost = boatAmount + tempoAmount;
    const splits = computeBoatSharingSplits({
      boatAmount,
      tempoAmount,
      ffGuests: ff,
      dgGuests: dg,
      seiGuests: sei,
    });

    // Vendor payment: nothing paid / partially paid / fully paid.
    const vendorPaidFraction = pick([0, 0, 0.5, 1, 1]);
    const vendorPaidAmount = Math.round(totalCost * vendorPaidFraction);
    const outstandingAmount = totalCost - vendorPaidAmount;
    const vendorPaymentStatus =
      outstandingAmount <= 0
        ? VendorPaymentStatus.PAID
        : vendorPaidAmount > 0
          ? VendorPaymentStatus.PARTIAL
          : VendorPaymentStatus.PENDING;

    const entry = await prisma.boatSharingEntry.create({
      data: {
        date,
        boatId: pick(boats).id,
        boatVendorName: pick(boatDefs).vendor,
        boatAmount,
        tempoAmount,
        ffGuests: ff,
        dgGuests: dg,
        seiGuests: sei,
        totalGuests: total,
        vendorPaymentStatus,
        outstandingAmount,
        splits: {
          create: splits.map((s) => {
            const paidFraction = pick([0, 0, 0.5, 1, 1]);
            const amountPaid = Math.round(s.amountDue * paidFraction);
            return {
              partyName: s.partyName,
              guestCount: s.guestCount,
              amountDue: s.amountDue,
              amountPaid,
              status:
                amountPaid <= 0
                  ? PaymentStatus.PENDING
                  : amountPaid >= s.amountDue
                    ? PaymentStatus.PAID
                    : PaymentStatus.PARTIAL,
            };
          }),
        },
      },
    });

    if (vendorPaidAmount > 0) {
      await prisma.boatVendorPayment.create({
        data: {
          entryId: entry.id,
          amount: vendorPaidAmount,
          method: pick(Object.values(PaymentMethod)),
          paidAt: date,
        },
      });
    }
  }

  // ---------------------------------------------------------------------
  // Staff attendance (current month)
  // ---------------------------------------------------------------------
  for (const u of users) {
    for (let d = 0; d < 30; d++) {
      const date = daysAgo(d);
      const status = pick([
        AttendanceStatus.PRESENT,
        AttendanceStatus.PRESENT,
        AttendanceStatus.PRESENT,
        AttendanceStatus.PRESENT,
        AttendanceStatus.HALF_DAY,
        AttendanceStatus.LEAVE,
      ]);
      await prisma.staffAttendance.upsert({
        where: { userId_date: { userId: u.id, date } },
        update: {},
        create: { userId: u.id, date, status },
      });
    }
  }

  // ---------------------------------------------------------------------
  // Freelancers
  // ---------------------------------------------------------------------
  const freelancerDefs = [
    { fullName: "Alok Fernandes", role: "Dive Guide", dayRate: 2500 },
    { fullName: "Bianca Souza", role: "Underwater Photographer", dayRate: 3000 },
    { fullName: "Ravi Kamath", role: "Boat Captain", dayRate: 2000 },
    { fullName: "Neha Prabhu", role: "Videographer", dayRate: 3500 },
  ];
  const freelancers = [];
  for (const f of freelancerDefs) {
    freelancers.push(
      await prisma.freelancer.create({ data: { ...f, phone: `9${randInt(100000000, 999999999)}` } })
    );
  }
  for (const f of freelancers) {
    for (let d = 0; d < 20; d++) {
      if (Math.random() < 0.6) {
        await prisma.freelancerAttendance.upsert({
          where: { freelancerId_date: { freelancerId: f.id, date: daysAgo(d) } },
          update: {},
          create: { freelancerId: f.id, date: daysAgo(d), status: AttendanceStatus.PRESENT },
        });
      }
    }
    const paymentCount = randInt(2, 4);
    for (let p = 0; p < paymentCount; p++) {
      const isPending = p === paymentCount - 1 && Math.random() < 0.6;
      await prisma.freelancerPayment.create({
        data: {
          freelancerId: f.id,
          amount: Number(f.dayRate) * randInt(2, 6),
          status: isPending ? PaymentStatus.PENDING : PaymentStatus.PAID,
          dueDate: isPending ? daysFromNow(randInt(1, 7)) : null,
          paidAt: isPending ? null : daysAgo(randInt(1, 20)),
        },
      });
    }
  }

  // ---------------------------------------------------------------------
  // Novotel snacks (last 20 days incl. today)
  // ---------------------------------------------------------------------
  for (let d = 0; d < 20; d++) {
    const date = daysAgo(d);
    const snackBoxCount = randInt(5, 25);
    const buffetCount = randInt(0, 10);
    await prisma.snackLog.upsert({
      where: { date },
      update: {},
      create: {
        date,
        snackBoxCount,
        buffetCount,
        cost: snackBoxCount * 120 + buffetCount * 350,
      },
    });
  }

  // ---------------------------------------------------------------------
  // Dive logs
  // ---------------------------------------------------------------------
  const currents = ["None", "Mild", "Moderate", "Strong"];
  const weathers = ["Sunny", "Partly Cloudy", "Cloudy", "Light Rain", "Clear"];
  const marineLife = [
    "Turtles, reef fish",
    "Barracuda, moray eel",
    "Stingrays, clownfish",
    "Nudibranchs, seahorses",
    "Groupers, snappers",
  ];
  for (let d = 0; d < 25; d++) {
    await prisma.diveLog.create({
      data: {
        date: daysAgo(d),
        diveSiteId: pick(diveSites).id,
        visibility: randInt(4, 15),
        current: pick(currents),
        temperature: randInt(26, 30),
        weather: pick(weathers),
        marineLifeSeen: pick(marineLife),
        instructorId: pick(instructors).id,
      },
    });
  }

  // Today's ops log (feeds "Today's Weather" / "Today's Visibility" widgets)
  await prisma.dailyOpsLog.upsert({
    where: { date: daysAgo(0) },
    update: {},
    create: {
      date: daysAgo(0),
      weather: "Partly Cloudy",
      visibility: 9,
      seaCondition: "Calm",
    },
  });

  // ---------------------------------------------------------------------
  // Guest certifications
  // ---------------------------------------------------------------------
  const certGuests = pickSome(guests, 16);
  for (let i = 0; i < certGuests.length; i++) {
    const guest = certGuests[i];
    const course = pick(courses);
    const isUpcoming = i < 6;
    const status = isUpcoming
      ? pick([CertificationStatus.NOT_STARTED, CertificationStatus.IN_PROGRESS])
      : pick([CertificationStatus.COMPLETED, CertificationStatus.ISSUED, CertificationStatus.PENDING_CARD, CertificationStatus.IN_PROGRESS]);

    await prisma.guestCertification.create({
      data: {
        guestId: guest.id,
        courseId: course.id,
        instructorId: pick(instructors).id,
        progress: status === CertificationStatus.ISSUED || status === CertificationStatus.COMPLETED ? 100 : randInt(10, 80),
        status,
        certificateNumber:
          status === CertificationStatus.ISSUED ? `${course.agency}-${randInt(100000, 999999)}` : null,
        startDate: isUpcoming ? daysFromNow(randInt(1, 12)) : daysAgo(randInt(10, 40)),
        completionDate:
          status === CertificationStatus.COMPLETED || status === CertificationStatus.ISSUED
            ? daysAgo(randInt(1, 8))
            : null,
      },
    });
  }

  // ---------------------------------------------------------------------
  // Finance transactions (last 45 days) — drives the revenue chart
  // ---------------------------------------------------------------------
  const expenseCategories = Object.values(ExpenseCategory);
  const revenueCategories = Object.values(RevenueCategory);
  for (let d = 0; d < 45; d++) {
    const date = daysAgo(d);
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const revenueEntries = randInt(isWeekend ? 3 : 1, isWeekend ? 6 : 4);
    for (let r = 0; r < revenueEntries; r++) {
      await prisma.financeTransaction.create({
        data: {
          type: TransactionType.REVENUE,
          revenueCategory: pick(revenueCategories),
          amount: randInt(1500, 14000),
          date,
          description: "Booking revenue",
          createdById: pick(users).id,
        },
      });
    }
    const expenseEntries = randInt(1, 3);
    for (let e = 0; e < expenseEntries; e++) {
      await prisma.financeTransaction.create({
        data: {
          type: TransactionType.EXPENSE,
          expenseCategory: pick(expenseCategories),
          amount: randInt(800, 7000),
          date,
          description: "Operating expense",
          createdById: pick(users).id,
        },
      });
    }
  }

  // ---------------------------------------------------------------------
  // Google reviews & social media (last 60 days)
  // ---------------------------------------------------------------------
  const reviewTexts = [
    "Amazing experience diving with the team, felt very safe throughout!",
    "Great instructors, especially loved the briefing before the dive.",
    "Good value for money, would recommend to friends.",
    "The boat ride was a bit choppy but the dive itself was fantastic.",
    "Absolutely loved seeing the turtles, thank you Flying Fish!",
    "Professional staff and well-maintained equipment.",
    "Could improve on punctuality but overall a solid experience.",
    "Best dive school in Goa, hands down.",
  ];
  for (let i = 0; i < 22; i++) {
    const rating = pick([5, 5, 5, 4, 4, 3]);
    await prisma.googleReview.create({
      data: {
        reviewerName: pick(guestNames).name,
        guestId: Math.random() < 0.4 ? pick(guests).id : null,
        rating,
        reviewText: pick(reviewTexts),
        reviewDate: daysAgo(randInt(0, 55)),
        replyStatus: pick([ReviewReplyStatus.REPLIED, ReviewReplyStatus.REPLIED, ReviewReplyStatus.PENDING]),
        instructorMentionedId: Math.random() < 0.5 ? pick(instructors).id : null,
        sentiment: rating >= 4 ? ReviewSentiment.POSITIVE : rating === 3 ? ReviewSentiment.NEUTRAL : ReviewSentiment.NEGATIVE,
      },
    });
  }

  const platforms = Object.values(SocialPlatform);
  for (let i = 0; i < 24; i++) {
    const views = randInt(200, 8000);
    await prisma.socialMediaPost.create({
      data: {
        platform: pick(platforms),
        postDate: daysAgo(randInt(0, 30)),
        caption: "Another beautiful dive day at Flying Fish 🌊",
        views,
        likes: Math.round(views * (Math.random() * 0.08 + 0.02)),
        comments: randInt(0, 40),
        reach: Math.round(views * (Math.random() * 0.6 + 0.8)),
        leadsGenerated: randInt(0, 12),
      },
    });
  }

  // ---------------------------------------------------------------------
  // CRM follow-ups
  // ---------------------------------------------------------------------
  const followUpTypes = Object.values(FollowUpType);
  for (let i = 0; i < 12; i++) {
    await prisma.followUp.create({
      data: {
        guestId: pick(guests).id,
        type: pick(followUpTypes),
        channel: pick(Object.values(FollowUpChannel)),
        dueDate: daysFromNow(randInt(-3, 10)),
        status: pick([FollowUpStatus.PENDING, FollowUpStatus.PENDING, FollowUpStatus.DONE]),
        assignedToId: pick(users).id,
      },
    });
  }

  // ---------------------------------------------------------------------
  // Season
  // ---------------------------------------------------------------------
  const year = new Date().getFullYear();
  await prisma.season.upsert({
    where: { name: `Season ${year}` },
    update: { isActive: true },
    create: {
      name: `Season ${year}`,
      startDate: new Date(`${year}-01-01`),
      endDate: new Date(`${year}-12-31`),
      isActive: true,
    },
  });

  // ---------------------------------------------------------------------
  // Default admin — always ensured, independent of the demo data above.
  // Creates (or links) a real Supabase Auth account so there's always at
  // least one working SUPER_ADMIN login after seeding. Skips cleanly if
  // Supabase credentials aren't configured (e.g. local/offline seeding).
  // ---------------------------------------------------------------------
  const adminResult = await ensureDefaultAdmin();
  if (adminResult.status === "skipped") {
    console.log(`Default admin: skipped — ${adminResult.reason}`);
  } else if (adminResult.status === "created") {
    console.log(`Default admin: created ${adminResult.email}`);
    console.log(`  Password: ${adminResult.password}`);
    console.log("  Save this now — it will not be shown again.");
  } else {
    console.log(`Default admin: linked existing Supabase Auth account ${adminResult.email}`);
  }

  console.log("Seed complete ✅");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
