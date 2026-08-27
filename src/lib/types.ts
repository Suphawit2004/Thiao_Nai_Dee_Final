export interface ReviewRow {
  id: string;
  cafe_slug: string;
  author_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
  user_id?: string | null;
}

export interface ProfileRow {
  id: string;
  display_name: string | null;
  avatar_url?: string | null;
}
