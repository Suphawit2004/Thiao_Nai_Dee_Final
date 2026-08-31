-- ============================================================
-- Admin dashboard upgrade: cafes table, admin management, stats
-- ============================================================

-- ============================================================
-- cafes table — canonical cafe data (managed via /admin)
-- ============================================================
create table if not exists public.cafes (
  slug            text primary key check (char_length(slug) <= 100),
  name_th         text not null check (char_length(name_th) between 1 and 200),
  name_en         text not null check (char_length(name_en) between 1 and 200),
  description_th  text not null default '' check (char_length(description_th) <= 2000),
  description_en  text not null default '' check (char_length(description_en) <= 2000),
  address_th      text not null default '' check (char_length(address_th) <= 500),
  address_en      text not null default '' check (char_length(address_en) <= 500),
  phone           text check (phone is null or char_length(phone) <= 30),
  open_time       text not null check (char_length(open_time) <= 10),
  close_time      text not null check (char_length(close_time) <= 10),
  closed_days     int[] not null default '{}',
  price_range     int not null check (price_range between 1 and 2),
  tags            text[] not null default '{}',
  lifestyle_tags  text[] not null default '{}',
  area            text not null check (area in ('lakeside', 'maeka-uni')),
  lat             double precision not null check (lat between -90 and 90),
  lng             double precision not null check (lng between -180 and 180),
  photo           text check (photo is null or char_length(photo) <= 500),
  menu_highlights jsonb not null default '[]',
  base_rating     numeric(2,1) not null default 4.0 check (base_rating between 0 and 5),
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists cafes_area_idx on public.cafes (area);
create index if not exists cafes_is_active_idx on public.cafes (is_active) where is_active = true;

alter table public.cafes enable row level security;

-- Public read (cafes are public data)
drop policy if exists "cafes_select_public" on public.cafes;
create policy "cafes_select_public"
  on public.cafes for select
  using (true);

-- Admin full CRUD
drop policy if exists "cafes_insert_admin" on public.cafes;
create policy "cafes_insert_admin"
  on public.cafes for insert
  with check (public.is_admin());

drop policy if exists "cafes_update_admin" on public.cafes;
create policy "cafes_update_admin"
  on public.cafes for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "cafes_delete_admin" on public.cafes;
create policy "cafes_delete_admin"
  on public.cafes for delete
  using (public.is_admin());

-- updated_at trigger
create or replace function public.update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists cafes_updated_at on public.cafes;
create trigger cafes_updated_at
  before update on public.cafes
  for each row execute function public.update_updated_at();

-- ============================================================
-- profiles — email column for admin user management + admin read
-- ============================================================
alter table public.profiles add column if not exists email text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
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
  return new;
end;
$$;

drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  using (public.is_admin());

-- ============================================================
-- admins — admin-only management of admin list
-- ============================================================
drop policy if exists "admins_select_admin" on public.admins;
create policy "admins_select_admin"
  on public.admins for select
  using (public.is_admin());

drop policy if exists "admins_insert_admin" on public.admins;
create policy "admins_insert_admin"
  on public.admins for insert
  with check (public.is_admin());

drop policy if exists "admins_delete_admin" on public.admins;
create policy "admins_delete_admin"
  on public.admins for delete
  using (public.is_admin());
