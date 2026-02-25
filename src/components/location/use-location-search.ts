"use client";

import type {
  GeocodeSearchResponse,
  GeocodeSuggestion,
} from "@/lib/geocoding/types";
import { useCallback, useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 500;
const MIN_CHARS = 4;

interface UseLocationSearchResult {
  suggestions: GeocodeSuggestion[];
  isLoading: boolean;
  /** Error key string ("error") or null. The caller maps this to a translated message. */
  error: string | null;
  /** True after a search request has completed (success or error). Reset on clear. */
  hasSearched: boolean;
  search: (query: string) => void;
  clearSuggestions: () => void;
}

export function useLocationSearch(): UseLocationSearchResult {
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
    setHasSearched(false);
  }, []);

  const search = useCallback((query: string) => {
    // Cancel any pending debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort();

    if (query.length < MIN_CHARS) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      setHasSearched(false);
      return;
    }

    setError(null);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;
      setIsLoading(true);

      try {
        const params = new URLSearchParams({ q: query });
        const response = await fetch(`/api/geocode/search?${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setError("error");
          setSuggestions([]);
          return;
        }

        const data: GeocodeSearchResponse = await response.json();
        setSuggestions(data.suggestions ?? []);
        setError(null);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("error");
        setSuggestions([]);
      } finally {
        // Only clear loading if this request was not aborted.
        // An aborted request means a newer search call is pending
        // and has already set isLoading=true. Clearing it here would
        // cause the spinner to flicker off during the debounce wait.
        if (!controller.signal.aborted) {
          setIsLoading(false);
          setHasSearched(true);
        }
      }
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return {
    suggestions,
    isLoading,
    error,
    hasSearched,
    search,
    clearSuggestions,
  };
}
