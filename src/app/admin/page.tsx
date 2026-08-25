import type { Metadata } from "next";
import { getSupabaseServer } from "@/lib/supabase-server";
import AdminDashboard, { type AdminReport, type AdminReview, type AdminSuggestion } from "@/components/admin/AdminDashboard";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const sb = await getSupabaseServer();
  if (!sb) return <AdminDashboard mode="not-configured" />;

  const { data } = await sb.auth.getUser();
  if (!data.user) return <AdminDashboard mode="login" />;

  const { data: isAdmin } = await sb.rpc("is_admin");
  if (!isAdmin) return <AdminDashboard mode="forbidden" />;

  const [suggestions, reports, reviews] = await Promise.all([
    sb.from("cafe_suggestions").select("*").limit(100),
    sb.from("data_reports").select("*").limit(100),
    sb.from("reviews").select("*").order("created_at", { ascending: false }).limit(30),
  ]);

  const statusRank: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };
  const suggestionRows: AdminSuggestion[] = (suggestions.data ?? [])
    .map((r) => ({
      id: r.id as string,
      name: r.name as string,
      address: (r.address as string | null) ?? null,
      lat: r.lat as number,
      lng: r.lng as number,
      openTime: (r.open_time as string | null) ?? null,
      closeTime: (r.close_time as string | null) ?? null,
      priceRange: (r.price_range as number | null) ?? null,
      note: (r.note as string | null) ?? null,
      photoUrl: (r.photo_url as string | null) ?? null,
      contact: (r.contact as string | null) ?? null,
      status: r.status as string,
      createdAt: r.created_at as string,
    }))
    .sort(
      (a, b) =>
        (statusRank[a.status] ?? 9) - (statusRank[b.status] ?? 9) ||
        b.createdAt.localeCompare(a.createdAt)
    );

  const reportRank: Record<string, number> = { pending: 0, resolved: 1, dismissed: 2 };
  const reportRows: AdminReport[] = (reports.data ?? [])
    .map((r) => ({
      id: r.id as string,
      cafeSlug: r.cafe_slug as string,
      field: r.field as string,
      message: r.message as string,
      suggestedValue: (r.suggested_value as string | null) ?? null,
      contact: (r.contact as string | null) ?? null,
      status: r.status as string,
      createdAt: r.created_at as string,
    }))
    .sort(
      (a, b) =>
        (reportRank[a.status] ?? 9) - (reportRank[b.status] ?? 9) ||
        b.createdAt.localeCompare(a.createdAt)
    );

  const reviewRows: AdminReview[] = (reviews.data ?? []).map((r) => ({
    id: r.id as string,
    cafe_slug: r.cafe_slug as string,
    author_name: r.author_name as string,
    rating: r.rating as number,
    comment: (r.comment as string | null) ?? null,
    created_at: r.created_at as string,
  }));

  return (
    <AdminDashboard
      mode="ready"
      suggestions={suggestionRows}
      reports={reportRows}
      reviews={reviewRows}
    />
  );
}
