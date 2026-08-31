#!/usr/bin/env node
/**
 * Seed the public.cafes table from the static cafe data (src/data/cafes.ts).
 * Useful on first setup after running the admin_dashboard_upgrade migration:
 *   npm run seed-cafes
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env.
 * Idempotent (upsert by slug) so it can be re-run safely.
 */

import { readFileSync, writeFileSync, unlinkSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { createClient } from "@supabase/supabase-js";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const CAFES_TS = "src/data/cafes.ts";
const TMP = "src/data/.cafes.seed.tmp.cjs";

// Transpile the TS cafe module to CommonJS so Node can require it; the relative
// JSON imports (cafes.base.json / cafes.enriched.json) resolve natively via require.
const src = readFileSync(CAFES_TS, "utf8");
const { outputText } = ts.transpileModule(src, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    esModuleInterop: true,
  },
});
writeFileSync(TMP, outputText);

let CAFES;
try {
  CAFES = require(`./${TMP}`).CAFES;
} finally {
  if (existsSync(TMP)) unlinkSync(TMP);
}

if (!Array.isArray(CAFES) || CAFES.length === 0) {
  console.error("❌ Could not read CAFES from cafes.ts");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function mapRow(cafe) {
  const cost = cafe.priceRange === 1 ? 1 : 2;
  return {
    slug: cafe.slug,
    name_th: cafe.name.th,
    name_en: cafe.name.en,
    description_th: cafe.description.th,
    description_en: cafe.description.en,
    address_th: cafe.address.th,
    address_en: cafe.address.en,
    phone: cafe.phone ?? null,
    open_time: cafe.openTime,
    close_time: cafe.closeTime,
    closed_days: cafe.closedDays ?? [],
    price_range: cost,
    tags: cafe.tags ?? [],
    lifestyle_tags: cafe.lifestyleTags ?? [],
    area: cafe.area,
    lat: cafe.lat,
    lng: cafe.lng,
    photo: cafe.photo ?? null,
    menu_highlights: (cafe.menuHighlights ?? []).map((h) => ({ th: h.th, en: h.en })),
    base_rating: Number(cafe.baseRating.toFixed(1)),
    is_active: true,
  };
}

let ok = 0;
for (const cafe of CAFES) {
  const { error } = await sb.from("cafes").upsert(mapRow(cafe), { onConflict: "slug" });
  if (error) {
    console.error(`✖ ${cafe.slug}: ${error.message}`);
  } else {
    ok++;
  }
}

console.log(`\n✅ Seeded ${ok}/${CAFES.length} cafes into public.cafes`);
