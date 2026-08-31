import type { Cafe, LocalText } from "./cafes";

export interface CafeRow {
  slug: string;
  name_th: string;
  name_en: string;
  description_th: string;
  description_en: string;
  address_th: string;
  address_en: string;
  phone: string | null;
  open_time: string;
  close_time: string;
  closed_days: number[];
  price_range: 1 | 2;
  tags: string[];
  lifestyle_tags: string[];
  area: "lakeside" | "maeka-uni";
  lat: number;
  lng: number;
  photo: string | null;
  menu_highlights: { th: string; en: string }[];
  base_rating: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

function toLocal(th?: string | null, en?: string | null): LocalText {
  return { th: th ?? "", en: en ?? "" };
}

export function rowToCafe(row: CafeRow): Cafe {
  return {
    slug: row.slug,
    name: toLocal(row.name_th, row.name_en),
    description: toLocal(row.description_th, row.description_en),
    address: toLocal(row.address_th, row.address_en),
    phone: row.phone ?? undefined,
    openTime: row.open_time,
    closeTime: row.close_time,
    closedDays: row.closed_days ?? [],
    priceRange: row.price_range,
    // tags may include unknown historical values; cast loose and code filters defensively
    tags: (row.tags ?? []) as Cafe["tags"],
    lifestyleTags: (row.lifestyle_tags ?? []) as Cafe["lifestyleTags"],
    area: row.area,
    lat: row.lat,
    lng: row.lng,
    photo: row.photo ?? undefined,
    menuHighlights: (row.menu_highlights ?? []).map((h) => ({ th: h.th ?? "", en: h.en ?? "" })),
    baseRating: Number(row.base_rating),
  };
}

export function cafeToRow(cafe: Cafe): Omit<CafeRow, "created_at" | "updated_at"> {
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
    price_range: cafe.priceRange as 1 | 2,
    tags: cafe.tags,
    lifestyle_tags: cafe.lifestyleTags,
    area: cafe.area,
    lat: cafe.lat,
    lng: cafe.lng,
    photo: cafe.photo ?? null,
    menu_highlights: (cafe.menuHighlights ?? []).map((h) => ({ th: h.th, en: h.en })),
    base_rating: cafe.baseRating,
    is_active: true,
  };
}
