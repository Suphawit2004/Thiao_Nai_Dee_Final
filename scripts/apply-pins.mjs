import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const PINS_FILE = join(ROOT, "pins.txt");
const OUT_FILE = join(ROOT, "src", "data", "cafes.enriched.json");
const PHOTOS_DIR = join(ROOT, "public", "images", "cafes");

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

const CAFES = {
  "baan-baann": { label: "บ้านบานน์", lat: 19.16355, lng: 99.90065 },
  "lakeland-cafe": { label: "LakeLand Cafe", lat: 19.171, lng: 99.8885 },
  "sippin-cafe": { label: "Sippin Cafe", lat: 19.168294, lng: 99.89889 },
  "at-home-cafe": { label: "At Home Cafe", lat: 19.1655, lng: 99.895 },
  "nitan-ban-tonmai": { label: "นิทานบ้านต้นไม้", lat: 19.168, lng: 99.896 },
  "sweet-cycle": { label: "Sweet Cycle", lat: 19.1686, lng: 99.8992 },
  "bestpart-cafe": { label: "BestPart Cafe", lat: 19.1579, lng: 99.9008 },
  "scene-cafe": { label: "Scene Cafe", lat: 19.1649, lng: 99.894 },
  "the-lake-cafe": { label: "The Lake Cafe", lat: 19.1697566, lng: 99.895029 },
  "baan-ing-kwan": { label: "บ้านอิงกว๊าน", lat: 19.1609654, lng: 99.9136072 },
  "norbulingka-coffee": { label: "Norbulingka Coffee", lat: 19.1665, lng: 99.917 },
  "mr-handsome-cafe": { label: "Mr. Handsome Cafe", lat: 19.0463675, lng: 99.9267633 },
};

const BBOX = { latMin: 19.0, latMax: 19.4, lngMin: 99.7, lngMax: 100.1 };
const PHOTO_EXTS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

function haversineMeters(aLat, aLng, bLat, bLng) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

let previous = {};
if (existsSync(OUT_FILE)) {
  try {
    previous = JSON.parse(readFileSync(OUT_FILE, "utf8"));
  } catch {
    previous = {};
  }
}

const overrides = { ...previous };

if (!existsSync(PHOTOS_DIR)) {
  mkdirSync(PHOTOS_DIR, { recursive: true });
}

const photoFiles = new Set(
  readdirSync(PHOTOS_DIR)
    .filter((f) => PHOTO_EXTS.has(f.toLowerCase().slice(f.lastIndexOf("."))))
    .map((f) => f.toLowerCase())
);

for (const slug of Object.keys(CAFES)) {
  const match = [...photoFiles].find((f) => f.startsWith(`${slug}.`));
  if (match) {
    overrides[slug] = { ...(overrides[slug] ?? {}), photo: `/images/cafes/${match}` };
  }
}

let pinCount = 0;
const seenSlugs = new Set();

if (existsSync(PINS_FILE)) {
  const lines = readFileSync(PINS_FILE, "utf8").split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i].trim();
    if (!raw || raw.startsWith("#")) continue;
    const parts = raw.replace(/,/g, " ").split(/\s+/);
    if (parts.length === 1) {
      if (!(parts[0] in CAFES)) fail(`pins.txt บรรทัด ${i + 1}: slug ไม่รู้จัก "${parts[0]}"`);
      continue;
    }
    if (parts.length !== 3) {
      fail(
        `pins.txt บรรทัด ${i + 1}: format ต้องเป็น "slug lat lng" บรรทัดเดียวกัน ` +
          `(วางพิกัดต่อท้าย slug ห้ามขึ้นบรรทัดใหม่) แต่ได้ "${raw}"`
      );
    }
    const [slug, latStr, lngStr] = parts;
    if (!(slug in CAFES)) fail(`pins.txt บรรทัด ${i + 1}: slug ไม่รู้จัก "${slug}"`);
    const lat = Number(latStr);
    const lng = Number(lngStr);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      fail(`pins.txt บรรทัด ${i + 1}: ค่าพิกัดไม่ใช่ตัวเลข "${latStr} ${lngStr}"`);
    }
    const inRange =
      lat >= BBOX.latMin && lat <= BBOX.latMax && lng >= BBOX.lngMin && lng <= BBOX.lngMax;
    if (!inRange && !FORCE) {
      fail(
        `pins.txt บรรทัด ${i + 1}: พิกัดอยู่นอกเขตพะเยา (lat ${lat}, lng ${lng}) ` +
          `ถ้ามั่นใจว่าถูกให้รันซ้ำด้วย --force`
      );
    }
    overrides[slug] = { ...(overrides[slug] ?? {}), lat, lng };
    seenSlugs.add(slug);
    pinCount++;
  }
} else {
  console.log("ℹ ไม่พบ pins.txt — ข้ามการอัปเดตพิกัด (สแกนรูปอย่างเดียว)");
}

const rows = Object.keys(CAFES).map((slug) => {
  const base = CAFES[slug];
  const o = overrides[slug] ?? {};
  const lat = o.lat ?? base.lat;
  const lng = o.lng ?? base.lng;
  const moved =
    o.lat !== undefined || o.lng !== undefined
      ? haversineMeters(base.lat, base.lng, lat, lng)
      : null;
  return { slug, label: base.label, lat, lng, moved, photo: Boolean(o.photo) };
});

const pending = existsSync(PINS_FILE)
  ? Object.keys(CAFES).filter((s) => {
      const o = overrides[s] ?? {};
      return o.lat === undefined && o.lng === undefined;
    })
  : [];

console.log("");
console.log("slug".padEnd(22) + "label".padEnd(20) + "lat/lng ใหม่".padEnd(28) + "ขยับ".padEnd(10) + "รูป");
console.log("-".repeat(84));
for (const r of rows) {
  const coord = `${r.lat.toFixed(6)}, ${r.lng.toFixed(6)}`;
  console.log(
    r.slug.padEnd(22) +
      r.label.padEnd(20) +
      coord.padEnd(28) +
      (r.moved === null ? "—".padEnd(10) : `${Math.round(r.moved)} m`.padEnd(10)) +
      (r.photo ? "✅" : "gradient")
  );
}
console.log("-".repeat(84));
console.log(
  `สรุป: พิกัดใหม่ ${pinCount} ร้าน · มีรูป ${rows.filter((r) => r.photo).length}/${rows.length} ร้าน` +
    (pending.length > 0 && existsSync(PINS_FILE) ? ` · ยังไม่ได้กรอก: ${pending.join(", ")}` : "")
);

if (DRY_RUN) {
  console.log("\n(dry-run — ไม่บันทึกไฟล์)");
  process.exit(0);
}

writeFileSync(OUT_FILE, JSON.stringify(overrides, null, 2) + "\n", "utf8");
console.log(`\n✅ บันทึกแล้ว: src/data/cafes.enriched.json`);
