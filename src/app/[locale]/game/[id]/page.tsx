import { GameBoxScores } from "@/components/game/game-box-scores";
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
import { ArrowLeft } from "lucide-react";
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
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
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
      </div>
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
  const isParticipant = game.participants.edges.some((edge) => {
    const node = edge.node;
    if (node.__typename === "TeamInstance") {
      return node.players.some((p) => p.id === player.id);
    }
    if (node.__typename === "IndividualParticipant") {
      return node.player.id === player.id;
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
        <Link
          href="/games"
          className={cn(
            buttonVariants({ variant: "ghost" }),
            "gap-1.5 text-muted-foreground",
          )}
        >
          <ArrowLeft className="size-4" />
          {t("game.detail.backToGames")}
        </Link>
      </div>

      {/* Hero scoreboard */}
      <GameDetailHero game={game} locationText={locationText} />

      {/* Action bar */}
      <GameDetailActions game={game} />

      {/* Participants */}
      <section className="mt-8">
        <GameParticipants game={game} currentPlayerId={player.id} />
      </section>

      {/* Box Scores */}
      <section className="mt-8">
        <GameBoxScores game={game} />
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
    </div>
  );
}
