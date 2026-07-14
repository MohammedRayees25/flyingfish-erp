# Flying Fish Scuba School — Operations ERP

An enterprise-grade ERP that replaces Flying Fish Scuba School's Excel sheets and
becomes the single source of truth for guests, bookings, boat sharing, staff,
freelancers, finance, certifications, marketing and reporting.

Built with Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Prisma,
Supabase (Postgres + Auth), React Hook Form, Zod, TanStack Table and Recharts.

> **Status: Phase 2** — Authentication, database schema, the CEO dashboard, Guest
> Management, Bookings (list + calendar), Boat Sharing, Staff Attendance and
> Freelancer Management are implemented. See [Roadmap](#roadmap) for what's next.

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15 (App Router, Server Actions) |
| Language | TypeScript (strict) |
| Styling / UI | Tailwind CSS v4, shadcn/ui (hand-vendored under `src/components/ui`), Radix primitives |
| Database | Supabase Postgres, modelled with Prisma |
| Auth | Supabase Auth (`@supabase/ssr`), role-based access control |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |
| Charts | Recharts |
| Reports | ExcelJS (Excel export — boat sharing, staff attendance, freelancers), PDF export (later phase) |
| Deployment | Vercel (app) + Supabase (database/auth) |

## Roles

`SUPER_ADMIN`, `FOUNDER`, `MANAGER`, `INSTRUCTOR`, `MARKETING`, `ACCOUNTANT` — each
role has a fixed set of accessible modules, defined in `src/lib/permissions.ts`.
Module-level access is enforced both in the sidebar/navigation and on the server
(every server action / page calls `requireModuleAccess`).

There is a single `User` model in `prisma/schema.prisma` — it *is* the staff
profile (there's no separate "Staff" table). Its `id` always equals the
matching Supabase Auth `auth.users.id`; a row must exist there for someone to
sign in at all (see the [Troubleshooting](#troubleshooting-no-staff-profile-is-linked-to-this-account)
note below if it doesn't).

## Project structure

```
prisma/
  schema.prisma          Normalized Postgres schema (all ERP modules)
  seed.ts                 Demo data seed script
  sql/auth_trigger.sql    Supabase trigger: auth.users -> public.users
src/
  app/
    login/                 Public login page
    (app)/                 Authenticated shell (sidebar + topbar)
      page.tsx             CEO dashboard
      guests/               Guest Management
      bookings/             Booking Management (list + calendar)
      boat-sharing/         Boat Sharing (entries, pending payments, reports)
      staff/                 Staff Attendance (daily, monthly, leave)
      freelancers/           Freelancer Management (profile, attendance, payments)
    api/reports/            Excel export route handlers (boat sharing, staff, freelancers)
  actions/                 Server actions (auth, guests, bookings, boat-sharing, staff-attendance, freelancers, ...)
  components/
    ui/                    Hand-vendored shadcn/ui primitives
    dashboard/              Dashboard widgets (stat cards, charts, ranked lists)
    guests/                 Guest table, create/edit form, guest combobox
    bookings/               Bookings table, calendar, create/edit form, activity rates
    boat-sharing/           Entries table, create/edit form, payment dialogs, reports
    staff/                  Daily/monthly attendance, leave management
    freelancers/             Freelancer table, form, attendance & payments sections
  lib/
    supabase/               Browser / server / middleware / admin Supabase clients
    auth/                   requireUser / requireModuleAccess helpers
    prisma.ts               Prisma client singleton
    permissions.ts          Role → module access map
    dashboard.ts             Dashboard data aggregation queries
    boat-sharing.ts          Automatic FF/DG/SEI cost-split calculator (shared client+server)
    reference-data.ts        Instructor/boat/dive-site/activity-rate lookups
    validations/             Zod schemas
```

## Getting started

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com) (any region). You'll need,
from **Project Settings → API**:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` public key (newer Supabase dashboards label this "Publishable key") →
  `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — both are read)
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server-only, never expose client-side)

And from **Project Settings → Database → Connection string**:

- Pooled connection (port 6543, `pgbouncer=true`) → `DATABASE_URL`
- Direct connection (port 5432) → `DIRECT_URL` (used by Prisma Migrate)

### 2. Configure environment variables

```bash
cp .env.example .env
# fill in the values from step 1
```

### 3. Install dependencies

```bash
npm install
```

### 4. Apply the database schema

```bash
npm run db:migrate     # creates prisma/migrations and applies them
```

Then, in the Supabase SQL editor, run `prisma/sql/auth_trigger.sql`. This keeps a
`public.users` profile row in sync with every account created in Supabase Auth
(`auth.users`), so a new login automatically gets an ERP profile with a role.

### 5. Create your first Super Admin

The easiest way — this creates a real Supabase Auth account **and** its linked
`public.users` profile in one step, using the `SUPABASE_SERVICE_ROLE_KEY` from
step 2:

```bash
npm run db:bootstrap-admin
```

It creates (or links, if it already exists) a Supabase Auth account for
`admin@flyingfish.in` — override with `DEFAULT_ADMIN_EMAIL` /
`DEFAULT_ADMIN_PASSWORD` env vars — and prints the password once if it generated
one. Safe to re-run any time (e.g. after a redeploy) — it never creates a second
account or overwrites an existing SUPER_ADMIN.

Alternatively, invite someone by hand in the Supabase dashboard under
**Authentication → Users → Invite user**, setting their metadata to:

```json
{ "full_name": "Your Name", "role": "SUPER_ADMIN" }
```

The trigger from step 4 creates a matching `public.users` row with that role when
they accept the invite.

### 6. (Optional) Seed demo data

```bash
npm run db:seed
```

This populates realistic demo guests, bookings, payments, boat sharing, staff
attendance, freelancers, dive logs, certifications, finance transactions, reviews,
social posts and CRM follow-ups — everything the dashboard needs to look alive.
It also runs the same default-admin bootstrap as step 5, so a fresh database is
always left with a working login.

The rest of the seed creates its own placeholder staff/instructor `User` rows
(fixed UUIDs, not tied to real Supabase Auth accounts) purely so demo bookings
have realistic instructor/staff references — they cannot sign in. Your Super
Admin account from step 5 is separate and unaffected.

### Troubleshooting: "No staff profile is linked to this account"

This means a Supabase Auth account exists but has no matching row in
`public.users` — usually because the account was created before
`auth_trigger.sql` (step 4) was installed, since the trigger only fires on new
signups. Fix it by either:

- Running `npm run db:bootstrap-admin` (only auto-heals the specific
  `DEFAULT_ADMIN_EMAIL` account, and only while no SUPER_ADMIN exists yet), or
- Running `prisma/sql/backfill_missing_profiles.sql` in the Supabase SQL editor,
  which back-fills a profile for every `auth.users` row that's missing one (then
  set the right role for each by hand).

Signing in again with the default admin's email after either fix will now
succeed and land on the dashboard — the sign-in flow itself also self-heals this
one specific case automatically (see `src/actions/auth.ts`), so if you're using
the default admin email you may not need to run anything at all.

### 7. Run the app

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Available scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Run the production build |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:migrate` | Create/apply a migration (dev) |
| `npm run db:deploy` | Apply pending migrations (CI/production) |
| `npm run db:seed` | Run `prisma/seed.ts` (also ensures the default admin) |
| `npm run db:bootstrap-admin` | Ensure the default SUPER_ADMIN account exists, without touching any other data |
| `npm run db:studio` | Open Prisma Studio |

## Deployment

### Database & Auth (Supabase)

1. Use the same Supabase project as local dev, or create a production project.
2. Run `npm run db:deploy` with `DATABASE_URL`/`DIRECT_URL` pointed at it (or use
   the Vercel build step below).
3. Run `prisma/sql/auth_trigger.sql` in the SQL editor.
4. Invite your production Super Admin (see step 5 above).

### App (Vercel)

1. Import the repository into Vercel.
2. Add the environment variables from `.env.example` (production Supabase values)
   in the Vercel project settings.
3. Set the build command to `npx prisma generate && npx prisma migrate deploy && next build`
   (or run `db:deploy` as a separate release step) so migrations apply on deploy.
4. Deploy. Vercel builds with Next.js 15 out of the box — no extra config needed.

## Security notes

- All application data access goes through Prisma using the trusted server-side
  `DATABASE_URL` connection — pages, server actions and route handlers all run
  `requireUser()` / `requireModuleAccess()` before touching the database.
- The Supabase `anon` key is only used for auth (sign-in/session), never for direct
  table access, so table-level RLS policies are not required for this app's own
  request path. If you later expose Supabase's REST/GraphQL API or client-side
  table queries, add RLS policies to `public.*` tables at that point.
- Never commit `.env` — only `.env.example` (with placeholder values) is tracked.

## Roadmap

- **Phase 3** — Finance, Reports, Analytics
- **Phase 4** — Social Media, CRM, Notifications, Excel Import
- **Phase 5** — Testing, optimization, production deployment hardening

Each phase builds on the schema already defined in `prisma/schema.prisma`, which
models every module up front (bookings, boat sharing, staff/freelancer attendance
and payments, snacks, dive logs, certifications, finance transactions, Google
reviews, social media, CRM follow-ups, notifications, seasons).
