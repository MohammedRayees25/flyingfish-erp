-- Run this in the Supabase SQL editor if you have existing accounts in
-- auth.users with no matching row in public.users — e.g. accounts created
-- before auth_trigger.sql was installed. The trigger only fires on new
-- inserts, so it can't retroactively fix accounts that already existed.
--
-- Safe to run more than once (ON CONFLICT DO NOTHING). New profiles default
-- to the INSTRUCTOR role — update roles afterward as needed, e.g.:
--   update public.users set role = 'SUPER_ADMIN' where email = 'admin@flyingfish.in';

insert into public.users (id, email, "fullName", role, "isActive", "createdAt", "updatedAt")
select
  au.id,
  au.email,
  coalesce(au.raw_user_meta_data ->> 'full_name', split_part(au.email, '@', 1)),
  coalesce((au.raw_user_meta_data ->> 'role')::"UserRole", 'INSTRUCTOR'),
  true,
  now(),
  now()
from auth.users au
left join public.users pu on pu.id = au.id
where pu.id is null
on conflict (id) do nothing;
