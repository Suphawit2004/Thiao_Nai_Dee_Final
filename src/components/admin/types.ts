export interface AdminStats {
  cafeCount: number;
  reviewCount: number;
  userCount: number;
  pendingSuggestions: number;
  pendingReports: number;
  favoriteCount: number;
  activeCafeCount: number;
}

export interface AdminCafe {
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
}

export type ActivityType = "suggestion" | "report" | "review";

export interface ActivityItem {
  type: ActivityType;
  title: string;
  detail: string;
  createdAt: string;
}
