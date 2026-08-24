create extension if not exists pgcrypto;

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  cafe_slug text not null,
  author_name text not null check (char_length(author_name) between 1 and 60),
  rating int not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 500),
  created_at timestamptz not null default now()
);

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
    char_length(author_name) between 1 and 60
    and rating between 1 and 5
  );
