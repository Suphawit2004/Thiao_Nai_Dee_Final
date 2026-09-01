-- ============================================================
-- FULL WIPE: all user accounts + all user-generated content
-- Keeps schema + curated cafe data.
-- ============================================================

-- user content (before auth.users; keeps FKs happy)
delete from public.reviews;
delete from public.cafe_suggestions;
delete from public.data_reports;

-- accounts + cascading tables (profiles, favorites)
delete from auth.users;

-- clean up storage files: use Storage API (Dashboard → Storage → buckets) instead
-- Direct SQL delete from storage.objects is blocked by Supabase

-- drop leftover admins allowlist table (migration 009 should have removed it)
drop table if exists public.admins;