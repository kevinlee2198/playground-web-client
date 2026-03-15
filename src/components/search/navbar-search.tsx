"use client";

import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TypographyMuted } from "@/components/ui/typography";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import { useSearchResults } from "@/hooks/use-search-results";
import { Link, useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { RecentSearchesList } from "./recent-searches-list";
import { SearchSkeletons } from "./search-skeletons";
import { UserSearchResult } from "./user-search-result";

export function NavbarSearch() {
  const t = useTranslations("search");
  const router = useRouter();

  const { recentSearches, addSearch, removeSearch, clearSearches } =
    useRecentSearches();

  const [inputValue, setInputValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const { debouncedValue, results, error, isPending } = useSearchResults({
    inputValue,
    fallbackError: t("error"),
  });

  // Re-open popover when results arrive
  const [prevDebouncedValue, setPrevDebouncedValue] = useState(debouncedValue);
  if (prevDebouncedValue !== debouncedValue) {
    setPrevDebouncedValue(debouncedValue);
    if (debouncedValue) {
      setHighlightedIndex(-1);
    }
  }

  const showRecentSearches =
    !debouncedValue && recentSearches.length > 0 && isFocused;
  const showResults = !!debouncedValue;

  function addSearchAndClose() {
    if (inputValue.trim()) {
      addSearch(inputValue.trim());
    }
    setIsOpen(false);
  }

  function handleNavigateToResult(username: string) {
    addSearchAndClose();
    router.push(`/user/${username}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        handleNavigateToResult(results[highlightedIndex].node.username);
      } else if (inputValue.trim()) {
        addSearch(inputValue.trim());
        router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`);
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, -1));
    }
  }

  function handleRecentSearchClick(query: string) {
    setInputValue(query);
    addSearch(query);
    router.push(`/search?q=${encodeURIComponent(query)}`);
    setIsOpen(false);
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        nativeButton={false}
        render={
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t("placeholder")}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => {
                setIsFocused(true);
                if (debouncedValue && (results.length > 0 || error)) {
                  setIsOpen(true);
                } else if (!debouncedValue && recentSearches.length > 0) {
                  setIsOpen(true);
                }
              }}
              onBlur={() => setIsFocused(false)}
              className={cn(
                "h-9 pl-8 transition-[width] duration-[var(--duration-normal)] ease-[var(--ease-default)]",
                isFocused ? "w-64 lg:w-96" : "w-48 lg:w-64",
              )}
            />
          </div>
        }
      />
      <PopoverContent align="start" className="w-80 p-0">
        {/* Loading state */}
        {isPending && <SearchSkeletons />}

        {/* Error */}
        {!isPending && error && (
          <div className="px-4 py-3 text-sm text-destructive">{error}</div>
        )}

        {/* No results */}
        {!isPending && !error && showResults && results.length === 0 && (
          <div className="px-4 py-4 text-center">
            <TypographyMuted>
              {t("noResultsFor", { query: debouncedValue })}
            </TypographyMuted>
            <TypographyMuted className="mt-1">
              {t("trySomethingElse")}
            </TypographyMuted>
          </div>
        )}

        {/* Recent searches */}
        {!isPending && showRecentSearches && (
          <RecentSearchesList
            searches={recentSearches}
            onSelect={handleRecentSearchClick}
            onRemove={removeSearch}
            onClearAll={clearSearches}
          />
        )}

        {/* Results */}
        {!isPending && !error && showResults && results.length > 0 && (
          <div className="divide-y">
            {results.map((edge, index) => (
              <UserSearchResult
                key={edge.node.id}
                user={edge.node}
                isHighlighted={index === highlightedIndex}
                onClick={addSearchAndClose}
              />
            ))}

            {/* "View all results" link */}
            <Link
              href={`/search?q=${encodeURIComponent(debouncedValue)}`}
              onClick={addSearchAndClose}
              className="flex items-center justify-center px-4 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-muted"
            >
              {t("viewAllResults")}
            </Link>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
