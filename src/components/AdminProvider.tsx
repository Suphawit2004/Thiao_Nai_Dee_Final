"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { useAuth } from "./AuthProvider";

interface AdminContextValue {
  isAdmin: boolean;
  loading: boolean;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export function AdminProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  // State is tagged with the user it was fetched for, so switching accounts or
  // signing out instantly hides stale admin status without a sync state reset.
  const [state, setState] = useState<{ userId: string; isAdmin: boolean } | null>(null);
  const [loading, setLoading] = useState(false);

  const isAdmin = state !== null && state.userId === userId ? state.isAdmin : false;

  useEffect(() => {
    if (!userId) return;
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    let cancelled = false;

    const req = supabase.rpc("is_admin");
    req.then(
      ({ data }) => {
        if (!cancelled) {
          setState({ userId, isAdmin: data === true });
          setLoading(false);
        }
      },
      () => {
        if (!cancelled) {
          setState({ userId, isAdmin: false });
          setLoading(false);
        }
      }
    );

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const value = useMemo<AdminContextValue>(() => ({ isAdmin, loading }), [isAdmin, loading]);

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
}

export function useIsAdmin(): AdminContextValue {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useIsAdmin must be used within AdminProvider");
  return ctx;
}
