import { GameHistory } from "@/components/profile/game-history";
import { PlayerStats } from "@/components/profile/player-stats";
import { ProfileHeader } from "@/components/profile/profile-header";
import { auth } from "@/lib/auth";
import {
  FriendshipStatus,
  GameSortField,
  SortDirection,
} from "@/lib/constants";
import { authQuery, query } from "@/lib/graphql-request";
import { EnumType } from "json-to-graphql-query";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { id: userId } = await params;
  const response = await query({
    user: { __args: { id: userId }, firstName: true, lastName: true },
  });
  const user = response.data?.user;

  return {
    title: user
      ? `${user.firstName} ${user.lastName} | Playground`
      : "Profile | Playground",
    description: user
      ? `View ${user.firstName}'s profile on Playground`
      : "User profile",
  };
}

function buildUserQuery(userId: string) {
  return {
    user: {
      __args: { id: userId },
      id: true,
      firstName: true,
      lastName: true,
      player: {
        id: true,
        firstName: true,
        lastName: true,
        age: true,
        height: true,
        weight: true,
        biography: true,
      },
      friendship: {
        id: true,
        status: true,
        requester: { id: true },
        addressee: { id: true },
        createdDate: true,
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
        first: 10,
      },
      edges: {
        cursor: true,
        node: {
          id: true,
          startDate: true,
          endDate: true,
          sportType: true,
          sportSubtype: true,
          gameStatus: true,
          participants: {
            __args: { first: 10 },
            edges: {
              cursor: true,
              node: {
                __typename: true,
                __on: [
                  {
                    __typeName: "TeamInstance",
                    id: true,
                    name: true,
                    players: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                  {
                    __typeName: "IndividualParticipant",
                    id: true,
                    player: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                ],
              },
            },
          },
        },
      },
      pageInfo: {
        hasNextPage: true,
        endCursor: true,
      },
    },
  };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { locale, id: userId } = await params;

  // Get current user session
  const session = await auth.api.getSession({ headers: await headers() });
  const currentUserId = session?.user?.id; // This logic is wrong - the user ID needs to come from the me query on the backend
  const isAuthenticated = !!currentUserId;
  const isOwnProfile = currentUserId === userId;

  // Fetch user data - use authQuery if authenticated to get friendship data
  const userResponse = isAuthenticated
    ? await authQuery(buildUserQuery(userId))
    : await query(buildUserQuery(userId));

  const user = userResponse.data?.user;

  if (!user) {
    notFound();
  }

  // Check for BLOCKED status - show 404 to hide the block
  const friendship = user.friendship;
  if (
    friendship?.status === FriendshipStatus.BLOCKED &&
    friendship.addressee.id === currentUserId
  ) {
    notFound();
  }

  const player = user.player;

  // Fetch games if player exists
  let initialGames = null;
  if (player) {
    const gamesResponse = await query(buildGamesQuery(player.id));
    initialGames = gamesResponse.data?.games;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <ProfileHeader
        user={user}
        friendship={friendship}
        currentUserId={currentUserId}
        isOwnProfile={isOwnProfile}
        isAuthenticated={isAuthenticated}
        locale={locale}
      />

      {player && <PlayerStats player={player} />}

      <GameHistory playerId={player?.id} initialGames={initialGames} />
    </main>
  );
}
