import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { config } from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

config({ path: join(__dirname, "../.env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const cafesBase = JSON.parse(readFileSync(join(__dirname, "../src/data/cafes.base.json"), "utf-8"));
const cafesEnriched = JSON.parse(readFileSync(join(__dirname, "../src/data/cafes.enriched.json"), "utf-8"));

const RAW_CAFES = [
  {
    slug: "baan-baann",
    name_th: "บ้านบานน์",
    name_en: "Baan Baann",
    description_th: "คาเฟ่บ้านไม้เก่าริมกว๊านพะเยา ตกแต่งวินเทจผสมร่วมสมัย เลือกเมล็ดกาแฟ specialty ได้หลากหลาย บรรยากาศเงียบสงบ เหมาะทั้งนั่งทำงานและนั่งเล่น",
    description_en: "A renovated wooden house cafe by Kwan Phayao lake, blending vintage and contemporary decor with a wide selection of specialty beans and a calm atmosphere.",
    address_th: "ถนนชายกว๊าน ตำบลเวียง (ติดโรงแรมชายกว๊ان)",
    address_en: "Chai Kwan Rd, Wiang (next to Chai Kwan Hotel)",
    phone: null,
    open_time: "07:00",
    close_time: "16:00",
    closed_days: [2],
    price_range: 2,
    tags: ["chill", "work", "dessert"],
    lifestyle_tags: ["quiet", "wifi", "parking"],
    area: "lakeside",
    menu_highlights: [
      { th: "อเมริกาโน่เย็น เลือกเมล็ดได้", en: "Iced Americano with bean choice" },
      { th: "เบเกอรี่โฮมเมด", en: "Homemade bakery" },
    ],
    base_rating: 4.6,
  },
  {
    slug: "lakeland-cafe",
    name_th: "LakeLand Cafe",
    name_en: "LakeLand Cafe",
    description_th: "คาเฟ่ในซอยใกล้ถนนริมกว๊าน การตกแต่งภายในดีมาก เหมาะกับนั่งทำงานหรือนั่งชิลทั้งวัน",
    description_en: "A cafe tucked in a lane off the lakeside road with lovely interior design — great for working or lounging all day.",
    address_th: "ถนนริมกว๊าน ตำบลเวียง",
    address_en: "Rim Kwan Rd, Wiang",
    phone: null,
    open_time: "10:00",
    close_time: "17:00",
    closed_days: [],
    price_range: 2,
    tags: ["work", "chill"],
    lifestyle_tags: ["wifi", "quiet", "parking"],
    area: "lakeside",
    menu_highlights: [
      { th: "ลาเต้", en: "Latte" },
      { th: "ชีสเค้ก", en: "Cheesecake" },
    ],
    base_rating: 4.4,
  },
  {
    slug: "sippin-cafe",
    name_th: "Sippin Cafe",
    name_en: "Sippin Cafe",
    description_th: "คาเฟ่เล็ก ๆ กลางเมืองพะเยา บรรยากาศเงียบ เจ้าของชงกาแฟใส่ใจ แนะนำเมนูตามรสนิยมได้เป็นอย่างดี",
    description_en: "A small cozy cafe in central Phayao where the owner brews with care and happily recommends drinks to suit your taste.",
    address_th: "ในเมืองพะเยา ใกล้ถนนริมกว๊าน",
    address_en: "Central Phayao, near Rim Kwan Rd",
    phone: null,
    open_time: "09:00",
    close_time: "17:00",
    closed_days: [],
    price_range: 2,
    tags: ["work", "chill"],
    lifestyle_tags: ["quiet", "wifi"],
    area: "lakeside",
    menu_highlights: [
      { th: "ลาเต้ร้อน", en: "Hot latte" },
      { th: "โฮมเมดโกโก้", en: "Homemade cocoa" },
    ],
    base_rating: 4.5,
  },
  {
    slug: "at-home-cafe",
    name_th: "At Home Cafe",
    name_en: "At Home Cafe",
    description_th: "คาเฟ่อบอุ่นใจกลางเมือง ให้อารมณ์เหมือนนั่งเล่นบ้านเพื่อน เค้กโฮมเมดและของหวานราคาเข้าถึงง่าย",
    description_en: "A warm little cafe in the city centre that feels like sitting in a friend's home, with affordable homemade cakes and sweets.",
    address_th: "ในเมืองพะเยา",
    address_en: "Central Phayao",
    phone: null,
    open_time: "08:00",
    close_time: "17:00",
    closed_days: [],
    price_range: 1,
    tags: ["dessert", "chill"],
    lifestyle_tags: ["family", "photo"],
    area: "lakeside",
    menu_highlights: [
      { th: "เค้กโฮมเมด", en: "Homemade cakes" },
      { th: "กาแฟดำโฮลซีล", en: "Black coffee" },
    ],
    base_rating: 4.3,
  },
  {
    slug: "nitan-ban-tonmai",
    name_th: "นิทานบ้านต้นไม้",
    name_en: "Nitan Ban Ton Mai",
    description_th: "สวนกลางเมืองพะเยา ร่มรื่นด้วยต้นไม้ มีทั้งโซนแอร์และเอ้าท์ดอร์ ขึ้นชื่อเรื่องไอศครีมโฮมเมดและบราวนี่",
    description_en: "A leafy garden cafe in the middle of town with air-conditioned and outdoor zones, famous for homemade ice cream and brownies.",
    address_th: "ในเมืองพะเยา ไม่ไกลจากริมกว๊าน",
    address_en: "Central Phayao, near the lakefront",
    phone: null,
    open_time: "09:00",
    close_time: "18:00",
    closed_days: [],
    price_range: 2,
    tags: ["dessert", "chill"],
    lifestyle_tags: ["family", "photo", "pet-friendly"],
    area: "lakeside",
    menu_highlights: [
      { th: "ไอศครีมโฮมเมด", en: "Homemade ice cream" },
      { th: "บราวนี่ + ไอศครีม", en: "Brownie with ice cream" },
      { th: "บิงซูผลไม้รวม", en: "Mixed fruit bingsu" },
    ],
    base_rating: 4.5,
  },
  {
    slug: "sweet-cycle",
    name_th: "Sweet Cycle",
    name_en: "Sweet Cycle",
    description_th: "คาเฟ่น่ารักบนถนนราชวงศ์ เปิดแต่เช้า เจ้าของใส่ใจลูกค้า กาแฟรสชาติดี มุมถ่ายรูปสวย",
    description_en: "A charming cafe on Ratchawong Road opening early in the morning, with attentive owners, tasty coffee and pretty photo corners.",
    address_th: "ถนนราชวงศ์ ตำบลเวียง",
    address_en: "Ratchawong Rd, Wiang",
    phone: null,
    open_time: "07:00",
    close_time: "17:00",
    closed_days: [],
    price_range: 2,
    tags: ["chill", "dessert"],
    lifestyle_tags: ["photo", "quiet"],
    area: "lakeside",
    menu_highlights: [
      { th: "กาแฟโอเลี้ยง", en: "Oliang (Thai iced coffee)" },
      { th: "โรตี", en: "Roti" },
    ],
    base_rating: 4.6,
  },
  {
    slug: "bestpart-cafe",
    name_th: "BestPart.cafe",
    name_en: "BestPart.cafe",
    description_th: "คาเฟ่มินิมอลโฮมมี่ แสงสวย มุมถ่ายรูปเยอะ กาแฟอร่อยราคาน่ารัก มีขนมให้เลือกทุกวัน",
    description_en: "A minimal, homey cafe full of photogenic corners and beautiful light, serving tasty coffee at friendly prices with daily bakes.",
    address_th: "โครงการศิรประภาโฮม 3 อำเภอเมือง",
    address_en: "Siraprapha Home 3 village, Mueang district",
    phone: null,
    open_time: "07:30",
    close_time: "17:00",
    closed_days: [],
    price_range: 2,
    tags: ["dessert", "work", "chill"],
    lifestyle_tags: ["photo", "wifi", "parking"],
    area: "lakeside",
    menu_highlights: [
      { th: "คุกกี้เนยสด", en: "Butter cookies" },
      { th: "ลาเต้เย็น", en: "Iced latte" },
    ],
    base_rating: 4.7,
  },
  {
    slug: "scene-cafe",
    name_th: "Scene Cafe",
    name_en: "Scene Cafe",
    description_th: "คาเฟ่โทนอบอุ่นในซอยสวนดอก ขึ้นชื่อเรื่องบราวนี่และซอฟคุกกี้ เครื่องดื่มราคาดี ถ่ายรูปสวยทุกมุม",
    description_en: "A warmly toned cafe in Suan Dok lane known for brownies and soft cookies, fairly priced drinks and photo-worthy corners.",
    address_th: "ซอยสวนดอก ในเมืองพะเยา",
    address_en: "Suan Dok lane, central Phayao",
    phone: null,
    open_time: "10:00",
    close_time: "18:00",
    closed_days: [],
    price_range: 2,
    tags: ["dessert", "work"],
    lifestyle_tags: ["photo", "wifi"],
    area: "lakeside",
    menu_highlights: [
      { th: "บราวนี่ซอฟคุกกี้", en: "Brownie soft cookie" },
      { th: "ชานมไข่มุก", en: "Bubble milk tea" },
    ],
    base_rating: 4.4,
  },
  {
    slug: "the-lake-cafe",
    name_th: "The Lake Cafe",
    name_en: "The Lake Cafe",
    description_th: "คาเฟ่ริมกว๊านวิวเปิดกว้างเต็มตา เห็นพระอาทิตย์ตกสะท้อนผิวน้ำ มีทั้งโซนอินดอร์และเอ้าท์ดอร์ พร้อมอาหารคาว-หวาน",
    description_en: "Lakeside cafe with an open panoramic view of Kwan Phayao — catch the sunset reflecting on the water from indoor or outdoor seats.",
    address_th: "ถนนริมกว๊าน ตำบลเวียง",
    address_en: "Rim Kwan Rd, Wiang",
    phone: null,
    open_time: "09:00",
    close_time: "20:00",
    closed_days: [],
    price_range: 2,
    tags: ["view", "chill"],
    lifestyle_tags: ["photo", "open-late"],
    area: "lakeside",
    menu_highlights: [
      { th: "กาแฟริมน้ำ", en: "Coffee by the water" },
      { th: "อาหารจานเดียว", en: "Single-dish meals" },
    ],
    base_rating: 4.5,
  },
  {
    slug: "baan-ing-kwan",
    name_th: "บ้านอิงกว๊าน Bar & Cafe",
    name_en: "Baan Ing Kwan Bar & Cafe",
    description_th: "บ้านรีโนเวทสไตล์มิดเซนจูรี่ริมกว๊าน มุมบาร์ชมวิว เปิดถึงห้าทุ่ม มีเมนูอาหารครบ ทั้งคาวและของหวาน",
    description_en: "A mid-century renovated house by the lake with a view bar, open until late evening and serving a full menu of food and desserts.",
    address_th: "306 ถนนพหลโยธิน ตำบลเวียง",
    address_en: "306 Phahonyothin Rd, Wiang",
    phone: "081 615 2705",
    open_time: "10:00",
    close_time: "22:00",
    closed_days: [],
    price_range: 2,
    tags: ["view", "chill"],
    lifestyle_tags: ["open-late", "photo", "parking"],
    area: "lakeside",
    menu_highlights: [
      { th: "ค็อกเทล/กาแฟ", en: "Cocktails & coffee" },
      { th: "อาหารเหนือ", en: "Northern Thai dishes" },
    ],
    base_rating: 4.5,
  },
  {
    slug: "norbulingka-coffee",
    name_th: "Norbulingka Coffee",
    name_en: "Norbulingka Coffee",
    description_th: "ร้านกาแฟสไตล์ทิเบตผสมความเป็นไทย ประดับธงมนต์และภาพวาดเนปาล เปิดตั้งแต่เช้าตรู่ บรรยากาศแปลกตาน่าค้นหา",
    description_en: "A Tibetan-style Thai coffee shop decorated with prayer flags and Nepalese murals, open from early morning with a unique vibe.",
    address_th: "637/2 ถนนพหลโยธิน",
    address_en: "637/2 Phahonyothin Rd",
    phone: null,
    open_time: "07:00",
    close_time: "19:00",
    closed_days: [],
    price_range: 1,
    tags: ["chill", "work"],
    lifestyle_tags: ["photo", "quiet", "parking"],
    area: "lakeside",
    menu_highlights: [
      { th: "กาแฟโบราณ", en: "Traditional Thai coffee" },
      { th: "ชานม", en: "Milk tea" },
    ],
    base_rating: 4.3,
  },
  {
    slug: "mr-handsome-cafe",
    name_th: "Mr. Handsome Cafe",
    name_en: "Mr. Handsome Cafe",
    description_th: "คาเฟ่สไตล์อินดัสเทรียลลอฟท์แถวมหาวิทยาลัยพะเยา ตกแต่งเอกลักษณ์ มีทั้งกาแฟ ขนม และอาหารจัดเต็ม",
    description_en: "An industrial-loft style cafe near the University of Phayao with distinctive decor, serving coffee, bakes and proper food.",
    address_th: "332/1 หมู่ 2 ตำบลแม่กา",
    address_en: "332/1 Moo 2, Mae Ka",
    phone: "086 408 6852",
    open_time: "10:00",
    close_time: "18:00",
    closed_days: [3],
    price_range: 2,
    tags: ["work", "chill"],
    lifestyle_tags: ["wifi", "parking", "family"],
    area: "maeka-uni",
    menu_highlights: [
      { th: "กาแฟสด", en: "Specialty coffee" },
      { th: "อาหารจานเดียว", en: "Single-dish meals" },
    ],
    base_rating: 4.6,
  },
];

function buildCafeRow(cafe) {
  const enriched = cafesEnriched[cafe.slug];
  return {
    slug: cafe.slug,
    name_th: cafe.name_th,
    name_en: cafe.name_en,
    description_th: cafe.description_th,
    description_en: cafe.description_en,
    address_th: cafe.address_th,
    address_en: cafe.address_en,
    phone: cafe.phone,
    open_time: cafe.open_time,
    close_time: cafe.close_time,
    closed_days: cafe.closed_days,
    price_range: cafe.price_range,
    tags: cafe.tags,
    lifestyle_tags: cafe.lifestyle_tags,
    area: cafe.area,
    lat: enriched?.lat ?? cafesBase[cafe.slug]?.lat,
    lng: enriched?.lng ?? cafesBase[cafe.slug]?.lng,
    photo: enriched?.photo ?? null,
    menu_highlights: cafe.menu_highlights,
    base_rating: cafe.base_rating,
    is_active: true,
  };
}

async function seed() {
  console.log("🌱 Seeding cafes to Supabase...");

  const rows = RAW_CAFES.map(buildCafeRow);

  for (const row of rows) {
    const { error } = await supabase
      .from("cafes")
      .upsert(row, { onConflict: "slug" });

    if (error) {
      console.error(`❌ Failed to upsert ${row.slug}:`, error.message);
    } else {
      console.log(`✅ Upserted ${row.slug} (${row.name_th})`);
    }
  }

  console.log("\n🎉 Done!");
}

seed().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});