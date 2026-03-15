"use client";

import { UserSearchResult } from "@/components/search/user-search-result";
import { Input } from "@/components/ui/input";
import { TypographyMuted, TypographySmall } from "@/components/ui/typography";
import { useRecentSearches } from "@/hooks/use-recent-searches";
import { useSearchResults } from "@/hooks/use-search-results";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { RecentSearchesList } from "./recent-searches-list";
import { SearchSkeletons } from "./search-skeletons";

interface MobileSearchOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MobileSearchOverlay({
  open,
  onOpenChange,
}: MobileSearchOverlayProps) {
  const t = useTranslations("search");
  const router = useRouter();

  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [inputValue, setInputValue] = useState("");

  const { recentSearches, addSearch, removeSearch, clearSearches } =
    useRecentSearches();

  const { debouncedValue, results, error, isPending, retry } =
    useSearchResults({
      inputValue,
      fallbackError: t("error"),
    });

  // Reset state synchronously during render when the overlay closes
  const [prevOpen, setPrevOpen] = useState(open);
  if (prevOpen !== open) {
    setPrevOpen(open);
    if (!open) {
      setInputValue("");
    }
  }

  // Lock body scroll and auto-focus input when overlay opens
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    return () => {
      document.body.style.overflow = prev;
      cancelAnimationFrame(id);
    };
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onOpenChange(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onOpenChange]);

  // Trap focus within the overlay
  useEffect(() => {
    if (!open) return;

    function handleFocusTrap(e: KeyboardEvent) {
      if (e.key !== "Tab" || !overlayRef.current) return;

      const focusable = overlayRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }

    document.addEventListener("keydown", handleFocusTrap);
    return () => document.removeEventListener("keydown", handleFocusTrap);
  }, [open]);

  const close = useCallback(() => onOpenChange(false), [onOpenChange]);

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && inputValue.trim()) {
      const query = inputValue.trim();
      addSearch(query);
      router.push(`/search?q=${encodeURIComponent(query)}`);
      close();
    }
  }

  function handleResultClick() {
    if (inputValue.trim()) {
      addSearch(inputValue.trim());
    }
    close();
  }

  function handleRecentClick(term: string) {
    setInputValue(term);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  const showRecent = !debouncedValue && recentSearches.length > 0;
  const showResults = !!debouncedValue;

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-label={t("title")}
      aria-modal="true"
      className={cn(
        "fixed inset-0 z-50 flex flex-col bg-background",
        "animate-in fade-in duration-[250ms]",
      )}
    >
      {/* Top bar: search input + cancel button */}
      <div className="flex items-center gap-3 border-b px-4 py-3 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            ref={inputRef}
            type="search"
            placeholder={t("placeholder")}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className="h-10 pl-9 pr-4 text-base"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
        </div>
        <button
          type="button"
          onClick={close}
          className="shrink-0 rounded text-sm font-medium text-primary transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          {t("cancel")}
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto pb-[env(safe-area-inset-bottom,0px)]">
        {/* Recent searches */}
        {showRecent && (
          <section aria-label={t("recent")}>
            <RecentSearchesList
              searches={recentSearches}
              onSelect={handleRecentClick}
              onRemove={removeSearch}
              onClearAll={clearSearches}
            />
          </section>
        )}

        {/* Search results */}
        {showResults && (
          <section
            aria-label={t("title")}
            aria-live="polite"
            aria-busy={isPending}
          >
            {/* Loading skeletons */}
            {isPending && <SearchSkeletons count={4} />}

            {/* Error state */}
            {!isPending && error && (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <TypographyMuted className="text-destructive">
                  {error}
                </TypographyMuted>
                <button
                  type="button"
                  onClick={retry}
                  className="rounded text-sm text-primary transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {t("retry")}
                </button>
              </div>
            )}

            {/* No results */}
            {!isPending && !error && results.length === 0 && (
              <div className="flex flex-col items-center gap-1 px-4 py-10 text-center">
                <TypographySmall className="text-foreground">
                  {t("noResultsFor", { query: debouncedValue })}
                </TypographySmall>
                <TypographyMuted>{t("trySomethingElse")}</TypographyMuted>
              </div>
            )}

            {/* Results list */}
            {!isPending && !error && results.length > 0 && (
              <ul className="divide-y">
                {results.map((edge) => (
                  <li key={edge.node.id}>
                    <UserSearchResult
                      user={edge.node}
                      onClick={handleResultClick}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
