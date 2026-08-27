#!/usr/bin/env node
/**
 * Sync approved cafe suggestions from Supabase to static data files.
 * Run after approving suggestions in admin panel:
 *   npm run sync-suggestions
 *
 * This fetches approved suggestions, downloads their photos, and updates:
 * - src/data/cafes.base.json (coordinates)
 * - src/data/cafes.enriched.json (coordinates + photo paths)
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY in env (for admin access to suggestions)
 */

import { createClient } from "@supabase/supabase-js";
import { writeFileSync, mkdirSync, existsSync, createWriteStream, readFileSync, unlinkSync } from "fs";
import { resolve } from "path";
import https from "https";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const sb = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const BASE_JSON_PATH = resolve("src/data/cafes.base.json");
const ENRICHED_JSON_PATH = resolve("src/data/cafes.enriched.json");
const IMAGES_DIR = resolve("public/images/cafes");

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function downloadImage(url: string, destPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    const file = createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        resolve(false);
        return;
      }
      response.pipe(file);
      file.on("finish", () => file.close(() => resolve(true)));
    }).on("error", () => {
      unlinkSync(destPath);
      resolve(false);
    });
  });
}

async function main() {
  console.log("🔄 Fetching approved suggestions from Supabase...");

  const { data: suggestions, error } = await sb
    .from("cafe_suggestions")
    .select("*")
    .eq("status", "approved")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("❌ Failed to fetch suggestions:", error);
    process.exit(1);
  }

  if (!suggestions || suggestions.length === 0) {
    console.log("ℹ️  No approved suggestions to sync.");
    return;
  }

  console.log(`✅ Found ${suggestions.length} approved suggestion(s)`);

  // Load existing data
  const baseData = JSON.parse(readFileSync(BASE_JSON_PATH, "utf-8"));
  const enrichedData = JSON.parse(readFileSync(ENRICHED_JSON_PATH, "utf-8"));

  let updated = 0;

  for (const s of suggestions) {
    const slug = slugify(s.name);
    console.log(`\n📝 Processing: ${s.name} (${slug})`);

    // Check if already exists in base data
    if (baseData[slug]) {
      console.log(`   ⚠️  Already exists in base data, skipping`);
      continue;
    }

    // Create directory for images
    const cafeImgDir = `${IMAGES_DIR}/${slug}`;
    if (!existsSync(cafeImgDir)) {
      mkdirSync(cafeImgDir, { recursive: true });
    }

    // Download photo if available
    let photoPath: string | null = null;
    if (s.photo_url) {
      const ext = s.photo_url.split(".").pop()?.split("?")[0] || "jpg";
      const destPath = `${cafeImgDir}/main.${ext}`;
      console.log(`   ⬇️  Downloading photo...`);
      const ok = await downloadImage(s.photo_url, destPath);
      if (ok) {
        photoPath = `/images/cafes/${slug}/main.${ext}`;
        console.log(`   ✅ Photo saved to ${photoPath}`);
      } else {
        console.log(`   ⚠️  Failed to download photo`);
      }
    }

    // Add to base data
    baseData[slug] = {
      label: s.name,
      lat: s.lat,
      lng: s.lng,
    };

    // Add to enriched data
    const enrichedEntry: Record<string, unknown> = {
      lat: s.lat,
      lng: s.lng,
    };
    if (photoPath) {
      enrichedEntry.photo = photoPath;
    }
    enrichedData[slug] = enrichedEntry;

    updated++;
    console.log(`   ✅ Added to static data`);
  }

  if (updated > 0) {
    // Write back files (sorted by key for consistent diffs)
    const sortedBase = Object.fromEntries(Object.entries(baseData).sort());
    const sortedEnriched = Object.fromEntries(Object.entries(enrichedData).sort());

    writeFileSync(BASE_JSON_PATH, JSON.stringify(sortedBase, null, 2) + "\n");
    writeFileSync(ENRICHED_JSON_PATH, JSON.stringify(sortedEnriched, null, 2) + "\n");
    console.log(`\n💾 Updated ${BASE_JSON_PATH} and ${ENRICHED_JSON_PATH}`);
    console.log(`\n🎉 Synced ${updated} new cafe(s)!`);
    console.log("   Next steps:");
    console.log("   1. Review the generated entries in src/data/cafes.ts (RAW_CAFES)");
    console.log("   2. Add missing fields: description, hours, tags, menuHighlights, etc.");
    console.log("   3. Run: npm run cafes:pins -- --dry-run");
    console.log("   4. Run: npm run cafes:pins");
    console.log("   5. Commit and deploy");
  } else {
    console.log("\nℹ️  No new cafes to add (all already in static data)");
  }
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});