"use server";

import { GameSortField, SortDirection } from "@/lib/constants";
import {
  errorFragment,
  gameMetadataFragment,
  participantNodeFragment,
} from "@/lib/graphql-fragments";
import { authMutate, query } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import { EnumType } from "json-to-graphql-query";

export async function sendFriendRequest(userId: string) {
  try {
    const response = await authMutate({
      sendFriendRequest: {
        __args: { input: { userId } },
        __typename: true,
        __on: [
          {
            __typeName: "SendFriendRequestResponse",
            friendship: {
              id: true,
              status: true,
              requester: { id: true },
              addressee: { id: true },
            },
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.sendFriendRequest, "SendFriendRequestResponse");
    if (!result.success) return result;

    return { success: true, friendship: result.data.friendship };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to send friend request" };
  }
}

export async function acceptFriendRequest(requesterId: string) {
  try {
    const response = await authMutate({
      acceptFriendRequest: {
        __args: { input: { requesterId } },
        __typename: true,
        __on: [
          {
            __typeName: "AcceptFriendRequestResponse",
            friendship: {
              id: true,
              status: true,
              requester: { id: true },
              addressee: { id: true },
            },
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.acceptFriendRequest, "AcceptFriendRequestResponse");
    if (!result.success) return result;

    return { success: true, friendship: result.data.friendship };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to accept friend request" };
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
          metadata: gameMetadataFragment,
          gameStatus: true,
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
        endCursor: true,
      },
    },
  });

  return response.data?.games;
}
