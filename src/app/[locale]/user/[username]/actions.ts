"use server";

import { GameSortField, SortDirection } from "@/lib/constants";
import { authMutate, query } from "@/lib/graphql-request";
import { EnumType } from "json-to-graphql-query";

export async function sendFriendRequest(userId: string) {
  try {
    const response = await authMutate({
      sendFriendRequest: {
        __args: { input: { userId } },
        friendship: {
          id: true,
          status: true,
          requester: { id: true },
          addressee: { id: true },
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return {
      success: true,
      friendship: response.data.sendFriendRequest.friendship,
    };
  } catch {
    return { success: false, error: "Failed to send friend request" };
  }
}

export async function acceptFriendRequest(requesterId: string) {
  try {
    const response = await authMutate({
      acceptFriendRequest: {
        __args: { input: { requesterId } },
        friendship: {
          id: true,
          status: true,
          requester: { id: true },
          addressee: { id: true },
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return {
      success: true,
      friendship: response.data.acceptFriendRequest.friendship,
    };
  } catch {
    return { success: false, error: "Failed to accept friend request" };
  }
}

export async function loadMoreGames(playerId: string, after: string) {
  const response = await query({
    games: {
      __args: {
        input: { playerId },
        sort: [
          {
            field: new EnumType(GameSortField.START_DATE),
            direction: new EnumType(SortDirection.DESC),
          },
        ],
        first: 10,
        after,
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
  });

  return response.data?.games;
}
