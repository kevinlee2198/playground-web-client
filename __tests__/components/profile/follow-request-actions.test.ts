import { describe, it, expect, vi, beforeEach } from "vitest";
import { MutationErrorType } from "@/lib/graphql-result";

const { mockAuthMutate } = vi.hoisted(() => ({
  mockAuthMutate: vi.fn(),
}));

vi.mock("@/lib/graphql-request", () => ({
  authMutate: mockAuthMutate,
}));

import {
  approveFollowRequest,
  declineFollowRequest,
  cancelFollowRequest,
} from "@/components/profile/follow-request-actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockMutateSuccess(
  key: string,
  typeName: string,
  fields: Record<string, unknown> = {},
) {
  mockAuthMutate.mockResolvedValueOnce({
    data: { [key]: { __typename: typeName, ...fields } },
  });
}

function mockMutateGraphqlError(message: string) {
  mockAuthMutate.mockResolvedValueOnce({
    data: {},
    errors: [{ message }],
  });
}

function mockMutateUnionError(
  key: string,
  errorTypeName: string,
  message: string,
) {
  mockAuthMutate.mockResolvedValueOnce({
    data: { [key]: { __typename: errorTypeName, message } },
  });
}

function getMutationInput(key: string): Record<string, unknown> {
  const callArg = mockAuthMutate.mock.calls[0][0] as Record<string, unknown>;
  return (callArg[key] as { __args: { input: Record<string, unknown> } }).__args
    .input;
}

// ---------------------------------------------------------------------------
// Shared test structure for all three mutation actions
// ---------------------------------------------------------------------------

const actions = [
  {
    name: "approveFollowRequest",
    fn: approveFollowRequest,
    key: "approveFollowRequest",
    successTypeName: "ApproveFollowRequestResponse",
    successFields: { follow: { id: "follow-1" } },
    unionErrors: [
      { type: "FollowRequestNotFoundError", message: "Follow request not found" },
      { type: "NotFollowRequestTargetError", message: "You are not the target of this follow request" },
    ],
    unexpectedMessage: "Failed to approve follow request",
  },
  {
    name: "declineFollowRequest",
    fn: declineFollowRequest,
    key: "declineFollowRequest",
    successTypeName: "DeclineFollowRequestResponse",
    successFields: { id: "req-2" },
    unionErrors: [
      { type: "FollowRequestNotFoundError", message: "Follow request not found" },
      { type: "NotFollowRequestTargetError", message: "You are not the target of this follow request" },
    ],
    unexpectedMessage: "Failed to decline follow request",
  },
  {
    name: "cancelFollowRequest",
    fn: cancelFollowRequest,
    key: "cancelFollowRequest",
    successTypeName: "CancelFollowRequestResponse",
    successFields: { id: "req-3" },
    unionErrors: [
      { type: "FollowRequestNotFoundError", message: "Follow request not found" },
      { type: "NotFollowRequestRequesterError", message: "You are not the requester of this follow request" },
    ],
    unexpectedMessage: "Failed to cancel follow request",
  },
] as const;

describe.each(actions)(
  "$name",
  ({ fn, key, successTypeName, successFields, unionErrors, unexpectedMessage }) => {
    beforeEach(() => vi.clearAllMocks());

    it("returns success on successful mutation", async () => {
      mockMutateSuccess(key, successTypeName, successFields);

      const result = await fn("req-1");

      expect(result).toEqual({ success: true });
    });

    it("passes requestId in mutation input", async () => {
      mockMutateSuccess(key, successTypeName, successFields);

      await fn("req-abc");

      expect(getMutationInput(key)).toEqual({ requestId: "req-abc" });
    });

    it("returns GRAPHQL_ERROR on top-level GraphQL errors", async () => {
      mockMutateGraphqlError("Unauthorized");

      const result = await fn("req-1");

      expect(result).toEqual({
        success: false,
        errorType: MutationErrorType.GRAPHQL_ERROR,
        message: "Unauthorized",
      });
    });

    it.each(unionErrors)(
      "returns $type on union error",
      async ({ type, message }) => {
        mockMutateUnionError(key, type, message);

        const result = await fn("req-1");

        expect(result).toEqual({
          success: false,
          errorType: type,
          message,
        });
      },
    );

    it("returns UNEXPECTED_ERROR on network failure", async () => {
      mockAuthMutate.mockRejectedValueOnce(new Error("Network failure"));

      const result = await fn("req-1");

      expect(result).toEqual({
        success: false,
        errorType: MutationErrorType.UNEXPECTED_ERROR,
        message: unexpectedMessage,
      });
    });
  },
);
