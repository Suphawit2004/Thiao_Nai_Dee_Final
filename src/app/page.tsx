import { redirect } from "next/navigation";
import { getSupabaseServer } from "@/lib/supabase-server";
import HomeView from "@/components/HomeView";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const params = await searchParams;
  const preview = params.preview === "1";

  if (!preview) {
    const supabase = await getSupabaseServer();
    if (supabase) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: isAdmin } = await supabase.rpc("is_admin");
        if (isAdmin) {
          redirect("/admin");
        }
      }
    }
  }

  return <HomeView />;
}
