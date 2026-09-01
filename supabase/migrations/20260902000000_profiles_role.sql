-- ============================================================
-- Admin via profiles.role (replace admins email allowlist)
-- ============================================================

-- Add role column to profiles
alter table public.profiles add column if not exists role text not null default 'user'
  check (role in ('user', 'admin'));

-- Populate email for all profiles from auth.users (handles existing profiles with NULL email)
update public.profiles p
set email = u.email
from auth.users u
where p.id = u.id;

-- Backfill existing admins from admins table -> profiles.role
update public.profiles p
set role = 'admin'
where lower(coalesce(p.email, '')) in (select lower(email) from public.admins)
  and p.role = 'user';

-- Rewrite is_admin() to check role on current user's profile
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- First-user auto-admin: modify handle_new_user() to make the first profile admin
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- If this is the very first user, make them admin
  if not exists (select 1 from public.profiles) then
    insert into public.profiles (id, display_name, email, role)
    values (
      new.id,
      coalesce(
        new.raw_user_meta_data ->> 'display_name',
        split_part(coalesce(new.email, 'member'), '@', 1)
      ),
      new.email,
      'admin'
    )
    on conflict (id) do update set role = 'admin';
  else
    insert into public.profiles (id, display_name, email)
    values (
      new.id,
      coalesce(
        new.raw_user_meta_data ->> 'display_name',
        split_part(coalesce(new.email, 'member'), '@', 1)
      ),
      new.email
    )
    on conflict (id) do update set email = excluded.email;
  end if;
  return new;
end;
$$;

-- Admin can update any profile's role (for add/remove admin in User Management)
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

-- Drop admins table + policies (after is_admin rewrite + backfill)
drop policy if exists "admins_select_admin" on public.admins;
drop policy if exists "admins_insert_admin" on public.admins;
drop policy if exists "admins_delete_admin" on public.admins;
drop table if exists public.admins;