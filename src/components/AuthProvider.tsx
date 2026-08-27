"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  // No Supabase env → nothing to wait for; start with loading=false.
  const [loading, setLoading] = useState(() => getSupabaseBrowser() !== null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    if (!supabase) return;

    let mounted = true;

    supabase.auth
      .getUser()
      .then(({ data }) => {
        if (mounted) {
          setUser(data.user ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        // Never strand the app in loading=true on a network failure.
        if (mounted) setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      signOut: async () => {
        await getSupabaseBrowser()?.auth.signOut();
        setUser(null);
      },
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}