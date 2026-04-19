"use server";

import {
  errorFragment,
  followUserRefFragment,
  followUserStateFragment,
  forwardPageInfoFragment,
} from "@/lib/graphql-fragments";
import { authMutate, authQuery } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import { revalidatePath } from "next/cache";
import { z } from "zod";

interface FollowUserState {
  id: number;
  viewerFollowsUser: boolean;
  userFollowsViewer: boolean;
  viewerSentFollowRequest: { id: string } | null;
  followerCount: number;
  followingCount: number;
}

export type FollowUserResult =
  | { success: true; type: "followed"; user: FollowUserState }
  | { success: true; type: "requested"; requestId: string }
  | { success: false; errorType: string; message: string };

export async function followUser(userId: number): Promise<FollowUserResult> {
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
          {
            __typeName: "FollowRequestSentResponse",
            followRequest: { id: true },
          },
          {
            __typeName: "FollowRequestAlreadyExistsError",
            requestId: true,
            message: true,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const data = response.data.followUser;

    if (data.__typename === "FollowUserResponse") {
      return { success: true, type: "followed", user: data.user };
    }

    if (data.__typename === "FollowRequestSentResponse") {
      return { success: true, type: "requested", requestId: data.followRequest.id };
    }

    if (data.__typename === "FollowRequestAlreadyExistsError") {
      return { success: true, type: "requested", requestId: data.requestId };
    }

    return { success: false, errorType: data.__typename, message: data.message ?? "Failed to follow user" };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to follow user" };
  }
}

export async function unfollowUser(userId: number) {
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

export async function removeFollower(userId: number) {
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

export async function blockUser(userId: number) {
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

export async function unblockUser(userId: number) {
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

async function loadFollowConnection(
  userId: number,
  field: "followers" | "following",
  nodeFragment: Record<string, unknown>,
  first: number,
  after?: string,
) {
  try {
    const response = await authQuery({
      user: {
        __args: { input: { id: userId } },
        [field]: {
          __args: {
            first,
            ...(after ? { after } : {}),
          },
          edges: {
            cursor: true,
            node: nodeFragment,
          },
          pageInfo: forwardPageInfoFragment,
        },
      },
    });

    if (response.errors?.length > 0) {
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (response.data?.user as any)?.[field] || null;
  } catch (error) {
    console.error(`Failed to load ${field}:`, error);
    return null;
  }
}

export async function loadFollowers(userId: number, first: number, after?: string) {
  return loadFollowConnection(userId, "followers", {
    id: true,
    follower: followUserRefFragment,
    following: { id: true },
    createdDate: true,
  }, first, after);
}

export async function loadFollowing(userId: number, first: number, after?: string) {
  return loadFollowConnection(userId, "following", {
    id: true,
    follower: { id: true },
    following: followUserRefFragment,
    createdDate: true,
  }, first, after);
}

interface UpdateUserResult {
  success: boolean;
  user?: { id: number; displayName: string; biography: string | null };
  errorType?: string;
  message?: string;
}

const updateUserSchema = z.object({
  displayName: z.string().min(1).max(50).optional(),
  biography: z.string().max(500).nullable().optional(),
});

export async function updateUser(
  input: z.infer<typeof updateUserSchema>,
): Promise<UpdateUserResult> {
  try {
    const validated = updateUserSchema.parse(input);
    const response = await authMutate({
      updateUser: {
        __args: { input: validated },
        __on: {
          __typeName: "UpdateUserResponse",
          user: {
            id: true,
            displayName: true,
            biography: true,
          },
        },
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
    if (!data) {
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

