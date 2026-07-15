-- Read-only. Run this against production FIRST, before touching anything,
-- to find out exactly which parts of the schema already exist and whether
-- Prisma Migrate has ever tracked history for this database. Nothing here
-- writes data or changes schema.
--
-- How to read the results:
--  1. If prisma_migrations_table is NULL, Prisma has never tracked this
--     database's migration history (even if the tables below already
--     exist) -- this is what causes P3005 ("database schema is not
--     empty") when `prisma migrate deploy` is run against it. See
--     prisma/sql/phase3_staff_salary_baseline.sql and the "Baselining an
--     existing production database" section in README.md.
--  2. If prisma_migrations_table is NOT NULL, check the second query's
--     output against the three migration folders in prisma/migrations/ --
--     any migration name missing from that list has not been applied yet.
--  3. The last three queries tell you directly whether the Phase 2
--     (activity_rates, boat_vendor_payments) and Phase 3 (monthlySalary,
--     staff_salary_payments) additions are already present, independent
--     of what Prisma's bookkeeping says.

select to_regclass('public._prisma_migrations') as prisma_migrations_table;

-- Only meaningful if the query above did not return NULL -- if the table
-- doesn't exist yet, this next query will itself error with "relation
-- _prisma_migrations does not exist", which is expected and tells you the
-- same thing (skip straight to the baselining section in README.md).
select migration_name, finished_at, rolled_back_at
from "_prisma_migrations"
order by finished_at;

select column_name
from information_schema.columns
where table_name = 'users' and column_name = 'monthlySalary';

select
  to_regclass('public.staff_salary_payments') as staff_salary_payments_table,
  to_regclass('public.activity_rates')        as activity_rates_table,
  to_regclass('public.boat_vendor_payments')  as boat_vendor_payments_table;
