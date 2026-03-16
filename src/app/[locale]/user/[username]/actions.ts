"use server";

import { errorFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import type { Player, UpdatePlayerInput } from "@/lib/types/player";
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

    const data = response.data?.updateUser;
    if (!data || data.__typename !== "UpdateUserResponse") {
      return {
        success: false,
        errorType: MutationErrorType.UNEXPECTED_ERROR,
        message: "Unexpected response",
      };
    }

    revalidatePath("/[locale]/user/[username]", "page");

    return { success: true, user: data.user };
  } catch {
    return {
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to update user",
    };
  }
}

interface PlayerActionResult {
  success: boolean;
  player?: Player;
  errorType?: string;
  message?: string;
}

export async function updatePlayer(
  input: UpdatePlayerInput,
): Promise<PlayerActionResult> {
  try {
    // Build input object with only changed fields (PATCH semantics)
    const mutationInput: Record<string, unknown> = {};

    // Only include fields that are explicitly provided
    if ("age" in input) mutationInput.age = input.age;
    if ("height" in input) mutationInput.height = input.height;
    if ("weight" in input) mutationInput.weight = input.weight;

    const response = await authMutate({
      updatePlayer: {
        __args: { input: mutationInput },
        __typename: true,
        __on: [
          {
            __typeName: "UpdatePlayerResponse",
            player: {
              id: true,
              age: true,
              height: true,
              weight: true,
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
      response.data.updatePlayer,
      "UpdatePlayerResponse",
    );
    if (!result.success) return result;

    revalidatePath("/[locale]/user/[username]", "page");
    return { success: true, player: result.data.player };
  } catch (error) {
    console.error("Failed to update player:", error);
    return {
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to update player",
    };
  }
}
