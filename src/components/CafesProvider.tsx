"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Cafe } from "@/data/cafes";
import { CAFES } from "@/data/cafes";
import { fetchCafesWithMenus, mergeCafes } from "@/data/cafes-data";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

interface CafesContextValue {
  cafes: Cafe[];
  loading: boolean;
}

const CafesContext = createContext<CafesContextValue | null>(null);

/**
 * Provides the list of cafes (with menu items) to the whole app.
 *
 * `initialCafes` may be supplied from a Server Component for SSR. On the
 * client we always refresh from Supabase so owner edits to menus appear
 * immediately. Falls back to the static array while loading / if the DB is
 * unavailable so the UI never flashes empty.
 */
export function CafesProvider({
  children,
  initialCafes,
}: {
  children: ReactNode;
  initialCafes?: Cafe[];
}) {
  const [state, setState] = useState<{ loading: boolean; cafes: Cafe[] }>(() => {
    const supabase = getSupabaseBrowser();
    const hasServerData = initialCafes !== undefined && initialCafes.length > 0;
    return {
      loading: !hasServerData && supabase !== null,
      cafes: mergeCafes(CAFES, initialCafes ?? []),
    };
  });

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    let cancelled = false;

    fetchCafesWithMenus(supabase).then((cafes) => {
      if (!cancelled) {
        setState({ loading: false, cafes: mergeCafes(CAFES, cafes) });
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<CafesContextValue>(
    () => ({ cafes: state.cafes, loading: state.loading }),
    [state.cafes, state.loading]
  );

  return <CafesContext.Provider value={value}>{children}</CafesContext.Provider>;
}

export function useCafes(): CafesContextValue {
  const ctx = useContext(CafesContext);
  if (!ctx) throw new Error("useCafes must be used within CafesProvider");
  return ctx;
}
