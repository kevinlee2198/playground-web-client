"use client";

import { loadMoreGames } from "@/app/[locale]/user/[username]/actions";
import { GameCard } from "@/components/game/game-card";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { TypographyH2 } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import { GameNode } from "@/lib/types/game";
import { Gamepad2, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";

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
        <Empty className="border-none py-12">
          <EmptyHeader>
            {/* TODO: Replace with custom illustration */}
            <EmptyMedia variant="icon">
              <Gamepad2 />
            </EmptyMedia>
            <EmptyTitle className="font-display font-semibold">
              {t("emptyTitle")}
            </EmptyTitle>
            <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link href="/games" className={buttonVariants()}>
              {t("createGame")}
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
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
