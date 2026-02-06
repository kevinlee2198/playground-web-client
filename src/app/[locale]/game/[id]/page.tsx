import { GameBoxScores } from "@/components/game/game-box-scores";
import { GameDetailHeader } from "@/components/game/game-detail-header";
import { GameParticipants } from "@/components/game/game-participants";
import { GameScoreboard } from "@/components/game/game-scoreboard";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link, redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { GameStatus, getSubtypeFromMetadata } from "@/lib/constants";
import {
  gameMetadataFragment,
  participantDetailNodeFragment,
} from "@/lib/graphql-fragments";
import { authQuery } from "@/lib/graphql-request";
import type { GameDetail } from "@/lib/types/game";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id } = await params;
  const t = await getTranslations();

  try {
    const response = await authQuery({
      game: {
        __args: { id },
        sportType: true,
        metadata: gameMetadataFragment,
      },
    });
    const game = response.data?.game;

    if (game) {
      const subtype = getSubtypeFromMetadata(game.metadata);
      return {
        title: `${game.sportType} Game | Playground`,
        description: `${game.sportType} - ${subtype}`,
      };
    }
  } catch (error) {
    console.error("Failed to fetch game for metadata:", error);
  }

  return {
    title: t("game.detailTitle"),
  };
}

export default async function GameDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const t = await getTranslations();

  // Auth check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect({ href: "/", locale });
  }

  // Check if user has a player profile
  const playerResponse = await authQuery({
    me: {
      id: true,
      player: {
        id: true,
        firstName: true,
        lastName: true,
      },
    },
  });

  const user = playerResponse.data?.me;
  const player = user?.player;

  // Show message if no player profile
  if (!player) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-950">
          <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
            {t("player.modal.title")}
          </h2>
          <p className="mt-2 text-sm text-blue-700 dark:text-blue-300">
            {t("player.modal.description")}
          </p>
          <div className="mt-4">
            <Link href="/player" className={buttonVariants()}>
              {t("player.modal.create")}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Fetch game details
  const gameResponse = await authQuery({
    game: {
      __args: { id },
      id: true,
      startDate: true,
      endDate: true,
      sportType: true,
      metadata: gameMetadataFragment,
      gameStatus: true,
      participants: {
        __args: { first: 50 },
        edges: {
          cursor: true,
          node: participantDetailNodeFragment,
        },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    },
  });

  const game: GameDetail | null = gameResponse.data?.game;

  if (!game) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-12 text-center">
          <h2 className="text-2xl font-bold text-destructive">
            {t("game.notFound")}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {t("game.notFoundDescription")}
          </p>
          <Link
            href="/games"
            className={cn(buttonVariants({ variant: "outline" }), "mt-6")}
          >
            {t("game.title")}
          </Link>
        </div>
      </main>
    );
  }

  const startDate = new Date(game.startDate).toLocaleString(locale, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const endDate = game.endDate
    ? new Date(game.endDate).toLocaleString(locale, {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Back button */}
      <div className="mb-4">
        <Link href="/games" className={buttonVariants({ variant: "ghost" })}>
          ← {t("game.title")}
        </Link>
      </div>

      {/* Header with actions */}
      <GameDetailHeader game={game} currentPlayerId={player.id} />

      {/* Scoreboard - only show once game has started */}
      {game.gameStatus !== GameStatus.SCHEDULED && (
        <div className="mb-8">
          <GameScoreboard game={game} />
        </div>
      )}

      {/* Schedule Info */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t("game.schedule")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>
            <span className="font-medium">{t("game.startDate")}:</span>{" "}
            <span className="text-muted-foreground">{startDate}</span>
          </div>
          {endDate && (
            <div>
              <span className="font-medium">{t("game.endDate")}:</span>{" "}
              <span className="text-muted-foreground">{endDate}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Participants */}
      <div className="mb-8">
        <GameParticipants game={game} currentPlayerId={player.id} />
      </div>

      {/* Box Scores */}
      <GameBoxScores game={game} />
    </main>
  );
}
