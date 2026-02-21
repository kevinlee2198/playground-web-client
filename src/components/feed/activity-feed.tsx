"use client";

import { loadFeedGames } from "@/app/[locale]/feed/actions";
import { GameCard } from "@/components/game/game-card";
import { TypographyMuted } from "@/components/ui/typography";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import type { FeedGameNode } from "@/lib/types/feed";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";

interface ActivityFeedProps {
  initialEdges: Edge<FeedGameNode>[];
  initialPageInfo: PageInfo;
}

export function ActivityFeed({
  initialEdges,
  initialPageInfo,
}: ActivityFeedProps) {
  const t = useTranslations();
  const [edges, setEdges] = useState(initialEdges);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [isPending, startTransition] = useTransition();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const [hasError, setHasError] = useState(false);
  // Ref-based guard to prevent duplicate loads from rapid IntersectionObserver callbacks
  const isLoadingRef = useRef(false);

  const loadMore = useCallback(() => {
    if (
      !pageInfo.hasNextPage ||
      isLoadingRef.current ||
      !pageInfo.endCursor ||
      hasError
    )
      return;
    isLoadingRef.current = true;

    startTransition(async () => {
      try {
        const result = await loadFeedGames(10, pageInfo.endCursor!);
        if (result?.edges && result?.pageInfo) {
          setEdges((prev) => [...prev, ...result.edges]);
          setPageInfo(result.pageInfo);
        } else {
          setHasError(true);
        }
      } finally {
        isLoadingRef.current = false;
      }
    });
  }, [pageInfo, hasError]);

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

  return (
    <>
      <div className="space-y-4">
        {edges.map((edge) => (
          <GameCard key={edge.node.id} game={edge.node} />
        ))}
      </div>

      <div
        ref={loadMoreRef}
        className="mt-8 flex h-10 items-center justify-center"
      >
        {isPending && (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        )}
        {!pageInfo.hasNextPage && edges.length > 0 && (
          <TypographyMuted>{t("feed.endOfFeed")}</TypographyMuted>
        )}
        {hasError && <TypographyMuted>{t("feed.error")}</TypographyMuted>}
      </div>
    </>
  );
}
