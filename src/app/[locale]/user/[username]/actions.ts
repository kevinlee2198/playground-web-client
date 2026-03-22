"use server";

import {
  errorFragment,
  followUserRefFragment,
  followUserStateFragment,
} from "@/lib/graphql-fragments";
import { authMutate, authQuery } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import type { Player, UpdatePlayerInput } from "@/lib/types/player";
import { revalidatePath } from "next/cache";

export async function followUser(userId: string) {
  try {
    const response = await authMutate({
      followUser: {
        __args: { input: { userId } },
        __typename: true,
        __on: [
          {
            __typeName: "FollowUserResponse",
            user: followUserStateFragment,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.followUser, "FollowUserResponse");
    if (!result.success) return result;

    return { success: true, user: result.data.user };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to follow user" };
  }
}

export async function unfollowUser(userId: string) {
  try {
    const response = await authMutate({
      unfollowUser: {
        __args: { input: { userId } },
        __typename: true,
        __on: [
          {
            __typeName: "UnfollowUserResponse",
            user: followUserStateFragment,
            wasMutualFollow: true,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.unfollowUser, "UnfollowUserResponse");
    if (!result.success) return result;

    return { success: true, user: result.data.user, wasMutualFollow: result.data.wasMutualFollow };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to unfollow user" };
  }
}

export async function removeFollower(userId: string) {
  try {
    const response = await authMutate({
      removeFollower: {
        __args: { input: { userId } },
        __typename: true,
        __on: [
          {
            __typeName: "RemoveFollowerResponse",
            userId: true,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.removeFollower, "RemoveFollowerResponse");
    if (!result.success) return result;

    return { success: true, userId: result.data.userId };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to remove follower" };
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
            userId: true,
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

    return { success: true, userId: result.data.userId };
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
            userId: true,
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

    return { success: true, userId: result.data.userId };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to unblock user" };
  }
}

export async function loadFollowers(userId: string, first: number, after?: string) {
  try {
    const response = await authQuery({
      followers: {
        __args: {
          userId,
          first,
          ...(after ? { after } : {}),
        },
        edges: {
          cursor: true,
          node: {
            id: true,
            follower: followUserRefFragment,
            following: { id: true },
            createdDate: true,
          },
        },
        pageInfo: {
          hasNextPage: true,
          endCursor: true,
        },
      },
    });

    if (response.errors?.length > 0) {
      return null;
    }

    return response.data?.followers || null;
  } catch (error) {
    console.error("Failed to load followers:", error);
    return null;
  }
}

export async function loadFollowing(userId: string, first: number, after?: string) {
  try {
    const response = await authQuery({
      following: {
        __args: {
          userId,
          first,
          ...(after ? { after } : {}),
        },
        edges: {
          cursor: true,
          node: {
            id: true,
            follower: { id: true },
            following: followUserRefFragment,
            createdDate: true,
          },
        },
        pageInfo: {
          hasNextPage: true,
          endCursor: true,
        },
      },
    });

    if (response.errors?.length > 0) {
      return null;
    }

    return response.data?.following || null;
  } catch (error) {
    console.error("Failed to load following:", error);
    return null;
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
