"use client";

import { useSyncExternalStore } from "react";

function subscribe(query: string, callback: () => void) {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}

/**
 * React 19-idiomatic media query hook built on useSyncExternalStore, which
 * is the recommended way to read external, mutable browser state (rather
 * than an effect + state pair) and avoids server/client hydration
 * mismatches by returning a stable false on the server snapshot.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (callback) => subscribe(query, callback),
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Matches Tailwind's default `md` breakpoint (768px). */
export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)");
}
