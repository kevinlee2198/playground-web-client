import { CreateGameDialog } from "@/components/game/create-game-dialog";
import { GameInfiniteList } from "@/components/game/game-infinite-list";
import { GameListFilters } from "@/components/game/game-list-filters";
import { GameListSort } from "@/components/game/game-list-sort";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Link, redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import {
  GameSortField,
  GameStatus,
  SortDirection,
  SportType,
} from "@/lib/constants";
import {
  gameMetadataFragment,
  participantNodeFragment,
} from "@/lib/graphql-fragments";
import { authQuery } from "@/lib/graphql-request";
import type { GameFilterParams } from "@/lib/types/game";
import { cn } from "@/lib/utils";
import { EnumType } from "json-to-graphql-query";
import { Gamepad2 } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Games | Playground",
  description: "Browse and manage your games",
};

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// I want to default the filters to be for all sport types, all statuses, and
export default async function GamesPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  const queryParams = await searchParams;
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
      },
    },
  });

  const player = playerResponse.data?.me?.player;

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

  // Parse filters from URL
  const sportTypeParam =
    typeof queryParams.sportType === "string"
      ? queryParams.sportType
      : undefined;
  const gameStatusParam =
    typeof queryParams.gameStatus === "string"
      ? queryParams.gameStatus
      : undefined;

  // Validate sportType
  const isValidSportType = (type: string | undefined): type is SportType => {
    return type !== undefined && type in SportType;
  };

  // Validate gameStatus
  const isValidGameStatus = (
    status: string | undefined,
  ): status is GameStatus => {
    return (
      status === GameStatus.SCHEDULED ||
      status === GameStatus.IN_PROGRESS ||
      status === GameStatus.COMPLETE
    );
  };

  const filters: GameFilterParams = {
    startAfter:
      typeof queryParams.startAfter === "string"
        ? queryParams.startAfter
        : undefined,
    startBefore:
      typeof queryParams.startBefore === "string"
        ? queryParams.startBefore
        : undefined,
    sportType: isValidSportType(sportTypeParam) ? sportTypeParam : undefined,
    gameStatus: isValidGameStatus(gameStatusParam)
      ? gameStatusParam
      : undefined,
    organizedByMe: queryParams.myGames === "true" ? true : undefined,
  };

  // Parse sort from URL
  const sortField = (
    typeof queryParams.sortField === "string"
      ? queryParams.sortField
      : GameSortField.START_DATE
  ) as GameSortField;
  const sortDirection = (
    typeof queryParams.sortDir === "string"
      ? queryParams.sortDir
      : SortDirection.DESC
  ) as SortDirection;

  // Build filter input for GraphQL
  const filterInput: Record<string, unknown> = {};
  if (filters.startAfter) filterInput.startAfter = filters.startAfter;
  if (filters.startBefore) filterInput.startBefore = filters.startBefore;
  if (filters.sportType)
    filterInput.sportType = new EnumType(filters.sportType);
  if (filters.gameStatus)
    filterInput.gameStatus = new EnumType(filters.gameStatus);
  if (filters.organizedByMe) filterInput.organizedByMe = filters.organizedByMe;

  // Fetch games
  const gamesResponse = await authQuery({
    games: {
      __args: {
        input: filterInput,
        sort: [
          {
            field: new EnumType(sortField),
            direction: new EnumType(sortDirection),
          },
        ],
        first: 20,
      },
      edges: {
        cursor: true,
        node: {
          id: true,
          startDate: true,
          endDate: true,
          sportType: true,
          metadata: gameMetadataFragment,
          gameStatus: true,
          viewerGameRole: true,
          visibility: true,
          location: {
            name: true,
            address: {
              city: true,
              state: true,
              country: true,
            },
          },
          participants: {
            __args: { first: 10 },
            edges: {
              node: participantNodeFragment,
            },
          },
        },
      },
      pageInfo: {
        hasNextPage: true,
        endCursor: true,
      },
    },
  });

  const games = gamesResponse.data?.games;

  // Handle error state
  if (!games) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <p className="text-lg font-semibold text-destructive">
            {t("game.errors.loadError")}
          </p>
          <Link
            href="/games"
            className={cn(buttonVariants({ variant: "outline" }), "mt-4")}
          >
            {t("game.errors.retry")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">{t("game.title")}</h1>
        <CreateGameDialog />
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Filters Sidebar */}
        <aside className="lg:w-64 shrink-0">
          <GameListFilters currentFilters={filters} />
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          <GameListSort
            currentSort={{ field: sortField, direction: sortDirection }}
            myGames={filters.organizedByMe === true}
          />

          {games.edges.length === 0 ? (
            <Empty>
              <EmptyHeader>
                {/* TODO: Replace with custom illustration */}
                <EmptyMedia variant="icon">
                  <Gamepad2 />
                </EmptyMedia>
                <EmptyTitle className="font-display font-semibold">
                  {t("game.noGames")}
                </EmptyTitle>
                <EmptyDescription>
                  {t("game.noGamesDescription")}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Link href="/games" className={buttonVariants()}>
                  {t("game.filters.clearFilters")}
                </Link>
              </EmptyContent>
            </Empty>
          ) : (
            <GameInfiniteList
              initialEdges={games.edges}
              initialPageInfo={games.pageInfo}
              filters={filters}
              sort={{ field: sortField, direction: sortDirection }}
            />
          )}
        </div>
      </div>
    </main>
  );
}
