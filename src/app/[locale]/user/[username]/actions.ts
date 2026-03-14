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
import { revalidatePath } from "next/cache";

const friendshipSelection = {
  id: true,
  status: true,
  requester: { id: true },
  addressee: { id: true },
};

export async function sendFriendRequest(userId: string) {
  try {
    const response = await authMutate({
      sendFriendRequest: {
        __args: { input: { userId } },
        __typename: true,
        __on: [
          {
            __typeName: "SendFriendRequestResponse",
            friendship: friendshipSelection,
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
            friendship: friendshipSelection,
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

export async function blockUser(userId: string) {
  try {
    const response = await authMutate({
      blockUser: {
        __args: { input: { userId } },
        __typename: true,
        __on: [
          {
            __typeName: "BlockUserResponse",
            friendship: friendshipSelection,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.blockUser, "BlockUserResponse");
    if (!result.success) return result;

    return { success: true, friendship: result.data.friendship };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to block user" };
  }
}

export async function unblockUser(userId: string) {
  try {
    const response = await authMutate({
      unblockUser: {
        __args: { input: { userId } },
        __typename: true,
        __on: [
          {
            __typeName: "UnblockUserResponse",
            friendship: friendshipSelection,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.unblockUser, "UnblockUserResponse");
    if (!result.success) return result;

    return { success: true };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to unblock user" };
  }
}

interface UpdateUserResult {
  success: boolean;
  user?: { id: string; displayName: string; biography: string | null };
  errorType?: string;
  message?: string;
}

export async function updateUser(input: {
  displayName?: string;
  biography?: string | null;
}): Promise<UpdateUserResult> {
  try {
    const response = await authMutate({
      updateUser: {
        __args: { input },
        __typename: true,
        __on: [
          {
            __typeName: "UpdateUserResponse",
            user: {
              id: true,
              displayName: true,
              biography: true,
            },
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return {
        success: false,
        errorType: MutationErrorType.GRAPHQL_ERROR,
        message: response.errors[0].message,
      };
    }

    const result = extractMutationResult(
      response.data.updateUser,
      "UpdateUserResponse",
    );
    if (!result.success) return result;

    revalidatePath("/[locale]/user/[username]", "page");

    return { success: true, user: result.data.user };
  } catch {
    return {
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to update user",
    };
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
        endCursor: true,
      },
    },
  });

  return response.data?.games;
}
