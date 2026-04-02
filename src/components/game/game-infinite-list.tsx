"use client";

import { loadMoreGames } from "@/app/[locale]/game/actions";
import type { PageInfo } from "@/lib/graphql-connection";
import type {
  GameEdgeWithDistance,
  GameFilterParams,
  GameSortParams,
} from "@/lib/types/game";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { GameCard } from "./game-card";

interface GameInfiniteListProps {
  initialEdges: GameEdgeWithDistance[];
  initialPageInfo: PageInfo;
  filters: GameFilterParams;
  sort: GameSortParams;
}

export function GameInfiniteList({
  initialEdges,
  initialPageInfo,
  filters,
  sort,
}: GameInfiniteListProps) {
  const t = useTranslations();
  const [edges, setEdges] = useState(initialEdges);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [isPending, startTransition] = useTransition();
  const [hasError, setHasError] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(() => {
    if (!pageInfo.hasNextPage || isPending || hasError || !pageInfo.endCursor) return;

    startTransition(async () => {
      const result = await loadMoreGames(filters, sort, pageInfo.endCursor!);
      if (result?.edges && result?.pageInfo) {
        setEdges((prev) => [...prev, ...result.edges]);
        setPageInfo(result.pageInfo);
        setHasError(false);
      } else {
        setHasError(true);
      }
    });
  }, [pageInfo, isPending, hasError, filters, sort]);

  // IntersectionObserver for infinite scroll
  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "100px" },
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  // Reset when filters/sort change (new initialEdges means server re-fetched)
  const [prevInitialEdges, setPrevInitialEdges] = useState(initialEdges);
  if (prevInitialEdges !== initialEdges) {
    setPrevInitialEdges(initialEdges);
    setEdges(initialEdges);
    setPageInfo(initialPageInfo);
  }

  return (
    <>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
        {edges.map((edge) => (
          <GameCard key={edge.node.id} game={edge.node} distance={edge.distance} />
        ))}
      </div>

      {/* Infinite scroll trigger */}
      <div
        ref={loadMoreRef}
        className="mt-8 flex h-10 items-center justify-center"
      >
        {isPending && (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        )}
        {hasError && !isPending && (
          <p className="text-sm text-destructive">
            {t("game.errors.loadMoreError")}
          </p>
        )}
        {!pageInfo.hasNextPage && !hasError && edges.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {t("game.endOfList")}
          </p>
        )}
      </div>
    </>
  );
}
