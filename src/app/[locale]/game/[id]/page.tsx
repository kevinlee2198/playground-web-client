import { BackButton } from "@/components/game/back-button";
import { GameDetailClient } from "@/components/game/live/game-detail-client";
import { GameDetailHero } from "@/components/game/game-detail-hero";
import { buttonVariants } from "@/components/ui/button-variants";
import { Link, redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { GameStatus, getSubtypeFromMetadata, SportType } from "@/lib/constants";
import {
  gameMetadataFragment,
  locationFragment,
  participantDetailNodeFragment,
  playerRefFragment,
  resourceFragment,
} from "@/lib/graphql-fragments";
import { authQuery } from "@/lib/graphql-request";
import { formatAddress } from "@/lib/location-utils";
import type { GameDetail } from "@/lib/types/game";
import type { BasketballBoxScoreNode } from "@/lib/types/stats/basketball";
import type {
  FootballDefensiveStatsNode,
  FootballOffensiveStatsNode,
  FootballSpecialTeamsStatsNode,
} from "@/lib/types/stats/football";
import type { PickleballStatisticsNode } from "@/lib/types/stats/pickleball";
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

  // Fetch current user's player id (player is auto-created, always non-null)
  const meResponse = await authQuery({
    me: {
      id: true,
      player: {
        id: true,
      },
    },
  });

  const playerId: number = meResponse.data.me.player.id;

  // Fetch game details
  const gameResponse = await authQuery({
    game: {
      __args: { id },
      id: true,
      description: true,
      startDate: true,
      endDate: true,
      sportType: true,
      metadata: gameMetadataFragment,
      gameStatus: true,
      resultsFinalized: true,
      viewerGameRole: true,
      visibility: true,
      location: locationFragment,
      participants: {
        __args: { first: 50 },
        edges: {
          cursor: true,
          node: participantDetailNodeFragment,
        },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
      media: {
        __args: { first: 12 },
        edges: {
          cursor: true,
          node: resourceFragment,
        },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    },
  });

  const game: GameDetail | null = gameResponse.data?.game;

  if (!game) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
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
      </div>
    );
  }

  // Determine if current player is a participant
  const isParticipant =
    game.participants.edges.some((edge) => {
      const node = edge.node;
      if (node.__typename === "TeamInstance") {
        return node.players.some((p) => p.id === playerId);
      }
      if (node.__typename === "IndividualParticipant") {
        return node.player.id === playerId;
      }
      return false;
    });

  const canUpload =
    isParticipant &&
    (game.gameStatus === GameStatus.IN_PROGRESS ||
      game.gameStatus === GameStatus.COMPLETE);

  const locationText = game.location ? formatAddress(game.location.address) : null;

  let initialBoxScores: { node: BasketballBoxScoreNode }[] = [];
  if (
    game.sportType === SportType.BASKETBALL &&
    game.gameStatus !== GameStatus.SCHEDULED
  ) {
    const boxScoreResponse = await authQuery({
      basketballBoxScores: {
        __args: { input: { gameIds: [game.id] }, first: 50 },
        edges: {
          node: {
            id: true,
            player: playerRefFragment,
            points: true,
            assists: true,
            totalRebounds: true,
            offensiveRebounds: true,
            defensiveRebounds: true,
            steals: true,
            blocks: true,
            turnovers: true,
            personalFouls: true,
            fieldGoalsMade: true,
            fieldGoalsAttempted: true,
            fieldGoalPercentage: true,
            threePointersMade: true,
            threePointersAttempted: true,
            threePointerPercentage: true,
            twoPointersMade: true,
            twoPointersAttempted: true,
            twoPointerPercentage: true,
            freeThrowsMade: true,
            freeThrowsAttempted: true,
            freeThrowPercentage: true,
          },
        },
      },
    });
    initialBoxScores =
      boxScoreResponse.data?.basketballBoxScores?.edges ?? [];
  }

  let initialPickleballStats: { node: PickleballStatisticsNode }[] = [];
  if (
    game.sportType === SportType.PICKLEBALL &&
    game.gameStatus !== GameStatus.SCHEDULED
  ) {
    const statsResponse = await authQuery({
      pickleballStatistics: {
        __args: { input: { gameIds: [game.id] }, first: 50 },
        edges: {
          node: {
            id: true,
            player: playerRefFragment,
            aces: true,
            faults: true,
            doubleFaults: true,
            pointsWon: true,
            winners: true,
            unforcedErrors: true,
            forcedErrors: true,
            dinks: true,
            drives: true,
            drops: true,
            lobs: true,
            volleys: true,
            overheads: true,
          },
        },
      },
    });
    initialPickleballStats =
      statsResponse.data?.pickleballStatistics?.edges ?? [];
  }

  let initialFootballOffensiveStats: { node: FootballOffensiveStatsNode }[] = [];
  let initialFootballDefensiveStats: { node: FootballDefensiveStatsNode }[] = [];
  let initialFootballSpecialTeamsStats: { node: FootballSpecialTeamsStatsNode }[] = [];

  if (
    game.sportType === SportType.FOOTBALL &&
    game.gameStatus !== GameStatus.SCHEDULED
  ) {
    const [offResponse, defResponse, stResponse] = await Promise.all([
      authQuery({
        footballOffensiveStats: {
          __args: { input: { gameIds: [game.id] }, first: 50 },
          edges: {
            node: {
              id: true,
              player: playerRefFragment,
              completions: true,
              passAttempts: true,
              passingYards: true,
              passingTouchdowns: true,
              interceptionsThrown: true,
              sacksTaken: true,
              sackYardsLost: true,
              rushAttempts: true,
              rushingYards: true,
              rushingTouchdowns: true,
              fumbles: true,
              fumblesLost: true,
              receptions: true,
              targets: true,
              receivingYards: true,
              receivingTouchdowns: true,
            },
          },
        },
      }),
      authQuery({
        footballDefensiveStats: {
          __args: { input: { gameIds: [game.id] }, first: 50 },
          edges: {
            node: {
              id: true,
              player: playerRefFragment,
              soloTackles: true,
              assistedTackles: true,
              sacks: true,
              tacklesForLoss: true,
              passesDefended: true,
              interceptions: true,
              interceptionReturnYards: true,
              interceptionReturnTouchdowns: true,
              forcedFumbles: true,
              fumbleRecoveries: true,
              fumbleReturnYards: true,
              fumbleReturnTouchdowns: true,
              safeties: true,
            },
          },
        },
      }),
      authQuery({
        footballSpecialTeamsStats: {
          __args: { input: { gameIds: [game.id] }, first: 50 },
          edges: {
            node: {
              id: true,
              player: playerRefFragment,
              fieldGoalsMade: true,
              fieldGoalsAttempted: true,
              longestFieldGoal: true,
              extraPointsMade: true,
              extraPointsAttempted: true,
              punts: true,
              puntYards: true,
              longestPunt: true,
              puntReturns: true,
              puntReturnYards: true,
              puntReturnTouchdowns: true,
              kickReturns: true,
              kickReturnYards: true,
              kickReturnTouchdowns: true,
            },
          },
        },
      }),
    ]);

    initialFootballOffensiveStats = offResponse.data?.footballOffensiveStats?.edges ?? [];
    initialFootballDefensiveStats = defResponse.data?.footballDefensiveStats?.edges ?? [];
    initialFootballSpecialTeamsStats = stResponse.data?.footballSpecialTeamsStats?.edges ?? [];
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <BackButton label={t("game.detail.backToGames")} />
      </div>

      <GameDetailClient
        game={game}
        initialBoxScores={initialBoxScores}
        initialPickleballStats={initialPickleballStats}
        initialFootballOffensiveStats={initialFootballOffensiveStats}
        initialFootballDefensiveStats={initialFootballDefensiveStats}
        initialFootballSpecialTeamsStats={initialFootballSpecialTeamsStats}
        playerId={playerId}
        canUpload={canUpload}
      >
        <GameDetailHero game={game} locationText={locationText} />
      </GameDetailClient>
    </div>
  );
}
