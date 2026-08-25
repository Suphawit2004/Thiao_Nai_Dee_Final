# เที่ยวไหนดี — Thiao Nai Dee ☕

รวมคาเฟ่น่านั่งในเมืองพะเยา ทั้งริมกว๊านถึงโซนมหาวิทยาลัย พร้อมพิกัด เวลาเปิด-ปิด เมนูแนะนำ แผนที่ และรีวิว
A curated guide to cafes in Phayao, Thailand — with map, reviews, filters and fuzzy search.

## Features

- 🏪 **ทำเลคาเฟ่** — 12+ ร้านใน 2 โซน (Lakeside & Old Town / Mae Ka & University) พร้อมตำแหน่งที่ตรวจสอบแล้วบน Leaflet map
- 🔍 **ค้นหาแบบ fuzzy** — พิมพ์ชื่อไม่ครบ/สะกดเพี้ยนก็เจอ จาก search bar บน navbar ทุกหน้า
- 🎛️ **ตัวกรอง** — แท็กบรรยากาศ, ไลฟ์สไตล์, โซน, ช่วงราคา, เปิดตอนนี้, โซนระหว่างกลาง (ระยะจากแนวถนนกว๊าน–ม.พะเยา)
- 🔗 **Shareable URL** — สถานะตัวกรอง sync กับ query params ของ `/cafes` ก๊อปลิงก์ส่งต่อได้
- ❤️ **รายการโปรด** — guest เก็บใน localStorage, login แล้ว merge เข้าฐานข้อมูลอัตโนมัติ
- ⭐ **รีวิว + กันสแปม** — รีวิวสาธารณะ จำกัดความถี่ต่อ IP (in-memory sliding window) และ admin ลบได้
- 📮 **แนะนำร้านใหม่ / รายงานข้อมูล** — ฟอร์มแนะนำพร้อม pin picker + อัปโหลดรูป, dialog รายงานข้อมูลไม่ถูกต้องในหน้าร้าน
- 🛠️ **Admin panel (`/admin`)** — อนุมัติ/ปฏิเสธร้านที่แนะนำ, ปิดรายงาน, ลบรีวิว (สิทธิ์ผ่าน RLS `is_admin()`)
- 🌐 **สองภาษา th/en** · 📱 responsive มือถือ–แท็บเล็ต · SEO (sitemap, robots, OG image)

## Tech Stack

- [Next.js](https://nextjs.org) 16 (App Router, Turbopack) + React 19 + TypeScript
- Tailwind CSS v4
- Supabase (Postgres + Auth Magic Link + Storage + RLS)
- Leaflet / react-leaflet
- Vitest + GitHub Actions CI

## Getting Started

```bash
npm install
cp .env.example .env.local   # แล้วใส่ค่าของโปรเจกต์คุณ
npm run dev                  # http://localhost:3000
```

### Environment variables

| Variable | Description |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase publishable (anon) key |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL สำหรับ metadata/sitemap |

### ตั้งค่า Supabase

1. SQL Editor → รัน `supabase/schema.sql` ทั้งไฟล์ (idempotent — รันซ้ำได้)
   สร้างตาราง: `reviews`, `profiles`, `favorites`, `cafe_suggestions`, `data_reports`, `admins`
   + RLS policies + storage bucket `cafe-suggestions`
2. Authentication → Providers → Email → เปิด **Magic Link**
3. Authentication → URL Configuration → เพิ่ม Redirect URLs:
   - `http://localhost:3000/auth/callback`
   - `https://your-domain.example/auth/callback`

### เพิ่ม Admin

```sql
insert into public.admins (email) values ('you@example.com')
on conflict do nothing;
```

อีเมลนี้ต้อง login ผ่าน Magic Link แล้วจึงเข้า `/admin` ได้ (สิทธิ์ตรวจฝั่ง server ทุก action)

## Content Workflow — เพิ่มคาเฟ่ใหม่

1. ผู้ใช้ส่งผ่านหน้า `/suggest` → ข้อมูลเข้าตาราง `cafe_suggestions` (+ รูปใน storage)
2. Admin ตรวจใน `/admin` → approve/reject
3. ร้านที่อนุมัติแล้วนำมาเพิ่มในข้อมูลหลัก:
   - แก้ไข `pins.txt` (slug + พิกัด "lat, lng" จาก Google Maps)
   - ใส่รูปใน `public/images/cafes/<slug>/`
   - รัน `npm run cafes:pins -- --dry-run` ตรวจก่อน แล้วรันจริง
   - อัปเดตข้อมูลร้านใน `src/data/cafes.ts`

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm test` | Vitest (unit tests) |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck |
| `npm run cafes:pins` | Sync pins.txt → enriched cafe data |

## Deployment

Deploy บน [Vercel](https://vercel.com/new) ได้ตรงๆ — ใส่ env vars 3 ตัวข้างบน และเพิ่ม `<domain>/auth/callback` ใน Supabase Redirect URLs

## Project Structure

```
src/
├── app/            # App Router pages + server actions
│   ├── actions/    # submitReview, admin mutations
│   ├── admin/      # moderation panel (dynamic, guarded)
│   └── ...
├── components/     # UI components (client)
├── data/cafes.ts   # ข้อมูลคาเฟ่หลัก (static, typed)
├── i18n/           # th/en dictionaries + LangProvider
└── lib/            # pure logic (hours, fuzzy, filters-url, rate-limit, distance) + supabase clients
supabase/schema.sql # DB schema — idempotent, รันซ้ำได้
pins.txt            # พิกัดร้านสำหรับ apply-pins script
```
