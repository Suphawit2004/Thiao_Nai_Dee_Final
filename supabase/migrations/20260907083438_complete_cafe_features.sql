begin;

-- Preserve existing submission validation; restrictive policies below add moderation checks.

create schema if not exists private;
grant usage on schema private to anon, authenticated;

-- Support both the repository's allowlist and existing protected profile roles.
create table if not exists public.admins (email text primary key);
alter table public.admins enable row level security;
revoke all on public.admins from anon, authenticated;
alter table public.profiles add column if not exists role text not null default 'user';
alter table public.profiles add column if not exists avatar_url text;
revoke insert, update on public.profiles from anon, authenticated;
revoke insert(role), update(role) on public.profiles from anon, authenticated;
revoke select, delete on public.profiles from anon;
grant insert(id,display_name,avatar_url), update(id,display_name,avatar_url) on public.profiles to authenticated;
grant select on public.profiles to authenticated;
create or replace function private.feature_is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and (
    exists(select 1 from public.profiles where id = auth.uid() and role = 'admin')
    or exists(select 1 from public.admins where lower(email) = lower(auth.email()))
  );
$$;
revoke all on function private.feature_is_admin() from public;
grant execute on function private.feature_is_admin() to anon, authenticated;
create or replace function public.is_admin() returns boolean
language sql stable security invoker set search_path = '' as $$ select private.feature_is_admin(); $$;
create policy feature_profiles_private on public.profiles as restrictive for select to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()));

-- An older deployment may have a permissive submission policy under another name.
create policy feature_suggestions_pending on public.cafe_suggestions as restrictive for insert to anon, authenticated with check (status = 'pending');
create policy feature_reports_pending on public.data_reports as restrictive for insert to anon, authenticated with check (status = 'pending');
create table private.assistant_usage (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null default current_date,
  requests integer not null default 1,
  primary key (user_id, day)
);
alter table private.assistant_usage enable row level security;
revoke all on private.assistant_usage from public, anon, authenticated;
create function private.consume_assistant_quota() returns boolean
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
create function public.consume_assistant_quota() returns boolean language sql security invoker set search_path = ''
as $$ select private.consume_assistant_quota(); $$;
revoke all on function public.consume_assistant_quota() from public, anon;
grant execute on function public.consume_assistant_quota() to authenticated;

-- Reuse the relational catalogue already present in the connected project.
create table if not exists public.cafes (
  slug text primary key,
  name_th text not null, name_en text not null default '',
  description_th text not null default '', description_en text not null default '',
  address_th text not null default '', address_en text not null default '', phone text,
  open_time text not null default '08:00', close_time text not null default '17:00',
  closed_days integer[] not null default '{}', price_range integer not null default 1,
  tags text[] not null default '{}', lifestyle_tags text[] not null default '{}',
  area text not null default 'lakeside', lat double precision not null, lng double precision not null,
  photo text, menu_highlights jsonb not null default '[]', base_rating numeric not null default 0,
  is_active boolean not null default true, owner_id uuid references auth.users(id),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
alter table public.cafes add constraint cafes_feature_validation check (
  length(name_th) between 1 and 160 and lat between 19 and 20 and lng between 99.6 and 100.2
  and area in ('lakeside','maeka-uni') and price_range in (1,2)
  and open_time::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:00)?$'
  and close_time::text ~ '^([01][0-9]|2[0-3]):[0-5][0-9](:00)?$'
  and closed_days <@ array[0,1,2,3,4,5,6] and base_rating between 0 and 5
  and tags <@ array['work','chill','view','dessert']
  and lifestyle_tags <@ array['quiet','wifi','pet-friendly','parking','open-late','photo','family']
);
-- Replace old permissive policies on the catalogue. Existing records stay intact.
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='cafes'
  loop execute format('drop policy %I on public.cafes',p.policyname); end loop;
end $$;
create table public.cafe_owners (
  cafe_slug text primary key references public.cafes(slug) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade
);
create index cafe_owners_user_idx on public.cafe_owners(user_id);

alter table public.cafes enable row level security;
alter table public.cafe_owners enable row level security;
revoke all on public.cafes, public.cafe_owners from anon, authenticated;
grant select on public.cafes to anon, authenticated;
grant insert on public.cafes to authenticated;
grant update(name_th,name_en,description_th,description_en,address_th,address_en,phone,open_time,close_time,closed_days,price_range,tags,lifestyle_tags,area,lat,lng,photo,menu_highlights,base_rating,is_active) on public.cafes to authenticated;
grant select, insert, update, delete on public.cafe_owners to authenticated;
create policy cafes_read on public.cafes for select to anon, authenticated using (is_active or (select public.is_admin()));
create policy owners_read on public.cafe_owners for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy owners_admin on public.cafe_owners for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
-- Keep legacy owner RPCs consistent with the managed ownership relation.
create or replace function public.is_owner(p_slug text) returns boolean
language sql stable security invoker set search_path = '' as $$
  select exists(select 1 from public.cafe_owners where cafe_slug = p_slug and user_id = auth.uid());
$$;
create or replace function public.get_my_cafes() returns setof public.cafes
language sql stable security invoker set search_path = '' as $$
  select * from public.cafes where slug in (select cafe_slug from public.cafe_owners where user_id = auth.uid());
$$;
create policy cafes_publish on public.cafes for insert to authenticated with check ((select public.is_admin()));
create policy cafes_edit on public.cafes for update to authenticated
  using ((select public.is_admin()) or slug in (select cafe_slug from public.cafe_owners where user_id = (select auth.uid())))
  with check ((select public.is_admin()) or (is_active and slug in (select cafe_slug from public.cafe_owners where user_id = (select auth.uid()))));

create function private.protect_cafe_location() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  if not public.is_admin() and (new.lat,new.lng,new.area) is distinct from (old.lat,old.lng,old.area) then
    raise exception 'Only administrators can change the verified cafe location';
  end if;
  return new;
end $$;
create trigger protect_cafe_location before update on public.cafes
  for each row execute function private.protect_cafe_location();

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
alter table public.menu_items add column if not exists photo_url text;
alter table public.menu_items add constraint menu_feature_validation check (length(name_th) between 1 and 120 and price between 0 and 100000);
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='menu_items'
  loop execute format('drop policy %I on public.menu_items',p.policyname); end loop;
end $$;
create index menu_items_slug_idx on public.menu_items(cafe_slug);
alter table public.menu_items enable row level security;
revoke all on public.menu_items from anon, authenticated;
grant select on public.menu_items to anon, authenticated;
grant insert, update, delete on public.menu_items to authenticated;
create policy menu_read on public.menu_items for select to anon, authenticated using (true);
create policy menu_manage on public.menu_items for all to authenticated
  using ((select public.is_admin()) or cafe_slug in (select cafe_slug from public.cafe_owners where user_id = (select auth.uid())))
  with check ((select public.is_admin()) or cafe_slug in (select cafe_slug from public.cafe_owners where user_id = (select auth.uid())));

create table public.cafe_photos (
  id uuid primary key default gen_random_uuid(),
  cafe_slug text not null references public.cafes(slug) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  path text not null unique,
  caption text not null default '' check (length(caption) <= 300),
  is_public boolean not null default false,
  created_at timestamptz not null default now(),
  check (split_part(path, '/', 1) = user_id::text)
);
create index cafe_photos_slug_idx on public.cafe_photos(cafe_slug, created_at desc);
create index cafe_photos_user_idx on public.cafe_photos(user_id);
alter table public.cafe_photos enable row level security;
revoke all on public.cafe_photos from anon, authenticated;
grant select on public.cafe_photos to anon, authenticated;
grant insert, delete on public.cafe_photos to authenticated;
grant update(is_public, caption) on public.cafe_photos to authenticated;
create policy photos_read on public.cafe_photos for select to anon, authenticated
  using (is_public or user_id = (select auth.uid()) or (select public.is_admin()));
create policy photos_add on public.cafe_photos for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy photos_edit on public.cafe_photos for update to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()))
  with check (user_id = (select auth.uid()) or (select public.is_admin()));
create policy photos_delete on public.cafe_photos for delete to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('cafe-community', 'cafe-community', false, 5242880, array['image/jpeg','image/png','image/webp']),
       ('cafe-media', 'cafe-media', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
create policy community_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'cafe-community' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy community_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'cafe-community' and (exists (select 1 from public.cafe_photos p where p.path = name)
    or (storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
create policy community_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cafe-community' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select public.is_admin())));
create policy cafe_media_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'cafe-media' and ((select public.is_admin())
    or (storage.foldername(name))[1] in (select cafe_slug from public.cafe_owners where user_id = (select auth.uid()))));
create policy cafe_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'cafe-media' and ((select public.is_admin())
    or (storage.foldername(name))[1] in (select cafe_slug from public.cafe_owners where user_id = (select auth.uid()))));

-- All writes run as the calling administrator and are atomic with publication.
create function public.publish_cafe_suggestion(suggestion_id uuid) returns text
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
create policy profiles_admin_read on public.profiles for select to authenticated using ((select public.is_admin()));

-- Realtime sends only rows the subscriber can SELECT.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'menu_items') then
    alter publication supabase_realtime add table public.menu_items;
  end if;
end $$;
-- Seed only missing rows, preserving every existing cafe edit.
insert into public.cafes(slug,name_th,name_en,description_th,description_en,address_th,address_en,phone,open_time,close_time,closed_days,price_range,tags,lifestyle_tags,area,lat,lng,photo,menu_highlights,base_rating)
select d->>'slug',d->'name'->>'th',d->'name'->>'en',d->'description'->>'th',d->'description'->>'en',d->'address'->>'th',d->'address'->>'en',d->>'phone',d->>'openTime',d->>'closeTime',
  array(select jsonb_array_elements_text(d->'closedDays'))::integer[],(d->>'priceRange')::integer,
  array(select jsonb_array_elements_text(d->'tags')),array(select jsonb_array_elements_text(d->'lifestyleTags')),
  d->>'area',(d->>'lat')::double precision,(d->>'lng')::double precision,d->>'photo',d->'menuHighlights',(d->>'baseRating')::numeric
from jsonb_array_elements($catalog$[{"slug":"baan-baann","name":{"th":"บ้านบานน์","en":"Baan Baann"},"description":{"th":"คาเฟ่บ้านไม้เก่าริมกว๊านพะเยา ตกแต่งวินเทจผสมร่วมสมัย เลือกเมล็ดกาแฟ specialty ได้หลากหลาย บรรยากาศเงียบสงบ เหมาะทั้งนั่งทำงานและนั่งเล่น","en":"A renovated wooden house cafe by Kwan Phayao lake, blending vintage and contemporary decor with a wide selection of specialty beans and a calm atmosphere."},"address":{"th":"ถนนชายกว๊าน ตำบลเวียง (ติดโรงแรมชายกว๊าน)","en":"Chai Kwan Rd, Wiang (next to Chai Kwan Hotel)"},"openTime":"07:00","closeTime":"16:00","closedDays":[2],"priceRange":2,"tags":["chill","work","dessert"],"lifestyleTags":["quiet","wifi","parking"],"area":"lakeside","menuHighlights":[{"th":"อเมริกาโน่เย็น เลือกเมล็ดได้","en":"Iced Americano with bean choice"},{"th":"เบเกอรี่โฮมเมด","en":"Homemade bakery"}],"baseRating":4.6,"lat":19.16355,"lng":99.90065,"photo":"/images/cafes/baan-baann/main.jpg"},{"slug":"lakeland-cafe","name":{"th":"LakeLand Cafe","en":"LakeLand Cafe"},"description":{"th":"คาเฟ่ในซอยใกล้ถนนริมกว๊าน การตกแต่งภายในดีมาก เหมาะกับนั่งทำงานหรือนั่งชิลทั้งวัน","en":"A cafe tucked in a lane off the lakeside road with lovely interior design — great for working or lounging all day."},"address":{"th":"ถนนริมกว๊าน ตำบลเวียง","en":"Rim Kwan Rd, Wiang"},"openTime":"10:00","closeTime":"17:00","closedDays":[],"priceRange":2,"tags":["work","chill"],"lifestyleTags":["wifi","quiet","parking"],"area":"lakeside","menuHighlights":[{"th":"ลาเต้","en":"Latte"},{"th":"ชีสเค้ก","en":"Cheesecake"}],"baseRating":4.4,"lat":19.16388,"lng":99.89949,"photo":"/images/cafes/lakeland-cafe/main.jpg"},{"slug":"sippin-cafe","name":{"th":"Sippin Cafe","en":"Sippin Cafe"},"description":{"th":"คาเฟ่เล็ก ๆ กลางเมืองพะเยา บรรยากาศเงียบ เจ้าของชงกาแฟใส่ใจ แนะนำเมนูตามรสนิยมได้เป็นอย่างดี","en":"A small cozy cafe in central Phayao where the owner brews with care and happily recommends drinks to suit your taste."},"address":{"th":"ในเมืองพะเยา ใกล้ถนนริมกว๊าน","en":"Central Phayao, near Rim Kwan Rd"},"openTime":"09:00","closeTime":"17:00","closedDays":[],"priceRange":2,"tags":["work","chill"],"lifestyleTags":["quiet","wifi"],"area":"lakeside","menuHighlights":[{"th":"ลาเต้ร้อน","en":"Hot latte"},{"th":"โฮมเมดโกโก้","en":"Homemade cocoa"}],"baseRating":4.5,"lat":19.168294,"lng":99.89889,"photo":"/images/cafes/sippin-cafe/main.jpg"},{"slug":"at-home-cafe","name":{"th":"At Home Cafe","en":"At Home Cafe"},"description":{"th":"คาเฟ่อบอุ่นใจกลางเมือง ให้อารมณ์เหมือนนั่งเล่นบ้านเพื่อน เค้กโฮมเมดและของหวานราคาเข้าถึงง่าย","en":"A warm little cafe in the city centre that feels like sitting in a friend's home, with affordable homemade cakes and sweets."},"address":{"th":"ในเมืองพะเยา","en":"Central Phayao"},"openTime":"08:00","closeTime":"17:00","closedDays":[],"priceRange":1,"tags":["dessert","chill"],"lifestyleTags":["family","photo"],"area":"lakeside","menuHighlights":[{"th":"เค้กโฮมเมด","en":"Homemade cakes"},{"th":"กาแฟดำโฮลซีล","en":"Black coffee"}],"baseRating":4.3,"lat":19.17218,"lng":99.89757,"photo":"/images/cafes/at-home-cafe/main.jpg"},{"slug":"nitan-ban-tonmai","name":{"th":"นิทานบ้านต้นไม้","en":"Nitan Ban Ton Mai"},"description":{"th":"สวนกลางเมืองพะเยา ร่มรื่นด้วยต้นไม้ มีทั้งโซนแอร์และเอ้าท์ดอร์ ขึ้นชื่อเรื่องไอศครีมโฮมเมดและบราวนี่","en":"A leafy garden cafe in the middle of town with air-conditioned and outdoor zones, famous for homemade ice cream and brownies."},"address":{"th":"ในเมืองพะเยา ไม่ไกลจากริมกว๊าน","en":"Central Phayao, near the lakefront"},"openTime":"09:00","closeTime":"18:00","closedDays":[],"priceRange":2,"tags":["dessert","chill"],"lifestyleTags":["family","photo","pet-friendly"],"area":"lakeside","menuHighlights":[{"th":"ไอศครีมโฮมเมด","en":"Homemade ice cream"},{"th":"บราวนี่ + ไอศครีม","en":"Brownie with ice cream"},{"th":"บิงซูผลไม้รวม","en":"Mixed fruit bingsu"}],"baseRating":4.5,"lat":19.168,"lng":99.896,"photo":"/images/cafes/nitan-ban-tonmai/main.jpg"},{"slug":"sweet-cycle","name":{"th":"Sweet Cycle","en":"Sweet Cycle"},"description":{"th":"คาเฟ่น่ารักบนถนนราชวงศ์ เปิดแต่เช้า เจ้าของใส่ใจลูกค้า กาแฟรสชาติดี มุมถ่ายรูปสวย","en":"A charming cafe on Ratchawong Road opening early in the morning, with attentive owners, tasty coffee and pretty photo corners."},"address":{"th":"ถนนราชวงศ์ ตำบลเวียง","en":"Ratchawong Rd, Wiang"},"openTime":"07:00","closeTime":"17:00","closedDays":[],"priceRange":2,"tags":["chill","dessert"],"lifestyleTags":["photo","quiet"],"area":"lakeside","menuHighlights":[{"th":"กาแฟโอเลี้ยง","en":"Oliang (Thai iced coffee)"},{"th":"โรตี","en":"Roti"}],"baseRating":4.6,"lat":19.1686,"lng":99.8992,"photo":"/images/cafes/sweet-cycle/main.jpg"},{"slug":"bestpart-cafe","name":{"th":"BestPart.cafe","en":"BestPart.cafe"},"description":{"th":"คาเฟ่มินิมอลโฮมมี่ แสงสวย มุมถ่ายรูปเยอะ กาแฟอร่อยราคาน่ารัก มีขนมให้เลือกทุกวัน","en":"A minimal, homey cafe full of photogenic corners and beautiful light, serving tasty coffee at friendly prices with daily bakes."},"address":{"th":"โครงการศิรประภาโฮม 3 อำเภอเมือง","en":"Siraprapha Home 3 village, Mueang district"},"openTime":"07:30","closeTime":"17:00","closedDays":[],"priceRange":2,"tags":["dessert","work","chill"],"lifestyleTags":["photo","wifi","parking"],"area":"lakeside","menuHighlights":[{"th":"คุกกี้เนยสด","en":"Butter cookies"},{"th":"ลาเต้เย็น","en":"Iced latte"}],"baseRating":4.7,"lat":19.1973,"lng":99.8873,"photo":"/images/cafes/bestpart-cafe/main.jpg"},{"slug":"scene-cafe","name":{"th":"Scene Cafe","en":"Scene Cafe"},"description":{"th":"คาเฟ่โทนอบอุ่นในซอยสวนดอก ขึ้นชื่อเรื่องบราวนี่และซอฟคุกกี้ เครื่องดื่มราคาดี ถ่ายรูปสวยทุกมุม","en":"A warmly toned cafe in Suan Dok lane known for brownies and soft cookies, fairly priced drinks and photo-worthy corners."},"address":{"th":"ซอยสวนดอก ในเมืองพะเยา","en":"Suan Dok lane, central Phayao"},"openTime":"10:00","closeTime":"18:00","closedDays":[],"priceRange":2,"tags":["dessert","work"],"lifestyleTags":["photo","wifi"],"area":"lakeside","menuHighlights":[{"th":"บราวนี่ซอฟคุกกี้","en":"Brownie soft cookie"},{"th":"ชานมไข่มุก","en":"Bubble milk tea"}],"baseRating":4.4,"lat":19.17495,"lng":99.89371,"photo":"/images/cafes/scene-cafe/main.jpg"},{"slug":"the-lake-cafe","name":{"th":"The Lake Cafe","en":"The Lake Cafe"},"description":{"th":"คาเฟ่ริมกว๊านวิวเปิดกว้างเต็มตา เห็นพระอาทิตย์ตกสะท้อนผิวน้ำ มีทั้งโซนอินดอร์และเอ้าท์ดอร์ พร้อมอาหารคาว-หวาน","en":"Lakeside cafe with an open panoramic view of Kwan Phayao — catch the sunset reflecting on the water from indoor or outdoor seats."},"address":{"th":"ถนนริมกว๊าน ตำบลเวียง","en":"Rim Kwan Rd, Wiang"},"openTime":"09:00","closeTime":"20:00","closedDays":[],"priceRange":2,"tags":["view","chill"],"lifestyleTags":["photo","open-late"],"area":"lakeside","menuHighlights":[{"th":"กาแฟริมน้ำ","en":"Coffee by the water"},{"th":"อาหารจานเดียว","en":"Single-dish meals"}],"baseRating":4.5,"lat":19.1697566,"lng":99.895029,"photo":"/images/cafes/the-lake-cafe/main.jpg"},{"slug":"baan-ing-kwan","name":{"th":"บ้านอิงกว๊าน Bar & Cafe","en":"Baan Ing Kwan Bar & Cafe"},"description":{"th":"บ้านรีโนเวทสไตล์มิดเซนจูรี่ริมกว๊าน มุมบาร์ชมวิว เปิดถึงห้าทุ่ม มีเมนูอาหารครบ ทั้งคาวและของหวาน","en":"A mid-century renovated house by the lake with a view bar, open until late evening and serving a full menu of food and desserts."},"address":{"th":"306 ถนนพหลโยธิน ตำบลเวียง","en":"306 Phahonyothin Rd, Wiang"},"phone":"081 615 2705","openTime":"10:00","closeTime":"22:00","closedDays":[],"priceRange":2,"tags":["view","chill"],"lifestyleTags":["open-late","photo","parking"],"area":"lakeside","menuHighlights":[{"th":"ค็อกเทล/กาแฟ","en":"Cocktails & coffee"},{"th":"อาหารเหนือ","en":"Northern Thai dishes"}],"baseRating":4.5,"lat":19.1609654,"lng":99.9136072,"photo":"/images/cafes/baan-ing-kwan/main.jpg"},{"slug":"norbulingka-coffee","name":{"th":"Norbulingka Coffee","en":"Norbulingka Coffee"},"description":{"th":"ร้านกาแฟสไตล์ทิเบตผสมความเป็นไทย ประดับธงมนต์และภาพวาดเนปาล เปิดตั้งแต่เช้าตรู่ บรรยากาศแปลกตาน่าค้นหา","en":"A Tibetan-style Thai coffee shop decorated with prayer flags and Nepalese murals, open from early morning with a unique vibe."},"address":{"th":"637/2 ถนนพหลโยธิน","en":"637/2 Phahonyothin Rd"},"openTime":"07:00","closeTime":"19:00","closedDays":[],"priceRange":1,"tags":["chill","work"],"lifestyleTags":["photo","quiet","parking"],"area":"lakeside","menuHighlights":[{"th":"กาแฟโบราณ","en":"Traditional Thai coffee"},{"th":"ชานม","en":"Milk tea"}],"baseRating":4.3,"lat":19.1962,"lng":99.8889,"photo":"/images/cafes/norbulingka-coffee/main.jpg"},{"slug":"mr-handsome-cafe","name":{"th":"Mr. Handsome Cafe","en":"Mr. Handsome Cafe"},"description":{"th":"คาเฟ่สไตล์อินดัสเทรียลลอฟท์แถวมหาวิทยาลัยพะเยา ตกแต่งเอกลักษณ์ มีทั้งกาแฟ ขนม และอาหารจัดเต็ม","en":"An industrial-loft style cafe near the University of Phayao with distinctive decor, serving coffee, bakes and proper food."},"address":{"th":"332/1 หมู่ 2 ตำบลแม่กา","en":"332/1 Moo 2, Mae Ka"},"phone":"086 408 6852","openTime":"10:00","closeTime":"18:00","closedDays":[3],"priceRange":2,"tags":["work","chill"],"lifestyleTags":["wifi","parking","family"],"area":"maeka-uni","menuHighlights":[{"th":"กาแฟสด","en":"Specialty coffee"},{"th":"อาหารจานเดียว","en":"Single-dish meals"}],"baseRating":4.6,"lat":19.0463675,"lng":99.9267633,"photo":"/images/cafes/mr-handsome-cafe/main.jpg"}]$catalog$::jsonb) d
on conflict (slug) do nothing;
insert into public.cafe_owners(cafe_slug,user_id) select slug,owner_id from public.cafes where owner_id is not null on conflict do nothing;
commit;
