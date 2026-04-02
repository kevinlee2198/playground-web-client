import { BackButton } from "@/components/game/back-button";
import { GameDetailClient } from "@/components/game/live/game-detail-client";
import { GameDetailHero } from "@/components/game/game-detail-hero";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import {
  GameStatus,
  GameVisibility,
  getFormatFromMetadata,
  SportType,
} from "@/lib/constants";
import {
  gameMediaFragment,
  gameMetadataFragment,
  locationFragment,
  normalizeGameMediaEdges,
  participantDetailNodeFragment,
  playerRefFragment,
  viewerInvitationFragment,
} from "@/lib/graphql-fragments";
import { authQuery, query } from "@/lib/graphql-request";
import { formatAddress } from "@/lib/location-utils";
import type { GameDetail } from "@/lib/types/game";
import type { BasketballBoxScoreNode } from "@/lib/types/stats/basketball";
import type {
  FootballDefensiveStatsNode,
  FootballOffensiveStatsNode,
  FootballSpecialTeamsStatsNode,
} from "@/lib/types/stats/football";
import type { PickleballStatisticsNode } from "@/lib/types/stats/pickleball";
import type { TennisStatisticsNode } from "@/lib/types/stats/tennis";
import type {
  BaseballBattingStatsNode,
  BaseballPitchingStatsNode,
  BaseballFieldingStatsNode,
} from "@/lib/types/stats/baseball";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

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
      const sportFormat = getFormatFromMetadata(game.metadata);
      return {
        title: `${game.sportType} Game | Playground`,
        description: sportFormat ? `${game.sportType} - ${sportFormat}` : `${game.sportType}`,
      };
    }
  } catch (error) {
    console.error("Failed to fetch game for metadata:", error);
  }

  return {
    title: t("game.detailTitle"),
  };
}

const gameQueryFields = {
  id: true,
  description: true,
  startDate: true,
  endDate: true,
  sportType: true,
  metadata: gameMetadataFragment,
  gameStatus: true,
  viewerGameRole: true,
  visibility: true,
  statEntryMode: true,
  viewerInvitation: viewerInvitationFragment,
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
      node: gameMediaFragment,
    },
    pageInfo: { hasNextPage: true, endCursor: true },
  },
};

export default async function GameDetailPage({ params }: PageProps) {
  const { locale, id } = await params;
  const t = await getTranslations();

  const session = await auth.api.getSession({ headers: await headers() });

  let game: GameDetail | null;
  let currentUserId: string | null = null;
  let playerId: number | null = null;
  if (session?.user) {
    // Authenticated flow: fetch user info and game with auth
    const meResponse = await authQuery({
      me: {
        id: true,
        player: {
          id: true,
        },
      },
    });

    currentUserId = meResponse.data?.me?.id ?? null;
    playerId = meResponse.data?.me?.player?.id ?? null;

    const gameResponse = await authQuery({
      game: { ...gameQueryFields, __args: { id } },
    });

    game = gameResponse.data?.game ?? null;
  } else {
    // Unauthenticated flow: fetch game without auth to check visibility
    const gameResponse = await query({
      game: { ...gameQueryFields, __args: { id } },
    });

    game = gameResponse.data?.game ?? null;

    if (!game || game.visibility === GameVisibility.PRIVATE) {
      redirect({ href: "/", locale });
    }
  }

  if (!game) {
    notFound();
  }

  // Normalize aliased embedUrl fields in media nodes
  game.media.edges = normalizeGameMediaEdges(game.media.edges);

  const locationText = game.location
    ? formatAddress(game.location.address)
    : null;

  // Sport-specific stats (only fetched for authenticated users)
  let initialBoxScores: { node: BasketballBoxScoreNode }[] = [];
  let initialPickleballStats: { node: PickleballStatisticsNode }[] = [];
  let initialTennisStats: { node: TennisStatisticsNode }[] = [];
  let initialFootballOffensiveStats: { node: FootballOffensiveStatsNode }[] =
    [];
  let initialFootballDefensiveStats: { node: FootballDefensiveStatsNode }[] =
    [];
  let initialFootballSpecialTeamsStats: {
    node: FootballSpecialTeamsStatsNode;
  }[] = [];
  let initialBaseballBattingStats: { node: BaseballBattingStatsNode }[] = [];
  let initialBaseballPitchingStats: { node: BaseballPitchingStatsNode }[] = [];
  let initialBaseballFieldingStats: { node: BaseballFieldingStatsNode }[] = [];

  if (session?.user) {
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

    if (
      game.sportType === SportType.TENNIS &&
      game.gameStatus !== GameStatus.SCHEDULED
    ) {
      const tennisStatsResponse = await authQuery({
        tennisStatistics: {
          __args: { input: { gameIds: [game.id] }, first: 50 },
          edges: {
            node: {
              id: true,
              player: playerRefFragment,
              aces: true,
              doubleFaults: true,
              firstServesIn: true,
              firstServeAttempts: true,
              firstServePointsWon: true,
              firstServePointsPlayed: true,
              secondServePointsWon: true,
              secondServePointsPlayed: true,
              breakPointsConverted: true,
              breakPointsFaced: true,
              returnPointsWon: true,
              returnPointsPlayed: true,
              winners: true,
              unforcedErrors: true,
              totalPointsWon: true,
            },
          },
        },
      });
      initialTennisStats =
        tennisStatsResponse.data?.tennisStatistics?.edges ?? [];
    }

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

      initialFootballOffensiveStats =
        offResponse.data?.footballOffensiveStats?.edges ?? [];
      initialFootballDefensiveStats =
        defResponse.data?.footballDefensiveStats?.edges ?? [];
      initialFootballSpecialTeamsStats =
        stResponse.data?.footballSpecialTeamsStats?.edges ?? [];
    }

    if (
      game.sportType === SportType.BASEBALL &&
      game.gameStatus !== GameStatus.SCHEDULED
    ) {
      const [batResponse, pitchResponse, fieldResponse] = await Promise.all([
        authQuery({
          baseballBattingStats: {
            __args: { input: { gameIds: [game.id] }, first: 50 },
            edges: {
              node: {
                id: true,
                player: playerRefFragment,
                atBats: true,
                runs: true,
                hits: true,
                doubles: true,
                triples: true,
                homeRuns: true,
                rbi: true,
                walks: true,
                strikeouts: true,
                stolenBases: true,
                caughtStealing: true,
                hitByPitch: true,
                sacrifices: true,
                battingAverage: true,
              },
            },
          },
        }),
        authQuery({
          baseballPitchingStats: {
            __args: { input: { gameIds: [game.id] }, first: 50 },
            edges: {
              node: {
                id: true,
                player: playerRefFragment,
                inningsPitched: true,
                hitsAllowed: true,
                runsAllowed: true,
                earnedRuns: true,
                walks: true,
                strikeouts: true,
                homeRunsAllowed: true,
                hitBatsmen: true,
                wildPitches: true,
                pitchCount: true,
                win: true,
                loss: true,
                creditedSave: true,
                era: true,
              },
            },
          },
        }),
        authQuery({
          baseballFieldingStats: {
            __args: { input: { gameIds: [game.id] }, first: 50 },
            edges: {
              node: {
                id: true,
                player: playerRefFragment,
                putouts: true,
                assists: true,
                errors: true,
                fieldingPercentage: true,
              },
            },
          },
        }),
      ]);

      initialBaseballBattingStats =
        batResponse.data?.baseballBattingStats?.edges ?? [];
      initialBaseballPitchingStats =
        pitchResponse.data?.baseballPitchingStats?.edges ?? [];
      initialBaseballFieldingStats =
        fieldResponse.data?.baseballFieldingStats?.edges ?? [];
    }
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
        initialTennisStats={initialTennisStats}
        initialBaseballBattingStats={initialBaseballBattingStats}
        initialBaseballPitchingStats={initialBaseballPitchingStats}
        initialBaseballFieldingStats={initialBaseballFieldingStats}
        playerId={playerId}
        currentUserId={currentUserId}
      >
        <GameDetailHero game={game} locationText={locationText} />
      </GameDetailClient>
    </div>
  );
}
