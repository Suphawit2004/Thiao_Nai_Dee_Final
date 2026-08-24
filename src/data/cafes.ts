export type Lang = "th" | "en";

export interface LocalText {
  th: string;
  en: string;
}

export type CafeTag = "work" | "chill" | "view" | "dessert";

export interface Cafe {
  slug: string;
  name: LocalText;
  description: LocalText;
  address: LocalText;
  phone?: string;
  openTime: string;
  closeTime: string;
  closedDays: number[];
  priceRange: 1 | 2;
  tags: CafeTag[];
  lat: number;
  lng: number;
  menuHighlights: LocalText[];
  baseRating: number;
}

export const TAG_META: Record<CafeTag, { label: LocalText; emoji: string }> = {
  work: { label: { th: "เหมาะทำงาน", en: "Good for work" }, emoji: "💻" },
  chill: { label: { th: "นั่งชิล", en: "Chill" }, emoji: "🌿" },
  view: { label: { th: "วิวสวย", en: "Scenic view" }, emoji: "🌅" },
  dessert: { label: { th: "ขนมหวาน", en: "Desserts" }, emoji: "🍰" },
};

export const TAG_ORDER: CafeTag[] = ["work", "chill", "view", "dessert"];

export function mapsUrl(cafe: Cafe): string {
  return `https://www.google.com/maps/search/?api=1&query=${cafe.lat},${cafe.lng}`;
}

export const CAFES: Cafe[] = [
  {
    slug: "baan-baann",
    name: { th: "บ้านบานน์", en: "Baan Baann" },
    description: {
      th: "คาเฟ่บ้านไม้เก่าริมกว๊านพะเยา ตกแต่งวินเทจผสมร่วมสมัย เลือกเมล็ดกาแฟ specialty ได้หลากหลาย บรรยากาศเงียบสงบ เหมาะทั้งนั่งทำงานและนั่งเล่น",
      en: "A renovated wooden house cafe by Kwan Phayao lake, blending vintage and contemporary decor with a wide selection of specialty beans and a calm atmosphere.",
    },
    address: {
      th: "ถนนชายกว๊าน ตำบลเวียง (ติดโรงแรมชายกว๊าน)",
      en: "Chai Kwan Rd, Wiang (next to Chai Kwan Hotel)",
    },
    openTime: "07:00",
    closeTime: "16:00",
    closedDays: [2],
    priceRange: 2,
    tags: ["chill", "work", "dessert"],
    lat: 19.16355,
    lng: 99.90065,
    menuHighlights: [
      { th: "อเมริกาโน่เย็น เลือกเมล็ดได้", en: "Iced Americano with bean choice" },
      { th: "เบเกอรี่โฮมเมด", en: "Homemade bakery" },
    ],
    baseRating: 4.6,
  },
  {
    slug: "lakeland-cafe",
    name: { th: "LakeLand Cafe", en: "LakeLand Cafe" },
    description: {
      th: "คาเฟ่ในซอยใกล้ถนนริมกว๊าน การตกแต่งภายในดีมาก เหมาะกับนั่งทำงานหรือนั่งชิลทั้งวัน",
      en: "A cafe tucked in a lane off the lakeside road with lovely interior design — great for working or lounging all day.",
    },
    address: { th: "ถนนริมกว๊าน ตำบลเวียง", en: "Rim Kwan Rd, Wiang" },
    openTime: "10:00",
    closeTime: "17:00",
    closedDays: [],
    priceRange: 2,
    tags: ["work", "chill"],
    lat: 19.1710,
    lng: 99.8885,
    menuHighlights: [
      { th: "ลาเต้", en: "Latte" },
      { th: "ชีสเค้ก", en: "Cheesecake" },
    ],
    baseRating: 4.4,
  },
  {
    slug: "sippin-cafe",
    name: { th: "Sippin Cafe", en: "Sippin Cafe" },
    description: {
      th: "คาเฟ่เล็ก ๆ กลางเมืองพะเยา บรรยากาศเงียบ เจ้าของชงกาแฟใส่ใจ แนะนำเมนูตามรสนิยมได้เป็นอย่างดี",
      en: "A small cozy cafe in central Phayao where the owner brews with care and happily recommends drinks to suit your taste.",
    },
    address: { th: "ในเมืองพะเยา ใกล้ถนนริมกว๊าน", en: "Central Phayao, near Rim Kwan Rd" },
    openTime: "09:00",
    closeTime: "17:00",
    closedDays: [],
    priceRange: 2,
    tags: ["work", "chill"],
    lat: 19.168294,
    lng: 99.89889,
    menuHighlights: [
      { th: "ลาเต้ร้อน", en: "Hot latte" },
      { th: "โฮมเมดโกโก้", en: "Homemade cocoa" },
    ],
    baseRating: 4.5,
  },
  {
    slug: "at-home-cafe",
    name: { th: "At Home Cafe", en: "At Home Cafe" },
    description: {
      th: "คาเฟ่อบอุ่นใจกลางเมือง ให้อารมณ์เหมือนนั่งเล่นบ้านเพื่อน เค้กโฮมเมดและของหวานราคาเข้าถึงง่าย",
      en: "A warm little cafe in the city centre that feels like sitting in a friend's home, with affordable homemade cakes and sweets.",
    },
    address: { th: "ในเมืองพะเยา", en: "Central Phayao" },
    openTime: "08:00",
    closeTime: "17:00",
    closedDays: [],
    priceRange: 1,
    tags: ["dessert", "chill"],
    lat: 19.1655,
    lng: 99.8950,
    menuHighlights: [
      { th: "เค้กโฮมเมด", en: "Homemade cakes" },
      { th: "กาแฟดำโฮลซีล", en: "Black coffee" },
    ],
    baseRating: 4.3,
  },
  {
    slug: "nitan-ban-tonmai",
    name: { th: "นิทานบ้านต้นไม้", en: "Nitan Ban Ton Mai" },
    description: {
      th: "สวนกลางเมืองพะเยา ร่มรื่นด้วยต้นไม้ มีทั้งโซนแอร์และเอ้าท์ดอร์ ขึ้นชื่อเรื่องไอศครีมโฮมเมดและบราวนี่",
      en: "A leafy garden cafe in the middle of town with air-conditioned and outdoor zones, famous for homemade ice cream and brownies.",
    },
    address: { th: "ในเมืองพะเยา ไม่ไกลจากริมกว๊าน", en: "Central Phayao, near the lakefront" },
    openTime: "09:00",
    closeTime: "18:00",
    closedDays: [],
    priceRange: 2,
    tags: ["dessert", "chill"],
    lat: 19.1680,
    lng: 99.8960,
    menuHighlights: [
      { th: "ไอศครีมโฮมเมด", en: "Homemade ice cream" },
      { th: "บราวนี่ + ไอศครีม", en: "Brownie with ice cream" },
      { th: "บิงซูผลไม้รวม", en: "Mixed fruit bingsu" },
    ],
    baseRating: 4.5,
  },
  {
    slug: "sweet-cycle",
    name: { th: "Sweet Cycle", en: "Sweet Cycle" },
    description: {
      th: "คาเฟ่น่ารักบนถนนราชวงศ์ เปิดแต่เช้า เจ้าของใส่ใจลูกค้า กาแฟรสชาติดี มุมถ่ายรูปสวย",
      en: "A charming cafe on Ratchawong Road opening early in the morning, with attentive owners, tasty coffee and pretty photo corners.",
    },
    address: { th: "ถนนราชวงศ์ ตำบลเวียง", en: "Ratchawong Rd, Wiang" },
    openTime: "07:00",
    closeTime: "17:00",
    closedDays: [],
    priceRange: 2,
    tags: ["chill", "dessert"],
    lat: 19.16860,
    lng: 99.89920,
    menuHighlights: [
      { th: "กาแฟโอเลี้ยง", en: "Oliang (Thai iced coffee)" },
      { th: "โรตี", en: "Roti" },
    ],
    baseRating: 4.6,
  },
  {
    slug: "bestpart-cafe",
    name: { th: "BestPart.cafe", en: "BestPart.cafe" },
    description: {
      th: "คาเฟ่มินิมอลโฮมมี่ แสงสวย มุมถ่ายรูปเยอะ กาแฟอร่อยราคาน่ารัก มีขนมให้เลือกทุกวัน",
      en: "A minimal, homey cafe full of photogenic corners and beautiful light, serving tasty coffee at friendly prices with daily bakes.",
    },
    address: {
      th: "โครงการศิรประภาโฮม 3 อำเภอเมือง",
      en: "Siraprapha Home 3 village, Mueang district",
    },
    openTime: "07:30",
    closeTime: "17:00",
    closedDays: [],
    priceRange: 2,
    tags: ["dessert", "work", "chill"],
    lat: 19.1579,
    lng: 99.9008,
    menuHighlights: [
      { th: "คุกกี้เนยสด", en: "Butter cookies" },
      { th: "ลาเต้เย็น", en: "Iced latte" },
    ],
    baseRating: 4.7,
  },
  {
    slug: "scene-cafe",
    name: { th: "Scene Cafe", en: "Scene Cafe" },
    description: {
      th: "คาเฟ่โทนอบอุ่นในซอยสวนดอก ขึ้นชื่อเรื่องบราวนี่และซอฟคุกกี้ เครื่องดื่มราคาดี ถ่ายรูปสวยทุกมุม",
      en: "A warmly toned cafe in Suan Dok lane known for brownies and soft cookies, fairly priced drinks and photo-worthy corners.",
    },
    address: { th: "ซอยสวนดอก ในเมืองพะเยา", en: "Suan Dok lane, central Phayao" },
    openTime: "10:00",
    closeTime: "18:00",
    closedDays: [],
    priceRange: 2,
    tags: ["dessert", "work"],
    lat: 19.1649,
    lng: 99.8940,
    menuHighlights: [
      { th: "บราวนี่ซอฟคุกกี้", en: "Brownie soft cookie" },
      { th: "ชานมไข่มุก", en: "Bubble milk tea" },
    ],
    baseRating: 4.4,
  },
  {
    slug: "the-lake-cafe",
    name: { th: "The Lake Cafe", en: "The Lake Cafe" },
    description: {
      th: "คาเฟ่ริมกว๊านวิวเปิดกว้างเต็มตา เห็นพระอาทิตย์ตกสะท้อนผิวน้ำ มีทั้งโซนอินดอร์และเอ้าท์ดอร์ พร้อมอาหารคาว-หวาน",
      en: "Lakeside cafe with an open panoramic view of Kwan Phayao — catch the sunset reflecting on the water from indoor or outdoor seats.",
    },
    address: { th: "ถนนริมกว๊าน ตำบลเวียง", en: "Rim Kwan Rd, Wiang" },
    openTime: "09:00",
    closeTime: "20:00",
    closedDays: [],
    priceRange: 2,
    tags: ["view", "chill"],
    lat: 19.1697566,
    lng: 99.895029,
    menuHighlights: [
      { th: "กาแฟริมน้ำ", en: "Coffee by the water" },
      { th: "อาหารจานเดียว", en: "Single-dish meals" },
    ],
    baseRating: 4.5,
  },
  {
    slug: "baan-ing-kwan",
    name: { th: "บ้านอิงกว๊าน Bar & Cafe", en: "Baan Ing Kwan Bar & Cafe" },
    description: {
      th: "บ้านรีโนเวทสไตล์มิดเซนจูรี่ริมกว๊าน มุมบาร์ชมวิว เปิดถึงห้าทุ่ม มีเมนูอาหารครบ ทั้งคาวและของหวาน",
      en: "A mid-century renovated house by the lake with a view bar, open until late evening and serving a full menu of food and desserts.",
    },
    address: { th: "306 ถนนพหลโยธิน ตำบลเวียง", en: "306 Phahonyothin Rd, Wiang" },
    phone: "081 615 2705",
    openTime: "10:00",
    closeTime: "22:00",
    closedDays: [],
    priceRange: 2,
    tags: ["view", "chill"],
    lat: 19.1609654,
    lng: 99.9136072,
    menuHighlights: [
      { th: "ค็อกเทล/กาแฟ", en: "Cocktails & coffee" },
      { th: "อาหารเหนือ", en: "Northern Thai dishes" },
    ],
    baseRating: 4.5,
  },
  {
    slug: "norbulingka-coffee",
    name: { th: "Norbulingka Coffee", en: "Norbulingka Coffee" },
    description: {
      th: "ร้านกาแฟสไตล์ทิเบตผสมความเป็นไทย ประดับธงมนต์และภาพวาดเนปาล เปิดตั้งแต่เช้าตรู่ บรรยากาศแปลกตาน่าค้นหา",
      en: "A Tibetan-style Thai coffee shop decorated with prayer flags and Nepalese murals, open from early morning with a unique vibe.",
    },
    address: { th: "637/2 ถนนพหลโยธิน", en: "637/2 Phahonyothin Rd" },
    openTime: "07:00",
    closeTime: "19:00",
    closedDays: [],
    priceRange: 1,
    tags: ["chill", "work"],
    lat: 19.1665,
    lng: 99.9170,
    menuHighlights: [
      { th: "กาแฟโบราณ", en: "Traditional Thai coffee" },
      { th: "ชานม", en: "Milk tea" },
    ],
    baseRating: 4.3,
  },
  {
    slug: "mr-handsome-cafe",
    name: { th: "Mr. Handsome Cafe", en: "Mr. Handsome Cafe" },
    description: {
      th: "คาเฟ่สไตล์อินดัสเทรียลลอฟท์แถวมหาวิทยาลัยพะเยา ตกแต่งเอกลักษณ์ มีทั้งกาแฟ ขนม และอาหารจัดเต็ม",
      en: "An industrial-loft style cafe near the University of Phayao with distinctive decor, serving coffee, bakes and proper food.",
    },
    address: { th: "332/1 หมู่ 2 ตำบลแม่กา", en: "332/1 Moo 2, Mae Ka" },
    phone: "086 408 6852",
    openTime: "10:00",
    closeTime: "18:00",
    closedDays: [3],
    priceRange: 2,
    tags: ["work", "chill"],
    lat: 19.0463675,
    lng: 99.9267633,
    menuHighlights: [
      { th: "กาแฟสด", en: "Specialty coffee" },
      { th: "อาหารจานเดียว", en: "Single-dish meals" },
    ],
    baseRating: 4.6,
  },
];
