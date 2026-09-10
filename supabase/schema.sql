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

drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own"
  on public.reviews for delete
  using (user_id = auth.uid());

-- ============================================================
-- profiles — one row per authenticated user (auto-created)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 60),
  avatar_url text check (avatar_url is null or char_length(avatar_url) <= 500),
  role text not null default 'user',
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
    substring(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
        split_part(coalesce(new.email, 'member'), '@', 1)
      )
      from 1 for 60
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

-- storage — user profile avatars
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_insert_own" on storage.objects;
create policy "avatars_insert_own"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
    and (storage.objects.metadata ->> 'mimetype') in ('image/jpeg', 'image/png', 'image/webp')
    and coalesce((storage.objects.metadata ->> 'size')::numeric, 0) <= 5242880
  );

drop policy if exists "avatars_update_own" on storage.objects;
create policy "avatars_update_own"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars_delete_own" on storage.objects;
create policy "avatars_delete_own"
  on storage.objects for delete
  using (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
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
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
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
  v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  
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
-- Complete Cafe Features: Relational Catalogue, Menus, Photos & Assistant
-- ============================================================

create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- Assistant Quota Tracking
create table if not exists private.assistant_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  requests integer not null default 1,
  primary key (user_id, day)
);
alter table private.assistant_usage enable row level security;
revoke all on private.assistant_usage from public, anon, authenticated;

create or replace function private.consume_assistant_quota() returns boolean
language plpgsql security definer set search_path = '' as $$
declare total integer; caller uuid := auth.uid();
begin
  if caller is null then return false; end if;
  insert into private.assistant_usage(user_id, day) values (caller, current_date)
  on conflict (user_id, day) do update set requests = private.assistant_usage.requests + 1
  returning requests into total;
  return total <= 30;
end $$;
revoke all on function private.consume_assistant_quota() from public, anon;
grant execute on function private.consume_assistant_quota() to authenticated;

create or replace function public.consume_assistant_quota() returns boolean
language sql security invoker set search_path = ''
as $$ select private.consume_assistant_quota(); $$;
revoke all on function public.consume_assistant_quota() from public, anon;
grant execute on function public.consume_assistant_quota() to authenticated;

-- Cafes Catalogue Table
create table if not exists public.cafes (
  slug text primary key,
  name_th text not null,
  name_en text not null default '',
  description_th text not null default '',
  description_en text not null default '',
  address_th text not null default '',
  address_en text not null default '',
  phone text,
  open_time text not null default '08:00',
  close_time text not null default '17:00',
  closed_days integer[] not null default '{}',
  price_range integer not null default 1,
  tags text[] not null default '{}',
  lifestyle_tags text[] not null default '{}',
  area text not null default 'lakeside',
  lat double precision not null,
  lng double precision not null,
  photo text,
  menu_highlights jsonb not null default '[]',
  base_rating numeric not null default 0,
  is_active boolean not null default true,
  owner_id uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.cafes drop constraint if exists cafes_feature_validation;
alter table public.cafes add constraint cafes_feature_validation check (
  length(name_th) between 1 and 160 and lat between 19 and 20 and lng between 99.6 and 100.2
  and area in ('lakeside','maeka-uni') and price_range in (1,2)
  and open_time::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:00)?$'
  and close_time::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:00)?$'
  and closed_days <@ array[0,1,2,3,4,5,6] and base_rating between 0 and 5
  and tags <@ array['work','chill','view','dessert']
  and lifestyle_tags <@ array['quiet','wifi','pet-friendly','parking','open-late','photo','family']
);

create table if not exists public.cafe_owners (
  cafe_slug text primary key references public.cafes(slug) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade
);
create index if not exists cafe_owners_user_idx on public.cafe_owners(user_id);

alter table public.cafes enable row level security;
alter table public.cafe_owners enable row level security;
revoke all on public.cafes, public.cafe_owners from anon, authenticated;
grant select on public.cafes to anon, authenticated;
grant insert on public.cafes to authenticated;
grant update(name_th,name_en,description_th,description_en,address_th,address_en,phone,open_time,close_time,closed_days,price_range,tags,lifestyle_tags,area,lat,lng,photo,menu_highlights,base_rating,is_active) on public.cafes to authenticated;
grant select, insert, update, delete on public.cafe_owners to authenticated;

drop policy if exists cafes_read on public.cafes;
create policy cafes_read on public.cafes for select to anon, authenticated using (is_active or (select public.is_admin()));

drop policy if exists owners_read on public.cafe_owners;
create policy owners_read on public.cafe_owners for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists owners_admin on public.cafe_owners;
create policy owners_admin on public.cafe_owners for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create or replace function public.is_owner(p_slug text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists(select 1 from public.cafe_owners where cafe_slug = p_slug and user_id = auth.uid());
$$;

create or replace function public.get_my_cafes() returns setof public.cafes
language sql stable security invoker set search_path = '' as $$
  select * from public.cafes where slug in (select cafe_slug from public.cafe_owners where user_id = auth.uid());
$$;

drop policy if exists cafes_publish on public.cafes;
create policy cafes_publish on public.cafes for insert to authenticated with check ((select public.is_admin()));

drop policy if exists cafes_edit on public.cafes;
create policy cafes_edit on public.cafes for update to authenticated
  using ((select public.is_admin()) or slug in (select cafe_slug from public.cafe_owners where user_id = (select auth.uid())))
  with check ((select public.is_admin()) or (is_active and slug in (select cafe_slug from public.cafe_owners where user_id = (select auth.uid()))));

-- Menu Items
create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  cafe_slug text not null references public.cafes(slug) on delete cascade,
  name_th text not null check (length(name_th) between 1 and 120),
  name_en text not null default '',
  price numeric(10,2) not null check (price >= 0 and price <= 100000),
  photo_url text check (photo_url is null or photo_url ~ '^https://'),
  is_available boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists menu_items_slug_idx on public.menu_items(cafe_slug);
alter table public.menu_items enable row level security;
revoke all on public.menu_items from anon, authenticated;
grant select on public.menu_items to anon, authenticated;
grant insert, update, delete on public.menu_items to authenticated;

drop policy if exists menu_read on public.menu_items;
create policy menu_read on public.menu_items for select to anon, authenticated using (true);

drop policy if exists menu_manage on public.menu_items;
create policy menu_manage on public.menu_items for all to authenticated
  using ((select public.is_admin()) or cafe_slug in (select cafe_slug from public.cafe_owners where user_id = (select auth.uid())))
  with check ((select public.is_admin()) or cafe_slug in (select cafe_slug from public.cafe_owners where user_id = (select auth.uid())));

-- Community Photos
create table if not exists public.cafe_photos (
  id uuid primary key default gen_random_uuid(),
  cafe_slug text not null references public.cafes(slug) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null unique,
  caption text not null default '' check (length(caption) <= 300),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  check (split_part(path, '/', 1) = user_id::text)
);
create index if not exists cafe_photos_slug_idx on public.cafe_photos(cafe_slug, created_at desc);
create index if not exists cafe_photos_user_idx on public.cafe_photos(user_id);
alter table public.cafe_photos enable row level security;
revoke all on public.cafe_photos from anon, authenticated;
grant select on public.cafe_photos to anon, authenticated;
grant insert, delete on public.cafe_photos to authenticated;
grant update(is_public, caption) on public.cafe_photos to authenticated;

drop policy if exists photos_read on public.cafe_photos;
create policy photos_read on public.cafe_photos for select to anon, authenticated
  using (is_public or user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists photos_add on public.cafe_photos;
create policy photos_add on public.cafe_photos for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists photos_edit on public.cafe_photos;
create policy photos_edit on public.cafe_photos for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists photos_delete on public.cafe_photos;
create policy photos_delete on public.cafe_photos for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Buckets
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cafe-community', 'cafe-community', false, 5242880, array['image/jpeg','image/png','image/webp']),
       ('cafe-media', 'cafe-media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists community_upload on storage.objects;
create policy community_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'cafe-community' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists community_read on storage.objects;
create policy community_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'cafe-community' and (exists (select 1 from public.cafe_photos p where p.path = name)
    or (storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

drop policy if exists community_delete on storage.objects;
create policy community_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cafe-community' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));

drop policy if exists cafe_media_upload on storage.objects;
create policy cafe_media_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'cafe-media' and ((select public.is_admin())
    or (storage.foldername(name))[1] in (select cafe_slug from public.cafe_owners where user_id = (select auth.uid()))));

drop policy if exists cafe_media_delete on storage.objects;
create policy cafe_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cafe-media' and ((select public.is_admin())
    or (storage.foldername(name))[1] in (select cafe_slug from public.cafe_owners where user_id = (select auth.uid()))));

-- Suggestion Publication Function
create or replace function public.publish_cafe_suggestion(suggestion_id uuid) returns text
language plpgsql security invoker set search_path = '' as $$
declare s public.cafe_suggestions; new_slug text;
begin
  if not public.is_admin() then raise exception 'Not authorized'; end if;
  select * into s from public.cafe_suggestions where id = suggestion_id for update;
  if not found then raise exception 'Suggestion not found'; end if;
  new_slug := 'cafe-' || s.id::text;
  if s.open_time is null or s.close_time is null or s.address is null then
    raise exception 'Please provide address and opening hours before publishing';
  end if;
  insert into public.cafes(slug,name_th,name_en,description_th,address_th,lat,lng,photo,open_time,close_time,price_range,area)
  values (new_slug,s.name,s.name,coalesce(s.note,''),s.address,s.lat,s.lng,s.photo_url,
    to_char(s.open_time::time,'HH24:MI'),to_char(s.close_time::time,'HH24:MI'),
    coalesce(s.price_range,1),case when s.lat < 19.1 then 'maeka-uni' else 'lakeside' end)
  on conflict (slug) do nothing;
  update public.cafe_suggestions set status = 'approved' where id = suggestion_id;
  return new_slug;
end $$;
revoke all on function public.publish_cafe_suggestion(uuid) from public, anon;
grant execute on function public.publish_cafe_suggestion(uuid) to authenticated;
