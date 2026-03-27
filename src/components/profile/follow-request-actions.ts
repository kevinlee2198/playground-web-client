"use server";

import { errorFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";

export async function approveFollowRequest(requestId: string) {
  try {
    const response = await authMutate({
      approveFollowRequest: {
        __args: { input: { requestId } },
        __typename: true,
        __on: [
          {
            __typeName: "ApproveFollowRequestResponse",
            follow: { id: true },
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.approveFollowRequest, "ApproveFollowRequestResponse");
    if (!result.success) return result;

    return { success: true };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to approve follow request" };
  }
}

export async function cancelFollowRequest(requestId: string) {
  try {
    const response = await authMutate({
      cancelFollowRequest: {
        __args: { input: { requestId } },
        __typename: true,
        __on: [
          {
            __typeName: "CancelFollowRequestResponse",
            id: true,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.cancelFollowRequest, "CancelFollowRequestResponse");
    if (!result.success) return result;

    return { success: true };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to cancel follow request" };
  }
}

export async function declineFollowRequest(requestId: string) {
  try {
    const response = await authMutate({
      declineFollowRequest: {
        __args: { input: { requestId } },
        __typename: true,
        __on: [
          {
            __typeName: "DeclineFollowRequestResponse",
            id: true,
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.declineFollowRequest, "DeclineFollowRequestResponse");
    if (!result.success) return result;

    return { success: true };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to decline follow request" };
  }
}
