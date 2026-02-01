"use client";

import { searchUsers } from "@/components/search/actions";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { Link, useRouter } from "@/i18n/navigation";
import type { UserSearchEdge } from "@/lib/types/user";
import { Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState, useTransition } from "react";
import { UserSearchResult } from "./user-search-result";

export function NavbarSearch() {
  const t = useTranslations("search");
  const router = useRouter();

  const [inputValue, setInputValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<UserSearchEdge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(inputValue.trim()), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Clear results when debounced value is empty (during render, not in effect)
  const [prevDebouncedValue, setPrevDebouncedValue] = useState(debouncedValue);
  if (prevDebouncedValue !== debouncedValue) {
    setPrevDebouncedValue(debouncedValue);
    if (!debouncedValue) {
      setResults([]);
      setIsOpen(false);
      setError(null);
    }
  }

  // Fetch results when debounced value changes
  useEffect(() => {
    if (!debouncedValue) return;

    startTransition(async () => {
      const result = await searchUsers(debouncedValue, 5);
      if (result.success) {
        setResults(result.edges ?? []);
        setError(null);
      } else {
        setResults([]);
        setError(result.error ?? t("error"));
      }
      setIsOpen(true);
      setHighlightedIndex(-1);
    });
  }, [debouncedValue, t]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        router.push(`/user/${results[highlightedIndex].node.username}`);
        setIsOpen(false);
      } else if (inputValue.trim()) {
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

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("placeholder")}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (debouncedValue && (results.length > 0 || error))
                setIsOpen(true);
            }}
            className="h-9 w-48 pl-8 lg:w-64"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent align="start" className="w-80 p-0">
        {/* Loading */}
        {isPending && (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">
              {t("loading")}
            </span>
          </div>
        )}

        {/* Error */}
        {!isPending && error && (
          <div className="px-4 py-3 text-sm text-destructive">{error}</div>
        )}

        {/* No results */}
        {!isPending && !error && results.length === 0 && debouncedValue && (
          <div className="px-4 py-3 text-center text-sm text-muted-foreground">
            {t("noResults")}
          </div>
        )}

        {/* Results */}
        {!isPending && !error && results.length > 0 && (
          <div className="divide-y">
            {results.map((edge, index) => (
              <UserSearchResult
                key={edge.node.id}
                user={edge.node}
                isHighlighted={index === highlightedIndex}
                onClick={() => setIsOpen(false)}
              />
            ))}

            {/* "View all results" link */}
            <Link
              href={`/search?q=${encodeURIComponent(debouncedValue)}`}
              onClick={() => setIsOpen(false)}
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
