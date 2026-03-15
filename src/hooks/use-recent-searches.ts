import { useCallback, useState } from "react";

const STORAGE_KEY = "playground-recent-searches";
const MAX_ENTRIES = 5;

function readFromStorage(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string")
    ) {
      return parsed;
    }
    return [];
  } catch {
    return [];
  }
}

function writeToStorage(searches: string[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  } catch {
    // localStorage may be unavailable (e.g. private browsing quota exceeded)
  }
}

export interface UseRecentSearches {
  recentSearches: string[];
  addSearch: (query: string) => void;
  removeSearch: (query: string) => void;
  clearSearches: () => void;
}

export function useRecentSearches(): UseRecentSearches {
  const [recentSearches, setRecentSearches] =
    useState<string[]>(readFromStorage);

  const addSearch = useCallback((query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    setRecentSearches((prev) => {
      const deduped = prev.filter((entry) => entry !== trimmed);
      const next = [trimmed, ...deduped].slice(0, MAX_ENTRIES);
      writeToStorage(next);
      return next;
    });
  }, []);

  const removeSearch = useCallback((query: string) => {
    setRecentSearches((prev) => {
      const next = prev.filter((entry) => entry !== query);
      writeToStorage(next);
      return next;
    });
  }, []);

  const clearSearches = useCallback(() => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage may be unavailable
    }
  }, []);

  return { recentSearches, addSearch, removeSearch, clearSearches };
}
