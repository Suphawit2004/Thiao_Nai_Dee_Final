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
  email text,
  role text not null default 'user' check (role in ('user', 'admin', 'owner')),
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

-- Admin can read all profiles (for User Management)
drop policy if exists "profiles_select_admin" on public.profiles;
create policy "profiles_select_admin"
  on public.profiles for select
  using (public.is_admin());

-- Admin can update any profile's role (for add/remove admin)
drop policy if exists "profiles_update_admin" on public.profiles;
create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin())
  with check (public.is_admin());

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
-- is_admin() — checks current user's profiles.role = 'admin'
-- ============================================================
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

-- ============================================================
-- Admin moderation policies (use is_admin())
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

-- ============================================================
-- Owner role + full menu management
-- ============================================================

-- cafes — link to owning user
alter table public.cafes add column if not exists owner_id uuid
  references auth.users (id) on delete set null;
create index if not exists cafes_owner_idx on public.cafes (owner_id);

-- is_owner(slug) — is the current user the owner of this cafe?
-- Defined BEFORE the RLS policies below that reference it.
create or replace function public.is_owner(p_slug text)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.cafes
    where slug = p_slug and owner_id = auth.uid()
  );
$$;

-- get_my_cafes() — cafes owned by the current user
create or replace function public.get_my_cafes()
returns setof public.cafes
language sql
stable
security definer set search_path = public
as $$
  select * from public.cafes where owner_id = auth.uid();
$$;

-- menu_items — full menu per cafe
create table if not exists public.menu_items (
  id            uuid primary key default gen_random_uuid(),
  cafe_slug     text not null references public.cafes (slug) on delete cascade,
  name_th       text not null check (char_length(name_th) between 1 and 200),
  name_en       text check (name_en is null or char_length(name_en) <= 200),
  price         numeric(8,2) check (price is null or price >= 0),
  category      text not null default 'coffee'
                check (category in ('coffee', 'drinks', 'dessert', 'food', 'other')),
  is_available  boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists menu_items_cafe_idx on public.menu_items (cafe_slug, sort_order);
alter table public.menu_items enable row level security;

drop policy if exists "menu_items_select_public" on public.menu_items;
create policy "menu_items_select_public"
  on public.menu_items for select
  using (true);

drop policy if exists "menu_items_insert_manager" on public.menu_items;
create policy "menu_items_insert_manager"
  on public.menu_items for insert
  with check (public.is_admin() or public.is_owner(cafe_slug));

drop policy if exists "menu_items_update_manager" on public.menu_items;
create policy "menu_items_update_manager"
  on public.menu_items for update
  using (public.is_admin() or public.is_owner(cafe_slug))
  with check (public.is_admin() or public.is_owner(cafe_slug));

drop policy if exists "menu_items_delete_manager" on public.menu_items;
create policy "menu_items_delete_manager"
  on public.menu_items for delete
  using (public.is_admin() or public.is_owner(cafe_slug));

drop trigger if exists menu_items_updated_at on public.menu_items;
create trigger menu_items_updated_at
  before update on public.menu_items
  for each row execute function public.update_updated_at();

-- owner_requests — users claiming a cafe, awaiting admin review
create table if not exists public.owner_requests (
  id         uuid primary key default gen_random_uuid(),
  cafe_slug  text not null references public.cafes (slug) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  user_name  text check (user_name is null or char_length(user_name) <= 60),
  contact    text check (contact is null or char_length(contact) <= 120),
  message    text check (message is null or char_length(message) <= 500),
  status     text not null default 'pending'
             check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (cafe_slug, user_id)
);

create index if not exists owner_requests_status_idx on public.owner_requests (status);
alter table public.owner_requests enable row level security;

drop policy if exists "owner_requests_select_own_or_admin" on public.owner_requests;
create policy "owner_requests_select_own_or_admin"
  on public.owner_requests for select
  using (auth.uid() = user_id or public.is_admin());

drop policy if exists "owner_requests_insert_self" on public.owner_requests;
create policy "owner_requests_insert_self"
  on public.owner_requests for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and not public.is_owner(cafe_slug)
  );

drop policy if exists "owner_requests_update_admin" on public.owner_requests;
create policy "owner_requests_update_admin"
  on public.owner_requests for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "owner_requests_delete_admin" on public.owner_requests;
create policy "owner_requests_delete_admin"
  on public.owner_requests for delete
  using (public.is_admin());

-- cafes update — let an owner edit their own cafe
drop policy if exists "cafes_update_owner" on public.cafes;
create policy "cafes_update_owner"
  on public.cafes for update
  using (public.is_owner(slug))
  with check (public.is_owner(slug));