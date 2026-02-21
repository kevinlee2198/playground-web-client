"use client";

import { loadMoreGames } from "@/app/[locale]/user/[username]/actions";
import { GameCard } from "@/components/game/game-card";
import { Button } from "@/components/ui/button";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import { GameNode } from "@/lib/types/game";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Empty, EmptyDescription, EmptyHeader } from "../ui/empty";
import { TypographyH2 } from "../ui/typography";

interface GameHistoryProps {
  playerId?: string | null;
  initialGames?: {
    edges: Edge<GameNode>[];
    pageInfo: PageInfo;
  } | null;
}

export function GameHistory({ playerId, initialGames }: GameHistoryProps) {
  const t = useTranslations("profile.games");
  const [isPending, startTransition] = useTransition();

  const [games, setGames] = useState(initialGames?.edges ?? []);
  const [pageInfo, setPageInfo] = useState(
    initialGames?.pageInfo ?? { hasNextPage: false, endCursor: null },
  );

  const handleLoadMore = () => {
    if (!playerId || !pageInfo.endCursor) return;

    startTransition(async () => {
      const moreGames = await loadMoreGames(playerId, pageInfo.endCursor!);
      if (moreGames) {
        setGames((prev) => [...prev, ...moreGames.edges]);
        setPageInfo(moreGames.pageInfo);
      }
    });
  };

  return (
    <section>
      <TypographyH2 className="mb-4 text-xl font-semibold">
        {t("title")}
      </TypographyH2>

      {!playerId || games.length === 0 ? (
        <Empty className="border-none">
          <EmptyHeader>
            <EmptyDescription>{t("noActivity")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <>
          <div className="grid gap-4">
            {games.map((edge) => (
              <GameCard key={edge.node.id} game={edge.node} />
            ))}
          </div>

          {pageInfo.hasNextPage && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  t("loadMore")
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
