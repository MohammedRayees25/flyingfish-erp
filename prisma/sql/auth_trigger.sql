-- Run this once in the Supabase SQL editor AFTER applying Prisma migrations
-- (`npx prisma migrate deploy`), so that `public.users` already exists.
--
-- It keeps `public.users` (the app's staff profile table, modelled by
-- Prisma's `User`) in sync with Supabase's own `auth.users` table: every
-- time someone is invited / signs up in Supabase Auth, a matching profile
-- row is created automatically with the same id.
--
-- To control the initial role, set the `role` key in the invited user's
-- `raw_user_meta_data` (e.g. when calling `supabase.auth.admin.inviteUserByEmail`
-- pass `{ data: { full_name: "...", role: "MANAGER" } }`). Defaults to
-- INSTRUCTOR when omitted.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, email, "fullName", role, "isActive", "createdAt", "updatedAt")
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data ->> 'role')::"UserRole", 'INSTRUCTOR'),
    true,
    now(),
    now()
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_auth_user();

-- Keep email in sync if it's changed from the Supabase Auth side.
create or replace function public.handle_auth_user_email_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.users set email = new.email, "updatedAt" = now() where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_updated on auth.users;

create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row execute procedure public.handle_auth_user_email_update();
