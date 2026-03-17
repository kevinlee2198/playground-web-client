import { beforeEach, describe, expect, it } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRecentSearches } from "@/hooks/use-recent-searches";

const STORAGE_KEY = "playground-recent-searches";

describe("useRecentSearches", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts with empty list when localStorage is empty", () => {
    const { result } = renderHook(() => useRecentSearches());
    expect(result.current.recentSearches).toEqual([]);
  });

  it("loads existing searches from localStorage", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(["foo", "bar"]));
    const { result } = renderHook(() => useRecentSearches());
    expect(result.current.recentSearches).toEqual(["foo", "bar"]);
  });

  it("adds a search to the list", () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.addSearch("test query"));
    expect(result.current.recentSearches).toContain("test query");
  });

  it("trims whitespace from search queries", () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.addSearch("  test  "));
    expect(result.current.recentSearches[0]).toBe("test");
  });

  it("deduplicates by moving existing search to front", () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.addSearch("first"));
    act(() => result.current.addSearch("second"));
    act(() => result.current.addSearch("first"));
    expect(result.current.recentSearches[0]).toBe("first");
    expect(result.current.recentSearches).toHaveLength(2);
  });

  it("limits to max 5 entries", () => {
    const { result } = renderHook(() => useRecentSearches());
    for (let i = 0; i < 7; i++) {
      act(() => result.current.addSearch(`search-${i}`));
    }
    expect(result.current.recentSearches).toHaveLength(5);
    expect(result.current.recentSearches[0]).toBe("search-6");
  });

  it("removes a specific search", () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.addSearch("keep"));
    act(() => result.current.addSearch("remove"));
    act(() => result.current.removeSearch("remove"));
    expect(result.current.recentSearches).toEqual(["keep"]);
  });

  it("clears all searches", () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.addSearch("one"));
    act(() => result.current.addSearch("two"));
    act(() => result.current.clearSearches());
    expect(result.current.recentSearches).toEqual([]);
  });

  it("persists changes to localStorage", () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.addSearch("persisted"));
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    expect(stored).toContain("persisted");
  });
});
