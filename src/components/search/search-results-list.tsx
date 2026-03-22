"use client";

import { searchUsers } from "@/components/search/actions";
import { Button } from "@/components/ui/button";
import { Empty, EmptyDescription, EmptyHeader } from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/navigation";
import type { SearchPageInfo, UserSearchEdge } from "@/lib/types/user";
import { Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { UserSearchResult } from "./user-search-result";

interface SearchResultsListProps {
  initialQuery: string;
  initialEdges: UserSearchEdge[] | null;
  initialPageInfo: SearchPageInfo | null;
  initialError: string | null;
  isAuthenticated?: boolean;
}

export function SearchResultsList({
  initialQuery,
  initialEdges,
  initialPageInfo,
  initialError,
  isAuthenticated = false,
}: SearchResultsListProps) {
  const t = useTranslations("search");
  const router = useRouter();

  const [query, setQuery] = useState(initialQuery);
  const [edges, setEdges] = useState<UserSearchEdge[]>(initialEdges ?? []);
  const [pageInfo, setPageInfo] = useState<SearchPageInfo | null>(
    initialPageInfo,
  );
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [hasSearched, setHasSearched] = useState(!!initialQuery);
  const [isSearching, startSearch] = useTransition();
  const [isLoadingMore, startLoadMore] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    router.replace(`/search?q=${encodeURIComponent(trimmed)}`);

    startSearch(async () => {
      const result = await searchUsers(trimmed, 20);
      setHasSearched(true);
      if (result.success) {
        setEdges(result.edges ?? []);
        setPageInfo(result.pageInfo ?? null);
        setError(null);
      } else {
        setEdges([]);
        setPageInfo(null);
        setError(result.error ?? t("error"));
      }
    });
  }

  function handleLoadMore() {
    if (!pageInfo?.endCursor) return;
    startLoadMore(async () => {
      const result = await searchUsers(query.trim(), 20, pageInfo.endCursor!);
      if (result.success) {
        setEdges((prev) => [...prev, ...(result.edges ?? [])]);
        setPageInfo(result.pageInfo ?? null);
      } else {
        setError(result.error ?? t("error"));
      }
    });
  }

  return (
    <div>
      {/* Search form */}
      <form onSubmit={handleSubmit} className="mb-8 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={isSearching}>
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t("submit")
          )}
        </Button>
      </form>

      {/* Error */}
      {error && (
        <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading skeleton for initial search */}
      {isSearching && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col space-y-2 rounded-lg border px-4 py-3"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      )}

      {/* No results */}
      {!isSearching && hasSearched && edges.length === 0 && !error && (
        <Empty className="border-none py-12">
          <EmptyHeader>
            <EmptyDescription>{t("noResults")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}

      {/* Results */}
      {!isSearching && edges.length > 0 && (
        <div className="divide-y rounded-lg border">
          {edges.map((edge) => (
            <UserSearchResult
              key={edge.node.id}
              user={edge.node}
              isAuthenticated={isAuthenticated}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {!isSearching && pageInfo?.hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
