import { fetchCurrentUser } from "@/components/auth/actions";
import { GameCardSkeleton } from "@/components/game/game-card-skeleton";
import { GameHistory } from "@/components/profile/game-history";
import { PlayerStatsEditorLoader } from "@/components/profile/player-stats-editor-loader";
import { PlayerStats } from "@/components/profile/player-stats";
import { ProfileHeader } from "@/components/profile/profile-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  GameSortField,
  SortDirection,
} from "@/lib/constants";
import { auth } from "@/lib/auth";
import {
  gameMetadataFragment,
  participantNodeFragment,
  resourceFragment,
} from "@/lib/graphql-fragments";
import { authQuery, query } from "@/lib/graphql-request";
import { EnumType } from "json-to-graphql-query";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";

interface PageProps {
  params: Promise<{ locale: string; username: string }>;
}

const getCachedUserDisplayName = cache(async (username: string) => {
  const response = await query({
    user: {
      __args: { input: { username } },
      displayName: true,
    },
  });
  return response.data?.user;
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const user = await getCachedUserDisplayName(username);

  return {
    title: user ? `${user.displayName} | Playground` : "Profile | Playground",
    description: user
      ? `View ${user.displayName}'s profile on Playground`
      : "User profile",
  };
}

function buildUserQuery(username: string) {
  return {
    user: {
      __args: { input: { username } },
      id: true,
      username: true,
      firstName: true,
      lastName: true,
      displayName: true,
      biography: true,
      profilePicture: resourceFragment,
      followerCount: true,
      followingCount: true,
      viewerFollowsUser: true,
      userFollowsViewer: true,
      player: {
        id: true,
        age: true,
        height: true,
        weight: true,
      },
    },
  };
}

function buildGamesQuery(playerId: number) {
  return {
    games: {
      __args: {
        input: { playerId: playerId },
        sort: [
          {
            field: new EnumType(GameSortField.START_DATE),
            direction: new EnumType(SortDirection.DESC),
          },
        ],
        first: 5,
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
              cursor: true,
              node: participantNodeFragment,
            },
          },
        },
      },
      pageInfo: {
        hasNextPage: true,
      },
    },
  };
}

async function GameHistorySection({ playerId }: { playerId: number }) {
  const gamesResponse = await query(buildGamesQuery(playerId));
  return (
    <GameHistory
      playerId={String(playerId)}
      initialGames={gamesResponse.data?.games}
    />
  );
}

function GameHistorySkeleton() {
  return (
    <section>
      <Skeleton className="mb-4 h-7 w-36" />
      <div className="grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <GameCardSkeleton key={i} />
        ))}
      </div>
    </section>
  );
}

export default async function UserProfilePage({ params }: PageProps) {
  const { username } = await params;

  const reqHeaders = await headers();
  const session = await auth.api.getSession({ headers: reqHeaders });
  const isAuthenticated = !!session?.user?.id;

  const [currentUser, userResponse] = await Promise.all([
    isAuthenticated ? fetchCurrentUser() : Promise.resolve(null),
    isAuthenticated
      ? authQuery(buildUserQuery(username))
      : query(buildUserQuery(username)),
  ]);

  const isOwnProfile = currentUser?.username === username;

  const user = userResponse.data?.user;

  if (!user) {
    notFound();
  }

  const player = user.player;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <ProfileHeader
        user={user}
        isOwnProfile={isOwnProfile}
        isAuthenticated={isAuthenticated}
      />

      {isOwnProfile ? (
        <PlayerStatsEditorLoader initialPlayer={player} />
      ) : (
        <PlayerStats player={player} />
      )}

      <Suspense fallback={<GameHistorySkeleton />}>
        <GameHistorySection playerId={player.id} />
      </Suspense>
    </main>
  );
}
