"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  INITIAL_FILTERS,
  filtersToQuery,
  parseFilters,
  type FilterState,
} from "@/lib/filters-url";

interface SearchContextValue {
  filters: FilterState;
  patch: (p: Partial<FilterState>) => void;
  reset: () => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

// External store so the URL can seed the state on first client render
// without a cascading setState-in-effect.
const listeners = new Set<() => void>();

let state: FilterState =
  typeof window === "undefined" ? INITIAL_FILTERS : parseFilters(window.location.search);

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
}

function getSnapshot(): FilterState {
  return state;
}

function getServerSnapshot(): FilterState {
  return INITIAL_FILTERS;
}

function commit(next: FilterState): void {
  state = next;
  for (const notify of listeners) notify();
}

export function SearchProvider({ children }: { children: ReactNode }) {
  const filters = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const pathname = usePathname();

  const patch = useCallback((p: Partial<FilterState>) => {
    commit({ ...state, ...p });
  }, []);

  const reset = useCallback(() => commit(INITIAL_FILTERS), []);

  // Deep-link intent wins: arriving at /cafes with explicit query params
  // (e.g. the home category chips "?tag=view") replaces the current filters,
  // so stale selections never leak into a fresh shared link. A param-less
  // visit keeps the current selection for continuity.
  useEffect(() => {
    if (!pathname.startsWith("/cafes")) return;
    if (!window.location.search) return;
    const incoming = parseFilters(window.location.search);
    if (filtersToQuery(incoming) !== filtersToQuery(state)) {
      commit(incoming);
    }
  }, [pathname]);

  // Keep /cafes shareable: reflect the live filter state in the address bar
  // (no navigation) whenever we are on — or arrive at — the cafes page.
  useEffect(() => {
    if (!pathname.startsWith("/cafes")) return;
    const qs = filtersToQuery(filters);
    window.history.replaceState(null, "", qs ? `/cafes?${qs}` : "/cafes");
  }, [filters, pathname]);

  const value = useMemo<SearchContextValue>(
    () => ({ filters, patch, reset }),
    [filters, patch, reset]
  );

  return <SearchContext.Provider value={value}>{children}</SearchContext.Provider>;
}

export function useSearch(): SearchContextValue {
  const ctx = useContext(SearchContext);
  if (!ctx) throw new Error("useSearch must be used within SearchProvider");
  return ctx;
}