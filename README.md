# Flying Fish Scuba School — Operations ERP

An enterprise-grade ERP that replaces Flying Fish Scuba School's Excel sheets and
becomes the single source of truth for guests, bookings, boat sharing, staff,
freelancers, finance, certifications, marketing and reporting.

Built with Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui, Prisma,
Supabase (Postgres + Auth), React Hook Form, Zod, TanStack Table and Recharts.

> **Status: Phase 4 complete** — every planned module is implemented and live:
> Authentication & RBAC, the CEO Dashboard, Guest Management, Bookings, Boat
> Sharing, Staff Attendance, Freelancer Management, Finance, Reports, Analytics,
> Novotel Snacks, Dive Logs, Certifications, Google Reviews, Social Media, CRM
> and Settings. See [Roadmap](#roadmap) for post-launch hardening work.

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
| Reports | ExcelJS (Excel export across every module), PDF export (React-PDF — daily/weekly/monthly/seasonal/revenue/expense/profit/dive-log/certification reports) |
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
  migrations/              Prisma Migrate history (one folder per phase)
  sql/                     auth_trigger.sql, baselining/backfill scripts (see Deployment)
src/
  app/
    login/                 Public login page
    (app)/                 Authenticated shell (sidebar + topbar)
      page.tsx             CEO dashboard (live metrics across every module)
      guests/               Guest Management
      bookings/             Booking Management (list + calendar)
      boat-sharing/         Boat Sharing (entries, pending payments, reports)
      staff/                 Staff Attendance (daily, monthly, leave)
      freelancers/           Freelancer Management (profile, attendance, payments)
      finance/               Revenue/expense, P&L, cash flow, staff salary
      reports/                Daily/weekly/monthly/seasonal/entity reports, PDF/Excel/CSV export
      analytics/              Executive dashboards & trend charts
      snacks/                 Novotel Snacks — inventory, purchases, consumption
      dive-logs/              Dive Logs — full dive record, guests, photos
      certifications/         PADI/SSI certification tracking & courses
      reviews/                Google Reviews — ratings, sentiment, keyword analytics
      social/                 Social Media — Instagram/Facebook/YouTube performance
      crm/                    CRM — lead pipeline, kanban board, follow-ups
      settings/               Company profile, users & roles, pricing, audit log
    api/
      reports/                Excel/PDF export route handlers, one per module
      settings/export/        JSON data snapshot export
  actions/                 Server actions, one file per module
  components/
    ui/                    Hand-vendored shadcn/ui primitives
    dashboard/              Dashboard widgets (stat cards, charts, ranked lists)
    <module>/                Module-specific tables, forms, charts (mirrors src/app/(app)/<module>)
  lib/
    supabase/               Browser / server / middleware / admin Supabase clients
    auth/                   requireUser / requireModuleAccess helpers
    prisma.ts               Prisma client singleton
    permissions.ts          Role → module access map
    dashboard.ts             Dashboard data aggregation queries (every module)
    boat-sharing.ts          Automatic FF/DG/SEI cost-split calculator (shared client+server)
    reference-data.ts        Instructor/boat/dive-site/activity-rate lookups
    reports/                 Shared ReportTable type + PDF/Excel/CSV renderers
    validations/             Zod schemas, one file per module
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
2. Run `npm run db:deploy` with `DATABASE_URL`/`DIRECT_URL` pointed at it, **from your
   own machine, before deploying** — see "Applying migrations to production" below for
   why this must not run as part of the Vercel build.
3. Run `prisma/sql/auth_trigger.sql` in the SQL editor.
4. Invite your production Super Admin (see step 5 above).

### App (Vercel)

1. Import the repository into Vercel.
2. Add the environment variables from `.env.example` (production Supabase values)
   in the Vercel project settings.
3. Leave the build command as `npm run build` (`prisma generate && next build`). Do
   **not** add `prisma migrate deploy` to it — see below.
4. Deploy. Vercel builds with Next.js 15 out of the box — no extra config needed.

### Applying migrations to production

Run `npm run db:deploy` (`prisma migrate deploy`) **manually, from your own machine or
a dedicated CI step**, with production `DATABASE_URL`/`DIRECT_URL` — never wire it into
the Vercel build command. Two reasons:

- The Vercel build environment doesn't have a stable, single point of access to run
  schema-changing SQL from — running migrations as a side effect of every deploy means
  every push (including preview deployments, retries, and rollback rebuilds) attempts to
  mutate the production schema, which is more blast radius than a build step should have.
- If the database wasn't originally provisioned by Prisma Migrate (e.g. its tables were
  created directly in Supabase, via `db push`, or by hand), `prisma migrate deploy` fails
  immediately with **`P3005: The database schema is not empty`** — Prisma refuses to
  guess which of its migrations are already reflected in a database it has no tracked
  history for. See "Baselining an existing production database" below if you hit this.

#### Baselining an existing production database

If your production database already has tables (from `db push`, manual setup, or an
earlier deploy) but was never migrated through Prisma, `prisma migrate deploy` will fail
with P3005. Fix this once, in order:

1. **Inspect first, don't guess.** Run `prisma/sql/check_migration_state.sql` in the
   Supabase SQL editor (read-only, changes nothing) to see whether
   `_prisma_migrations` exists yet and which of the Phase 2/3 tables/columns
   (`activity_rates`, `boat_vendor_payments`, `users.monthlySalary`,
   `staff_salary_payments`) are already present.
2. **Baseline the migrations whose changes are already present.** For each migration
   folder under `prisma/migrations/` in order, if its changes already exist in the
   database, mark it applied without running its SQL:
   ```bash
   npx prisma migrate resolve --applied 20260713193926_init
   npx prisma migrate resolve --applied 20260714064455_phase2_activity_rates_vendor_payments
   ```
   Do **not** resolve a migration this way if its changes are *not* actually present —
   that would permanently hide the drift instead of fixing it.
3. **Apply whatever's genuinely missing for real.** If, per step 1, only the Phase 3
   columns are missing, run `npx prisma migrate deploy` once, manually, with production
   credentials — since it's now correctly baselined, it will apply only the one
   remaining pending migration (`20260714175608_phase3_staff_salary`) and record it.
   If you'd rather not touch Prisma's migration bookkeeping at all right now,
   `prisma/sql/phase3_staff_salary_baseline.sql` has the same DDL with `IF NOT EXISTS`
   guards so it can be run directly in the SQL editor instead — non-destructive and
   safe to run more than once.
4. **Verify:** `npx prisma migrate status` should report the schema is up to date, with
   no pending migrations.

After baselining, keep applying future migrations the same way — `npm run db:deploy`
run deliberately before/alongside a deploy, never inside the Vercel build.

#### Repairing a drifted production database (all phases, one shot)

If production has fallen out of sync with `prisma/schema.prisma` in ways smaller than a
full baseline — individual Phase 2/3/4 tables or columns missing, e.g. runtime errors
about `guest_certifications.openWaterDivesCompleted` or `snack_consumptions.date` not
existing — run `prisma/sql/sync_production_to_schema.sql` in the Supabase SQL editor. It:

- Creates every enum, table, index, and foreign key from the current schema with
  `IF NOT EXISTS` guards, so it's a no-op wherever the database already matches.
- Adds every column still missing from an already-existing table. A column that's
  `NOT NULL` in the schema but has no `DEFAULT` is added nullable instead (with a
  `NEEDS BACKFILL` comment) rather than failing or inventing data on tables that already
  have rows — backfill real values, then tighten with `ALTER TABLE ... SET NOT NULL`
  by hand.
- Renames any legacy lowercase-folded column (e.g. `certificatenumber` left over from an
  earlier unquoted, manual `ALTER TABLE`) to its correct camelCase name, preserving the
  data, wherever the correct column doesn't already exist.
- Ends with verification queries — missing tables, missing columns, and per-table row
  counts — so you can confirm the result and that nothing was truncated.

It contains no `DROP`, `TRUNCATE`, or other destructive statement, wraps everything in a
single transaction, and is safe to run more than once. It's a one-off repair script, not
a substitute for `prisma/migrations/*` — run `prisma/sql/check_migration_state.sql` first
if you haven't already, to see what's actually missing before running this.

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

- **Phase 1** ✅ — Auth, database schema, CEO dashboard, Guest Management
- **Phase 2** ✅ — Bookings, Boat Sharing, Staff Attendance, Freelancer Management
- **Phase 3** ✅ — Finance, Reports, Analytics
- **Phase 4** ✅ — Novotel Snacks, Dive Logs, Certifications, Google Reviews,
  Social Media, CRM, Settings — every sidebar module is now implemented
- **Phase 5** — Post-launch hardening: automated test coverage, file-storage
  integration for real photo/logo uploads (dive log photos and the company
  logo currently take a URL, since no object-storage bucket is provisioned
  yet), email/WhatsApp notification delivery (Settings has the on/off
  preference wired up; sending isn't implemented), broader audit-log coverage
  across all mutations (currently logs Settings actions)

Each phase builds on the schema already defined in `prisma/schema.prisma`, which
models every module up front (bookings, boat sharing, staff/freelancer attendance
and payments, snacks, dive logs, certifications, finance transactions, Google
reviews, social media, CRM follow-ups, notifications, seasons).
