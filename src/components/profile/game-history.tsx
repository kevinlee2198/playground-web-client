import { GameCard } from "@/components/game/game-card";
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
import { Gamepad2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

interface GameHistoryProps {
  playerId?: string | null;
  initialGames?: {
    edges: Edge<GameNode>[];
    pageInfo: PageInfo;
  } | null;
}

export async function GameHistory({ playerId, initialGames }: GameHistoryProps) {
  const t = await getTranslations("profile.games");

  const games = initialGames?.edges ?? [];
  const hasNextPage = initialGames?.pageInfo.hasNextPage ?? false;

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

          {hasNextPage && (
            <div className="mt-6 flex justify-center">
              <Link
                href="/games"
                className={buttonVariants({ variant: "outline" })}
              >
                {t("viewAll")}
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  );
}
