"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { readLocalFavs, writeLocalFavs } from "@/lib/favorites";
import { useAuth } from "./AuthProvider";

interface FavoritesContextValue {
  slugs: string[];
  ready: boolean;
  has: (slug: string) => boolean;
  toggle: (slug: string) => void;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

interface FavRow {
  cafe_slug: string;
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const [slugs, setSlugs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  // Load favourites whenever the auth state settles.
  useEffect(() => {
    if (loading) return;

    let cancelled = false;

    async function sync(nextUser: User | null) {
      const supabase = getSupabaseBrowser();

      // Guest mode (or DB not configured): localStorage only.
      if (!supabase || !nextUser) {
        setSlugs(readLocalFavs());
        setReady(true);
        return;
      }

      // One-time merge of guest favourites into the database after login.
      const local = readLocalFavs();
      if (local.length > 0) {
        const { error } = await supabase.from("favorites").upsert(
          local.map((cafe_slug) => ({ user_id: nextUser.id, cafe_slug })),
          { onConflict: "user_id,cafe_slug", ignoreDuplicates: true }
        );
        if (error) {
          // Keep the guest list intact — it will be retried on next login.
          console.error("favorites merge failed:", error);
        } else {
          writeLocalFavs([]);
        }
      }

      const { data } = await supabase
        .from("favorites")
        .select("cafe_slug")
        .eq("user_id", nextUser.id)
        .order("created_at", { ascending: false });

      if (!cancelled) {
        setSlugs((data ?? []).map((row: FavRow) => row.cafe_slug));
        setReady(true);
      }
    }

    sync(user).catch(() => {
      // Network/DB failure — fall back to whatever we can show.
      if (!cancelled) {
        setSlugs(user ? [] : readLocalFavs());
        setReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [user, loading]);

  const toggle = useCallback(
    (slug: string) => {
      const exists = slugs.includes(slug);
      const next = exists ? slugs.filter((s) => s !== slug) : [slug, ...slugs];

      // Optimistic update
      setSlugs(next);

      const supabase = getSupabaseBrowser();
      if (!supabase || !user) {
        writeLocalFavs(next); // guest persistence
        return;
      }

      if (exists) {
        supabase
          .from("favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("cafe_slug", slug)
          .then(({ error }) => {
            if (error) {
              console.error("unfavorite failed:", error);
              setSlugs(slugs); // roll back the optimistic update
            }
          });
      } else {
        supabase
          .from("favorites")
          .upsert({ user_id: user.id, cafe_slug: slug })
          .then(({ error }) => {
            if (error) {
              console.error("favorite failed:", error);
              setSlugs(slugs); // roll back the optimistic update
            }
          });
      }
    },
    [slugs, user]
  );

  const value = useMemo<FavoritesContextValue>(
    () => ({
      slugs,
      ready,
      has: (slug: string) => slugs.includes(slug),
      toggle,
    }),
    [slugs, ready, toggle]
  );

  return <FavoritesContext.Provider value={value}>{children}</FavoritesContext.Provider>;
}

export function useFavorites(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error("useFavorites must be used within FavoritesProvider");
  return ctx;
}