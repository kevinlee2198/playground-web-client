import { loadFeedGames } from "@/app/[locale]/feed/actions";
import { DiscoverFeed } from "@/components/game/discover-feed";
import { ActivityFeed } from "@/components/feed/activity-feed";
import { IntegratedHero } from "@/components/home/integrated-hero";
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
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { GameSortField, GameStatus, SortDirection, SportType } from "@/lib/constants";
import {
  gameMetadataFragment,
  participantNodeFragment,
} from "@/lib/graphql-fragments";
import { query } from "@/lib/graphql-request";
import {
  milesToMeters,
  parseLocationParams,
  parseRadiusParam,
} from "@/lib/location-detection";
import type { GameFilterParams } from "@/lib/types/game";
import { cn } from "@/lib/utils";
import { EnumType } from "json-to-graphql-query";
import { Users } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";

interface HomePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return <PublicHomePage searchParams={searchParams} />;
  }

  return <AuthenticatedHomePage />;
}

// ---------------------------------------------------------------------------
// Authenticated home page -- following activity feed (unchanged behavior)
// ---------------------------------------------------------------------------

async function AuthenticatedHomePage() {
  const t = await getTranslations();
  const feedData = await loadFeedGames(10);

  // Error state
  if (!feedData) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <TypographyP className="text-lg font-semibold text-destructive">
            {t("feed.error")}
          </TypographyP>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline" }), "mt-4")}
          >
            {t("feed.retry")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <TypographyH1 className="text-3xl">{t("feed.title")}</TypographyH1>
        <Link href="/game" className={buttonVariants()}>
          {t("game.actions.create")}
        </Link>
      </div>

      {/* Feed content */}
      {feedData.edges.length === 0 ? (
        <Empty>
          <EmptyHeader>
            {/* TODO: Replace with custom illustration */}
            <EmptyMedia variant="icon">
              <Users />
            </EmptyMedia>
            <EmptyTitle className="font-display font-semibold">
              {t("feed.empty.title")}
            </EmptyTitle>
            <EmptyDescription>{t("feed.empty.description")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Link
              href="/games"
              className={cn(buttonVariants(), "w-full")}
            >
              {t("feed.empty.createGame")}
            </Link>
            <Link
              href="/search"
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              {t("feed.empty.findPeople")}
            </Link>
          </EmptyContent>
        </Empty>
      ) : (
        <ActivityFeed
          initialEdges={feedData.edges}
          initialPageInfo={feedData.pageInfo}
        />
      )}
    </main>
  );
}

// ---------------------------------------------------------------------------
// Public home page -- game discovery feed for unauthenticated visitors
// ---------------------------------------------------------------------------

async function PublicHomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const queryParams = await searchParams;
  const t = await getTranslations();

  // Parse location from URL
  const parsedLocation = parseLocationParams(queryParams);
  const distanceMiles = parseRadiusParam(queryParams.radius);
  const hasNearLocation = !!parsedLocation;

  // Parse sportType from URL
  const sportTypeParam =
    typeof queryParams.sportType === "string"
      ? queryParams.sportType
      : undefined;
  const isValidSportType = (type: string | undefined): type is SportType =>
    type !== undefined && type in SportType;
  const validSportType = isValidSportType(sportTypeParam)
    ? sportTypeParam
    : undefined;

  // Parse gameStatus from URL
  const gameStatusParam =
    typeof queryParams.gameStatus === "string"
      ? queryParams.gameStatus
      : undefined;
  const isValidGameStatus = (
    status: string | undefined,
  ): status is GameStatus =>
    status !== undefined && status in GameStatus;
  const validGameStatus = isValidGameStatus(gameStatusParam)
    ? gameStatusParam
    : undefined;

  // Date lookback: 30 days for completed games, 7 days otherwise
  const lookbackDays = validGameStatus === GameStatus.COMPLETE ? 30 : 7;
  const startAfterDate = new Date();
  startAfterDate.setDate(startAfterDate.getDate() - lookbackDays);

  const thirtyDaysOut = new Date();
  thirtyDaysOut.setDate(thirtyDaysOut.getDate() + 30);

  // Build filters
  const filters: GameFilterParams = {
    startAfter: startAfterDate.toISOString(),
    sportType: validSportType,
    gameStatus: validGameStatus,
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
    filters.startBefore = thirtyDaysOut.toISOString();
  }

  // Sort: DISTANCE ASC with location, START_DATE DESC without
  const sortField = hasNearLocation
    ? GameSortField.DISTANCE
    : GameSortField.START_DATE;
  const sortDirection = hasNearLocation
    ? SortDirection.ASC
    : SortDirection.DESC;

  // Build GraphQL filter input
  const filterInput: Record<string, unknown> = {};
  if (filters.startAfter) filterInput.startAfter = filters.startAfter;
  if (filters.startBefore) filterInput.startBefore = filters.startBefore;
  if (filters.sportType)
    filterInput.sportType = new EnumType(filters.sportType);
  if (filters.gameStatus)
    filterInput.gameStatus = new EnumType(filters.gameStatus);
  if (filters.nearLocation) {
    filterInput.nearLocation = {
      latitude: filters.nearLocation.latitude,
      longitude: filters.nearLocation.longitude,
      radiusMeters: filters.nearLocation.radiusMeters,
    };
  }

  // Unauthenticated query -- omits viewerGameRole, viewerInvitation, viewerFollowingPlayers
  const gamesResponse = await query({
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
        ...(hasNearLocation ? { distance: true } : {}),
        node: {
          id: true,
          startDate: true,
          endDate: true,
          sportType: true,
          metadata: gameMetadataFragment,
          gameStatus: true,
          visibility: true,
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

  const games = gamesResponse.data?.games;

  if (gamesResponse.errors?.length > 0) {
    console.error("Public feed query errors:", gamesResponse.errors);
  }

  // Error state
  if (!games) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <TypographyP className="text-lg font-semibold text-destructive">
            {t("game.errors.loadError")}
          </TypographyP>
          <Link
            href="/"
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
      <IntegratedHero>
        <DiscoverFeed
          initialEdges={games.edges}
          initialPageInfo={games.pageInfo}
          initialFilters={filters}
          initialSort={{ field: sortField, direction: sortDirection }}
          locationName={parsedLocation?.locationName ?? null}
          hasLocation={hasNearLocation}
          distanceMiles={distanceMiles}
          showDistancePresets={false}
          showInlineCta={true}
        />
      </IntegratedHero>
    </main>
  );
}
