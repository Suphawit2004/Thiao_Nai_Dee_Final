create extension if not exists pgcrypto;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  cafe_slug text not null,
  author_name text not null check (char_length(author_name) between 1 and 60),
  rating int not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 500),
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.reviews add column if not exists user_id uuid references auth.users (id) on delete set null;

-- One review per account per cafe (guest reviews have no user_id)
create unique index if not exists reviews_user_cafe_uniq
  on public.reviews (user_id, cafe_slug)
  where user_id is not null;

create index if not exists reviews_cafe_slug_idx on public.reviews (cafe_slug);

alter table public.reviews enable row level security;

drop policy if exists "reviews_select_public" on public.reviews;
create policy "reviews_select_public"
  on public.reviews for select
  using (true);

drop policy if exists "reviews_insert_public" on public.reviews;
create policy "reviews_insert_public"
  on public.reviews for insert
  with check (
    char_length(cafe_slug) <= 100
    and char_length(author_name) between 1 and 60
    and rating between 1 and 5
    and (comment is null or char_length(comment) <= 500)
    and (user_id is null or user_id = auth.uid())
  );

-- ============================================================
-- profiles — one row per authenticated user (auto-created)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 60),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(coalesce(new.email, 'member'), '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- favorites — saved cafes per user
-- ============================================================
create table if not exists public.favorites (
  user_id uuid not null references auth.users (id) on delete cascade,
  cafe_slug text not null check (char_length(cafe_slug) <= 100),
  created_at timestamptz not null default now(),
  primary key (user_id, cafe_slug)
);

create index if not exists favorites_cafe_slug_idx on public.favorites (cafe_slug);

alter table public.favorites enable row level security;

drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own"
  on public.favorites for select
  using (auth.uid() = user_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own"
  on public.favorites for insert
  with check (auth.uid() = user_id and char_length(cafe_slug) <= 100);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own"
  on public.favorites for delete
  using (auth.uid() = user_id);

-- ============================================================
-- cafe_suggestions — public submissions awaiting admin review
-- (insert-only for anon/authenticated; read via service role or admin UI later)
-- ============================================================
create table if not exists public.cafe_suggestions (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  address text check (char_length(address) <= 300),
  lat double precision not null check (lat between -90 and 90),
  lng double precision not null check (lng between -180 and 180),
  open_time text,
  close_time text,
  price_range int check (price_range between 1 and 2),
  note text check (char_length(note) <= 500),
  photo_url text,
  contact text check (char_length(contact) <= 120),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table public.cafe_suggestions drop constraint if exists suggestions_photo_url_check;
alter table public.cafe_suggestions add constraint suggestions_photo_url_check
  check (photo_url is null or char_length(photo_url) <= 500);

alter table public.cafe_suggestions enable row level security;

drop policy if exists "suggestions_insert_public" on public.cafe_suggestions;
create policy "suggestions_insert_public"
  on public.cafe_suggestions for insert
  with check (
    char_length(name) between 1 and 120
    and (address is null or char_length(address) <= 300)
    and lat between -90 and 90
    and lng between -180 and 180
    and (price_range is null or price_range between 1 and 2)
    and (note is null or char_length(note) <= 500)
    and (photo_url is null or char_length(photo_url) <= 500)
    and (contact is null or char_length(contact) <= 120)
  );

-- ============================================================
-- data_reports — report incorrect cafe data / request updates
-- (insert-only for anon/authenticated)
-- ============================================================
create table if not exists public.data_reports (
  id uuid primary key default gen_random_uuid(),
  cafe_slug text not null check (char_length(cafe_slug) <= 100),
  field text not null check (field in ('hours', 'phone', 'address', 'location', 'closed_days', 'other')),
  message text not null check (char_length(message) between 1 and 500),
  suggested_value text check (char_length(suggested_value) <= 300),
  contact text check (char_length(contact) <= 120),
  status text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  created_at timestamptz not null default now()
);

alter table public.data_reports enable row level security;

drop policy if exists "data_reports_insert_public" on public.data_reports;
create policy "data_reports_insert_public"
  on public.data_reports for insert
  with check (
    char_length(cafe_slug) <= 100
    and field in ('hours', 'phone', 'address', 'location', 'closed_days', 'other')
    and char_length(message) between 1 and 500
    and (suggested_value is null or char_length(suggested_value) <= 300)
    and (contact is null or char_length(contact) <= 120)
  );

-- ============================================================
-- storage — cafe suggestion photos (public bucket, insert-only)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('cafe-suggestions', 'cafe-suggestions', true)
on conflict (id) do nothing;

drop policy if exists "suggestion_photos_insert" on storage.objects;
create policy "suggestion_photos_insert"
  on storage.objects for insert
  with check (
    bucket_id = 'cafe-suggestions'
    and (storage.objects.metadata ->> 'mimetype') in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')
    and coalesce((storage.objects.metadata ->> 'size')::numeric, 0) <= 5242880
  );

-- ============================================================
-- admins - email allowlist for the moderation UI (/admin)
-- Seed with: insert into public.admins (email)
--            values ('you@example.com') on conflict do nothing;
-- RLS enabled with zero policies: clients can only reach it through the
-- is_admin() SECURITY DEFINER function; direct reads/writes are denied.
-- ============================================================
create table if not exists public.admins (
  email text primary key
);

alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.email(), ''))
  );
$$;

-- ============================================================
-- Admin moderation policies
-- ============================================================

drop policy if exists "suggestions_select_admin" on public.cafe_suggestions;
create policy "suggestions_select_admin"
  on public.cafe_suggestions for select
  using (public.is_admin());

drop policy if exists "suggestions_update_admin" on public.cafe_suggestions;
create policy "suggestions_update_admin"
  on public.cafe_suggestions for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "data_reports_select_admin" on public.data_reports;
create policy "data_reports_select_admin"
  on public.data_reports for select
  using (public.is_admin());

drop policy if exists "data_reports_update_admin" on public.data_reports;
create policy "data_reports_update_admin"
  on public.data_reports for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "reviews_delete_admin" on public.reviews;
create policy "reviews_delete_admin"
  on public.reviews for delete
  using (public.is_admin());

-- ============================================================
-- rate_limits — fixed-window counters for durable rate limiting
-- ============================================================
create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count int not null default 1,
  primary key (key, window_start)
);

create index if not exists rate_limits_window_start_idx on public.rate_limits (window_start);

alter table public.rate_limits enable row level security;

-- No policies: only server-side (service role or trusted function) should access.
-- We use a SECURITY DEFINER function for atomic increment + check.

create or replace function public.check_rate_limit(
  p_key text,
  p_limit int,
  p_window_seconds int
)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_window_start timestamptz;
  v_count int;
begin
  v_window_start := date_trunc('second', now()) - (date_trunc('second', now()) - '1970-01-01'::timestamptz) % (p_window_seconds || ' seconds')::interval;
  
  insert into public.rate_limits (key, window_start, count)
  values (p_key, v_window_start, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into v_count;
  
  return v_count <= p_limit;
end;
$$;

-- Cleanup old rate limit entries (run periodically via pg_cron or manually)
create or replace function public.cleanup_rate_limits(p_older_than interval default '2 hours')
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  delete from public.rate_limits
  where window_start < now() - p_older_than;
end;
$$;
