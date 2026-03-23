import { DiscoverFeed } from "@/components/game/discover-feed";
import { GameInfiniteList } from "@/components/game/game-infinite-list";
import { GameListFilters } from "@/components/game/game-list-filters";
import { GameListSort } from "@/components/game/game-list-sort";
import { GamePageTabs } from "@/components/game/game-page-tabs";
import { buttonVariants } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { TypographyH1, TypographyP } from "@/components/ui/typography";
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
  viewerFollowingPlayersFragment,
  viewerInvitationFragment,
} from "@/lib/graphql-fragments";
import { authQuery } from "@/lib/graphql-request";
import {
  milesToMeters,
  parseLocationParams,
  parseRadiusParam,
} from "@/lib/location-detection";
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

  // Parse active tab from URL
  const activeTab =
    typeof queryParams.tab === "string" &&
    (queryParams.tab === "discover" || queryParams.tab === "my")
      ? queryParams.tab
      : "my";

  // Parse sportType (shared across both tabs)
  const sportTypeParam =
    typeof queryParams.sportType === "string"
      ? queryParams.sportType
      : undefined;

  const isValidSportType = (type: string | undefined): type is SportType =>
    type !== undefined && type in SportType;

  const validSportType = isValidSportType(sportTypeParam)
    ? sportTypeParam
    : undefined;

  // -------------------------------------------------------------------------
  // Discover tab
  // -------------------------------------------------------------------------
  if (activeTab === "discover") {
    // Parse location from URL
    const parsedLocation = parseLocationParams(queryParams);
    const distanceMiles = parseRadiusParam(queryParams.radius);
    const hasNearLocation = !!parsedLocation;

    // Parse gameStatus for discover tab
    const discoverGameStatusParam =
      typeof queryParams.gameStatus === "string"
        ? queryParams.gameStatus
        : undefined;

    const isValidDiscoverGameStatus = (
      status: string | undefined,
    ): status is GameStatus =>
      status !== undefined && status in GameStatus;

    const validDiscoverGameStatus = isValidDiscoverGameStatus(
      discoverGameStatusParam,
    )
      ? discoverGameStatusParam
      : undefined;

    // Date lookback: 30 days for completed games, 7 days otherwise
    const lookbackDays =
      validDiscoverGameStatus === GameStatus.COMPLETE ? 30 : 7;
    const discoverStartAfterDate = new Date();
    discoverStartAfterDate.setDate(
      discoverStartAfterDate.getDate() - lookbackDays,
    );

    const thirtyDaysOut = new Date();
    thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

    // Build discover-specific filters
    const discoverFilters: GameFilterParams = {
      startAfter: discoverStartAfterDate.toISOString(),
      sportType: validSportType,
      gameStatus: validDiscoverGameStatus,
      nearLocation: parsedLocation
        ? {
            latitude: parsedLocation.latitude,
            longitude: parsedLocation.longitude,
            radiusMeters: milesToMeters(distanceMiles),
          }
        : undefined,
    };

    // Without location, cap results to 30 days out
    if (!parsedLocation) {
      discoverFilters.startBefore = thirtyDaysOut.toISOString();
    }

    // Sort: DISTANCE ASC with location, START_DATE DESC without
    const discoverSortField = hasNearLocation
      ? GameSortField.DISTANCE
      : GameSortField.START_DATE;
    const discoverSortDirection = hasNearLocation
      ? SortDirection.ASC
      : SortDirection.DESC;

    // Build GraphQL filter input
    const discoverFilterInput: Record<string, unknown> = {};
    if (discoverFilters.startAfter)
      discoverFilterInput.startAfter = discoverFilters.startAfter;
    if (discoverFilters.startBefore)
      discoverFilterInput.startBefore = discoverFilters.startBefore;
    if (discoverFilters.sportType)
      discoverFilterInput.sportType = new EnumType(discoverFilters.sportType);
    if (discoverFilters.gameStatus)
      discoverFilterInput.gameStatus = new EnumType(discoverFilters.gameStatus);
    if (discoverFilters.nearLocation) {
      discoverFilterInput.nearLocation = {
        latitude: discoverFilters.nearLocation.latitude,
        longitude: discoverFilters.nearLocation.longitude,
        radiusMeters: discoverFilters.nearLocation.radiusMeters,
      };
    }

    // Authenticated query -- includes viewer-specific fields
    const discoverResponse = await authQuery({
      games: {
        __args: {
          input: discoverFilterInput,
          sort: [
            {
              field: new EnumType(discoverSortField),
              direction: new EnumType(discoverSortDirection),
            },
          ],
          first: 20,
        },
        edges: {
          cursor: true,
          ...(hasNearLocation ? { distance: true } : {}),
          node: {
            id: true,
            startDate: true,
            endDate: true,
            sportType: true,
            metadata: gameMetadataFragment,
            gameStatus: true,
            viewerGameRole: true,
            visibility: true,
            viewerInvitation: viewerInvitationFragment,
            viewerFollowingPlayers: viewerFollowingPlayersFragment,
            location: {
              name: true,
              address: { city: true, state: true, country: true },
            },
            participants: {
              __args: { first: 10 },
              edges: { node: participantNodeFragment },
            },
          },
        },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    });

    const discoverGames = discoverResponse.data?.games;

    // Handle error state
    if (!discoverGames) {
      return (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center justify-between">
            <TypographyH1 className="text-3xl">
              {t("game.title")}
            </TypographyH1>
            <Link href="/game" className={buttonVariants()}>
              {t("game.actions.create")}
            </Link>
          </div>
          <GamePageTabs activeTab={activeTab} />
          <div className="mt-6 rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
            <TypographyP className="text-lg font-semibold text-destructive">
              {t("game.errors.loadError")}
            </TypographyP>
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
          <TypographyH1 className="text-3xl">
            {t("game.title")}
          </TypographyH1>
          <Link href="/game" className={buttonVariants()}>
            {t("game.actions.create")}
          </Link>
        </div>

        <GamePageTabs activeTab={activeTab} />

        <div className="mt-6">
          <DiscoverFeed
            initialEdges={discoverGames.edges}
            initialPageInfo={discoverGames.pageInfo}
            initialFilters={discoverFilters}
            initialSort={{
              field: discoverSortField,
              direction: discoverSortDirection,
            }}
            locationName={parsedLocation?.locationName ?? null}
            hasLocation={hasNearLocation}
            distanceMiles={distanceMiles}
            showDistancePresets={true}
          />
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // My Games tab (default) -- existing logic unchanged
  // -------------------------------------------------------------------------

  // Parse filters from URL
  const gameStatusParam =
    typeof queryParams.gameStatus === "string"
      ? queryParams.gameStatus
      : undefined;

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
    sportType: validSportType,
    gameStatus: isValidGameStatus(gameStatusParam)
      ? gameStatusParam
      : undefined,
    myGames: queryParams.myGames === "true" ? true : undefined,
    invitedToMe: queryParams.invitedToMe === "true" ? true : undefined,
  };

  // Parse myGamesFilter from URL
  const myGamesFilter =
    typeof queryParams.myGamesFilter === "string"
      ? queryParams.myGamesFilter
      : undefined;

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
  if (filters.myGames) filterInput.myGames = filters.myGames;
  if (filters.invitedToMe) filterInput.invitedToMe = filters.invitedToMe;

  if (myGamesFilter === "invited") {
    filterInput.invitedToMe = true;
    // Clear myGames when a specific sub-filter is active
    delete filterInput.myGames;
  } else if (myGamesFilter === "managing") {
    filterInput.organizedByMe = true;
    delete filterInput.myGames;
  }
  // "playing" and "all" just use the myGames filter as-is

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
          viewerInvitation: viewerInvitationFragment,
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
        <div className="mb-6 flex items-center justify-between">
          <TypographyH1 className="text-3xl">
            {t("game.title")}
          </TypographyH1>
          <Link href="/game" className={buttonVariants()}>
            {t("game.actions.create")}
          </Link>
        </div>
        <GamePageTabs activeTab={activeTab} />
        <div className="mt-6 rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <TypographyP className="text-lg font-semibold text-destructive">
            {t("game.errors.loadError")}
          </TypographyP>
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
        <TypographyH1 className="text-3xl">{t("game.title")}</TypographyH1>
        <Link href="/game" className={buttonVariants()}>
          {t("game.actions.create")}
        </Link>
      </div>

      <GamePageTabs activeTab={activeTab} />

      <div className="mt-6 flex flex-col lg:flex-row gap-6">
        {/* Filters Sidebar */}
        <aside className="lg:w-64 shrink-0">
          <GameListFilters currentFilters={filters} />
        </aside>

        {/* Main Content */}
        <div className="flex-1">
          <GameListSort
            currentSort={{ field: sortField, direction: sortDirection }}
            myGames={filters.myGames === true}
            myGamesFilter={myGamesFilter}
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
