-- ============================================================
-- Profile avatar + self-service review deletion
-- ============================================================

-- profiles.avatar_url — public URL of the user's uploaded avatar
alter table public.profiles add column if not exists avatar_url text;

alter table public.profiles drop constraint if exists profiles_avatar_url_check;
alter table public.profiles add constraint profiles_avatar_url_check
  check (avatar_url is null or char_length(avatar_url) <= 500);

-- Allow users to delete their own reviews (admin delete already exists)
drop policy if exists "reviews_delete_own" on public.reviews;
create policy "reviews_delete_own"
  on public.reviews for delete
  using (user_id = auth.uid());

-- ============================================================
-- storage — avatars bucket (public read; users write only their
-- own top-level folder: {auth.uid()}/<uuid>.<ext>)
-- ============================================================
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
