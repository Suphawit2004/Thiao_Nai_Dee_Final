export interface ReviewRow {
  id: string;
  cafe_slug: string;
  author_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}
