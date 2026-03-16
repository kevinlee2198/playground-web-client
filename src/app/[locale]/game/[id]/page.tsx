import { BackButton } from "@/components/game/back-button";
import { GameBoxScores } from "@/components/game/game-box-scores";
import { GameBoxScoresSkeleton } from "@/components/game/game-box-scores-skeleton";
import { GameDetailActions } from "@/components/game/game-detail-actions";
import { GameDetailHero } from "@/components/game/game-detail-hero";
import { GameMediaGallery } from "@/components/game/game-media-gallery";
import { GameParticipants } from "@/components/game/game-participants";
import { buttonVariants } from "@/components/ui/button-variants";
import { Link, redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { GameStatus, getSubtypeFromMetadata } from "@/lib/constants";
import {
  gameMetadataFragment,
  locationFragment,
  participantDetailNodeFragment,
  resourceFragment,
} from "@/lib/graphql-fragments";
import { authQuery } from "@/lib/graphql-request";
import { formatAddress } from "@/lib/location-utils";
import type { GameDetail } from "@/lib/types/game";
import { cn } from "@/lib/utils";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";
import { Suspense } from "react";

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

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
      {/* Back navigation */}
      <div className="mb-6">
        <BackButton label={t("game.detail.backToGames")} />
      </div>

      {/* Hero scoreboard */}
      <GameDetailHero game={game} locationText={locationText} />

      {/* Action bar */}
      <GameDetailActions game={game} />

      {/* Participants */}
      <section className="mt-8">
        <GameParticipants game={game} currentPlayerId={playerId} />
      </section>

      {/* Media Gallery */}
      <section className="mt-8">
        <GameMediaGallery
          gameId={game.id}
          initialMedia={game.media.edges}
          initialPageInfo={game.media.pageInfo}
          canUpload={canUpload}
          isParticipant={isParticipant}
        />
      </section>

      {/* Box Scores */}
      <section className="mt-8">
        <Suspense fallback={<GameBoxScoresSkeleton />}>
          <GameBoxScores
            game={game}
            viewerGameRole={game.viewerGameRole}
            gameStatus={game.gameStatus}
          />
        </Suspense>
      </section>
    </div>
  );
}
