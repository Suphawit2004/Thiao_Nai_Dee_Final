-- ============================================================
-- Owner role + full menu management
-- ------------------------------------------------------------
-- Adds:
--   profiles.role            'owner' (in addition to 'user' / 'admin')
--   cafes.owner_id           the auth user who owns the cafe (nullable)
--   menu_items               full menu per cafe (name/en, price, category)
--   owner_requests           users requesting to claim a cafe (admin approves)
--   is_owner(slug) RPC       RLS + server helper
--   get_my_cafes()           RPC returning cafes owned by the current user
-- Idempotent — safe to run repeatedly.
-- ============================================================

-- ------------------------------------------------------------
-- profiles — allow 'owner' role
-- ------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('user', 'admin', 'owner'));

-- ------------------------------------------------------------
-- cafes — link to owning user
-- ------------------------------------------------------------
alter table public.cafes add column if not exists owner_id uuid
  references auth.users (id) on delete set null;

create index if not exists cafes_owner_idx on public.cafes (owner_id);

-- ------------------------------------------------------------
-- menu_items — full menu per cafe
-- ------------------------------------------------------------
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

-- Public read: any visitor can view a cafe's menu
drop policy if exists "menu_items_select_public" on public.menu_items;
create policy "menu_items_select_public"
  on public.menu_items for select
  using (true);

-- Owner (or admin) manages their cafe's menu
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

-- ------------------------------------------------------------
-- owner_requests — users claiming a cafe, awaiting admin review
-- ------------------------------------------------------------
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

-- Public read so the requester can see their own request status
drop policy if exists "owner_requests_select_own_or_admin" on public.owner_requests;
create policy "owner_requests_select_own_or_admin"
  on public.owner_requests for select
  using (auth.uid() = user_id or public.is_admin());

-- Signed-in user can request ownership of a cafe they don't already own
drop policy if exists "owner_requests_insert_self" on public.owner_requests;
create policy "owner_requests_insert_self"
  on public.owner_requests for insert
  with check (
    auth.uid() = user_id
    and status = 'pending'
    and not public.is_owner(cafe_slug)
  );

-- Admin approves/rejects
drop policy if exists "owner_requests_update_admin" on public.owner_requests;
create policy "owner_requests_update_admin"
  on public.owner_requests for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "owner_requests_delete_admin" on public.owner_requests;
create policy "owner_requests_delete_admin"
  on public.owner_requests for delete
  using (public.is_admin());

-- ------------------------------------------------------------
-- is_owner(slug) — is the current user the owner of this cafe?
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- get_my_cafes() — cafes owned by the current user
-- Returns the cafe row(s) the caller owns. Admin sees everything the
-- caller owns (empty normally) — no special admin exposure here.
-- ------------------------------------------------------------
create or replace function public.get_my_cafes()
returns setof public.cafes
language sql
stable
security definer set search_path = public
as $$
  select * from public.cafes where owner_id = auth.uid();
$$;

-- ------------------------------------------------------------
-- cafes update — let an owner edit their own cafe (used later; safe now)
-- ------------------------------------------------------------
drop policy if exists "cafes_update_owner" on public.cafes;
create policy "cafes_update_owner"
  on public.cafes for update
  using (public.is_owner(slug))
  with check (public.is_owner(slug));
