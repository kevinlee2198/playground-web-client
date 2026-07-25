"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";

function subscribe(onChange: () => void) {
  const mediaQuery = window.matchMedia(QUERY);
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  return false; // unknown on the server; the client re-syncs on mount
}

/**
 * Reactive `prefers-reduced-motion` check for JS-driven behavior (e.g.
 * `scrollIntoView`/`scrollTo` `behavior`) where Tailwind's `motion-safe:`/
 * `motion-reduce:` variants don't apply — those only gate CSS.
 */
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
