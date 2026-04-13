import { describe, it, expect, vi, beforeEach } from "vitest";
import { MutationErrorType } from "@/lib/graphql-result";

const { mockAuthMutate, mockAuthQuery } = vi.hoisted(() => ({
  mockAuthMutate: vi.fn(),
  mockAuthQuery: vi.fn(),
}));

vi.mock("@/lib/graphql-request", () => ({
  authMutate: mockAuthMutate,
  authQuery: mockAuthQuery,
}));

import {
  fetchNotifications,
  markNotificationsAsRead,
} from "@/components/notification/actions";

// ---------------------------------------------------------------------------
// Helpers – mutations
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

function mockMutateNetworkError() {
  mockAuthMutate.mockRejectedValueOnce(new Error("Network failure"));
}

// ---------------------------------------------------------------------------
// Helpers – queries
// ---------------------------------------------------------------------------

function mockQuerySuccess(data: Record<string, unknown>) {
  mockAuthQuery.mockResolvedValueOnce({ data });
}

function mockQueryGraphqlError(message: string) {
  mockAuthQuery.mockResolvedValueOnce({
    data: {},
    errors: [{ message }],
  });
}

function mockQueryNetworkError() {
  mockAuthQuery.mockRejectedValueOnce(new Error("Network failure"));
}

// ---------------------------------------------------------------------------
// fetchNotifications
// ---------------------------------------------------------------------------

describe("fetchNotifications", () => {
  beforeEach(() => vi.clearAllMocks());

  const emptyConnection = {
    edges: [],
    pageInfo: { hasNextPage: false, endCursor: null },
  };

  const mockEdges = [
    {
      cursor: "c1",
      node: {
        __typename: "NewFollowerNotification",
        id: "n1",
        isRead: false,
        createdDate: "2025-01-01",
        follower: { id: 1, username: "alice", displayName: "Alice" },
      },
    },
  ];

  const mockPageInfo = { hasNextPage: false, endCursor: "c1" };

  it("returns notifications on success", async () => {
    mockQuerySuccess({
      notifications: { edges: mockEdges, pageInfo: mockPageInfo },
    });

    const result = await fetchNotifications(10);

    expect(result).toEqual({
      success: true,
      edges: mockEdges,
      pageInfo: mockPageInfo,
      error: null,
    });
    expect(mockAuthQuery).toHaveBeenCalledOnce();
  });

  it("passes first count in query args", async () => {
    mockQuerySuccess({ notifications: emptyConnection });

    await fetchNotifications(20);

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const notificationsArgs = (
      callArg.notifications as { __args: Record<string, unknown> }
    ).__args;
    expect(notificationsArgs).toHaveProperty("first", 20);
  });

  it("passes after cursor when provided", async () => {
    mockQuerySuccess({ notifications: emptyConnection });

    await fetchNotifications(10, "cursor123");

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const notificationsArgs = (
      callArg.notifications as { __args: Record<string, unknown> }
    ).__args;
    expect(notificationsArgs).toHaveProperty("after", "cursor123");
  });

  it("omits after from args when not provided", async () => {
    mockQuerySuccess({ notifications: emptyConnection });

    await fetchNotifications(10);

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const notificationsArgs = (
      callArg.notifications as { __args: Record<string, unknown> }
    ).__args;
    expect(notificationsArgs).not.toHaveProperty("after");
  });

  it("handles pagination with hasNextPage true", async () => {
    const pageInfo = { hasNextPage: true, endCursor: "c5" };
    mockQuerySuccess({
      notifications: { edges: mockEdges, pageInfo },
    });

    const result = await fetchNotifications(5);

    expect(result.success).toBe(true);
    expect(result.pageInfo).toEqual(pageInfo);
  });

  it("returns empty edges and default pageInfo when notifications data is null", async () => {
    mockQuerySuccess({ notifications: null });

    const result = await fetchNotifications(10);

    expect(result).toEqual({
      success: true,
      edges: [],
      pageInfo: { hasNextPage: false, endCursor: null },
      error: null,
    });
  });

  it("returns error result on GraphQL errors", async () => {
    mockQueryGraphqlError("Unauthorized");

    const result = await fetchNotifications(10);

    expect(result).toEqual({
      success: false,
      edges: null,
      pageInfo: null,
      error: "Unauthorized",
    });
  });

  it("returns error result on network failure", async () => {
    mockQueryNetworkError();

    const result = await fetchNotifications(10);

    expect(result).toEqual({
      success: false,
      edges: null,
      pageInfo: null,
      error: "Failed to load notifications",
    });
  });
});

// ---------------------------------------------------------------------------
// markNotificationsAsRead
// ---------------------------------------------------------------------------

describe("markNotificationsAsRead", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockNotifications = [
    {
      __typename: "NewFollowerNotification",
      id: "n1",
      isRead: true,
      createdDate: "2025-01-01",
      follower: { id: 1, username: "alice", displayName: "Alice" },
    },
    {
      __typename: "GameStartedNotification",
      id: "n2",
      isRead: true,
      createdDate: "2025-01-02",
      game: { id: "g1", sportType: "BASKETBALL" },
    },
  ];

  it("returns success with notifications on mark as read", async () => {
    mockMutateSuccess("readNotifications", "ReadNotificationsResponse", {
      notifications: mockNotifications,
    });

    const result = await markNotificationsAsRead(["n1", "n2"]);

    expect(result).toEqual({
      success: true,
      notifications: mockNotifications,
    });
    expect(mockAuthMutate).toHaveBeenCalledOnce();
  });

  it("sends notification ids in mutation input", async () => {
    mockMutateSuccess("readNotifications", "ReadNotificationsResponse", {
      notifications: mockNotifications,
    });

    await markNotificationsAsRead(["n1", "n2"]);

    const callArg = mockAuthMutate.mock.calls[0][0] as Record<string, unknown>;
    const mutInput = (
      callArg.readNotifications as { __args: { input: { ids: string[] } } }
    ).__args.input;
    expect(mutInput).toEqual({ ids: ["n1", "n2"] });
  });

  it("handles single notification id", async () => {
    mockMutateSuccess("readNotifications", "ReadNotificationsResponse", {
      notifications: [mockNotifications[0]],
    });

    const result = await markNotificationsAsRead(["n1"]);

    expect(result.success).toBe(true);
    expect(result.notifications).toHaveLength(1);
  });

  it("returns empty array when notifications is null in response", async () => {
    mockMutateSuccess("readNotifications", "ReadNotificationsResponse", {
      notifications: null,
    });

    const result = await markNotificationsAsRead(["n1"]);

    expect(result).toEqual({
      success: true,
      notifications: [],
    });
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const result = await markNotificationsAsRead(["n1"]);

    expect(result).toEqual({
      success: false,
      notifications: null,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
    });
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("readNotifications", "NotificationNotFoundError", "Notification not found");

    const result = await markNotificationsAsRead(["n1"]);

    expect(result).toEqual({
      success: false,
      notifications: null,
      errorType: "NotificationNotFoundError",
      message: "Notification not found",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await markNotificationsAsRead(["n1"]);

    expect(result).toEqual({
      success: false,
      notifications: null,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to mark as read",
    });
  });
});
