import type { Metadata } from "next";
import { getSupabaseServer } from "@/lib/supabase-server";
import AdminDashboard, { type AdminReport, type AdminReview, type AdminSuggestion } from "@/components/admin/AdminDashboard";
import type { AdminUser } from "@/components/admin/AdminUsers";
import type { ActivityItem, AdminCafe, AdminStats, OwnerRequestRow } from "@/components/admin/types";
import { LangProvider } from "@/i18n/LangProvider";
import { AuthProvider } from "@/components/AuthProvider";
import { AdminProvider } from "@/components/AdminProvider";

export const metadata: Metadata = {
  title: "Admin Dashboard",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdminLayout() {
  const sb = await getSupabaseServer();
  if (!sb) return <AdminDashboard mode="not-configured" />;

  const { data } = await sb.auth.getUser();
  if (!data.user) return <AdminDashboard mode="login" />;

  const { data: isAdmin } = await sb.rpc("is_admin");
  if (!isAdmin) return <AdminDashboard mode="forbidden" />;

  const [suggestions, reports, reviews, cafes, profiles, favorites, admins, ownerRequests] = await Promise.all([
    sb.from("cafe_suggestions").select("*").limit(100),
    sb.from("data_reports").select("*").limit(100),
    sb.from("reviews").select("*").order("created_at", { ascending: false }).limit(30),
    sb.from("cafes").select("*").limit(500),
    sb.from("profiles").select("id, display_name, email, role, created_at").order("created_at", { ascending: false }).limit(500),
    sb.from("favorites").select("id", { count: "exact", head: true }),
    sb.from("profiles").select("email").eq("role", "admin").order("email"),
    sb.from("owner_requests").select("*").order("created_at", { ascending: false }).limit(100),
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

  const cafeRows: AdminCafe[] = (cafes.data ?? []).map((r) => ({
    slug: r.slug as string,
    name_th: r.name_th as string,
    name_en: r.name_en as string,
    description_th: (r.description_th as string) ?? "",
    description_en: (r.description_en as string) ?? "",
    address_th: (r.address_th as string) ?? "",
    address_en: (r.address_en as string) ?? "",
    phone: (r.phone as string | null) ?? null,
    open_time: r.open_time as string,
    close_time: r.close_time as string,
    closed_days: (r.closed_days as number[]) ?? [],
    price_range: (r.price_range as 1 | 2) ?? 2,
    tags: (r.tags as string[]) ?? [],
    lifestyle_tags: (r.lifestyle_tags as string[]) ?? [],
    area: r.area as AdminCafe["area"],
    lat: r.lat as number,
    lng: r.lng as number,
    photo: (r.photo as string | null) ?? null,
    menu_highlights: (r.menu_highlights as { th: string; en: string }[]) ?? [],
    base_rating: Number(r.base_rating ?? 0),
    is_active: (r.is_active as boolean) ?? true,
    owner_id: (r.owner_id as string | null) ?? null,
  }));

  const userRows: AdminUser[] = (profiles.data ?? []).map((p) => ({
    id: p.id as string,
    display_name: (p.display_name as string | null) ?? null,
    email: (p.email as string | null) ?? null,
    role: (p.role as "user" | "admin" | null) ?? "user",
    created_at: p.created_at as string,
  }));

  const adminList = (admins.data ?? []).map((a) => a.email as string);

  const ownerEmailById: Record<string, string> = {};
  for (const p of profiles.data ?? []) {
    const id = p.id as string;
    const email = (p.email as string | null) ?? "";
    if (email) ownerEmailById[id] = email;
  }

  const ownerRequestsList: OwnerRequestRow[] = (ownerRequests.data ?? []).map((r) => ({
    id: r.id as string,
    cafe_slug: r.cafe_slug as string,
    user_id: r.user_id as string,
    user_name: (r.user_name as string | null) ?? null,
    contact: (r.contact as string | null) ?? null,
    message: (r.message as string | null) ?? null,
    status: r.status as OwnerRequestRow["status"],
    created_at: r.created_at as string,
  }));

  const counts = {
    reviewCount: reviews.count ?? reviewRows.length,
    userCount: profiles.count ?? userRows.length,
    favoriteCount: favorites.count ?? 0,
    cafeCount: cafes.data?.length ?? cafeRows.length,
    pendingSuggestions: suggestionRows.filter((s) => s.status === "pending").length,
    pendingReports: reportRows.filter((r) => r.status === "pending").length,
    activeCafeCount: cafeRows.filter((c) => c.is_active).length,
  };

  const stats: AdminStats = counts;

  const activity: ActivityItem[] = [
    ...suggestionRows.map((s) => ({
      type: "suggestion" as const,
      detail: s.name,
      title: s.status,
      createdAt: s.createdAt,
    })),
    ...reportRows.map((r) => ({
      type: "report" as const,
      detail: r.message,
      title: r.cafeSlug,
      createdAt: r.createdAt,
    })),
    ...reviewRows.map((r) => ({
      type: "review" as const,
      detail: r.author_name,
      title: r.cafe_slug,
      createdAt: r.created_at,
    })),
  ]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 10);

  return (
    <LangProvider>
      <AuthProvider>
        <AdminProvider>
          <div className="min-h-screen bg-sand/30">
            <AdminDashboard
              mode="ready"
              suggestions={suggestionRows}
              reports={reportRows}
              reviews={reviewRows}
              cafes={cafeRows}
              stats={stats}
              activity={activity}
              admins={adminList}
              users={userRows}
              ownerRequests={ownerRequestsList}
              ownerEmailById={ownerEmailById}
            />
          </div>
        </AdminProvider>
      </AuthProvider>
    </LangProvider>
  );
}