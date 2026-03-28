"use server";

import { errorFragment } from "@/lib/graphql-fragments";
import { authMutate } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";

type FollowRequestActionResult =
  | { success: true }
  | { success: false; errorType: string; message: string };

/**
 * Shared logic for follow request mutations (approve, cancel, decline).
 * Each mutation follows the same pattern: send input, check for errors,
 * extract the typed result, and return success/failure.
 */
async function executeFollowRequestAction(
  mutationName: string,
  successTypeName: string,
  requestId: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  successFields: Record<string, any>,
  errorMessage: string,
): Promise<FollowRequestActionResult> {
  try {
    const response = await authMutate({
      [mutationName]: {
        __args: { input: { requestId } },
        __typename: true,
        __on: [
          { __typeName: successTypeName, ...successFields },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data[mutationName], successTypeName);
    if (!result.success) return result;

    return { success: true };
  } catch {
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: errorMessage };
  }
}

export async function approveFollowRequest(requestId: string): Promise<FollowRequestActionResult> {
  return executeFollowRequestAction(
    "approveFollowRequest",
    "ApproveFollowRequestResponse",
    requestId,
    { follow: { id: true } },
    "Failed to approve follow request",
  );
}

export async function cancelFollowRequest(requestId: string): Promise<FollowRequestActionResult> {
  return executeFollowRequestAction(
    "cancelFollowRequest",
    "CancelFollowRequestResponse",
    requestId,
    { id: true },
    "Failed to cancel follow request",
  );
}

export async function declineFollowRequest(requestId: string): Promise<FollowRequestActionResult> {
  return executeFollowRequestAction(
    "declineFollowRequest",
    "DeclineFollowRequestResponse",
    requestId,
    { id: true },
    "Failed to decline follow request",
  );
}
