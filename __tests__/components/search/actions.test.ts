import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuthQuery, mockQuery, mockGetSession, mockHeaders } = vi.hoisted(() => ({
  mockAuthQuery: vi.fn(),
  mockQuery: vi.fn(),
  mockGetSession: vi.fn(),
  mockHeaders: vi.fn(),
}));

vi.mock("@/lib/graphql-request", () => ({
  authQuery: mockAuthQuery,
  query: mockQuery,
}));

vi.mock("@/lib/auth", () => ({
  auth: {
    api: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock("next/headers", () => ({
  headers: mockHeaders,
}));

import { searchUsers } from "@/components/search/actions";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockAuthenticated(userId = "user-123") {
  mockHeaders.mockResolvedValue(new Headers());
  mockGetSession.mockResolvedValue({
    user: { id: userId, email: "test@example.com" },
    session: { id: "session-123" },
  });
}

function mockUnauthenticated() {
  mockHeaders.mockResolvedValue(new Headers());
  mockGetSession.mockResolvedValue(null);
}

const mockSearchData = {
  searchUsers: {
    edges: [
      {
        cursor: "c1",
        node: {
          id: "u1",
          username: "alice",
          firstName: "Alice",
          lastName: "Smith",
          displayName: "Alice Smith",
        },
      },
    ],
    pageInfo: { hasNextPage: false, endCursor: "c1" },
  },
};

// ---------------------------------------------------------------------------
// searchUsers
// ---------------------------------------------------------------------------

describe("searchUsers", () => {
  beforeEach(() => vi.clearAllMocks());

  const emptyResult = {
    success: true,
    edges: [],
    pageInfo: { hasNextPage: false, endCursor: null },
    error: null,
  };

  it("returns empty result without calling query when search query is empty", async () => {
    const result = await searchUsers("", 10);

    expect(result).toEqual(emptyResult);
    expect(mockAuthQuery).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("returns empty result without calling query when search query is only whitespace", async () => {
    const result = await searchUsers("   ", 10);

    expect(result).toEqual(emptyResult);
    expect(mockAuthQuery).not.toHaveBeenCalled();
    expect(mockQuery).not.toHaveBeenCalled();
  });

  it("uses authQuery when user is authenticated", async () => {
    mockAuthenticated();
    mockAuthQuery.mockResolvedValueOnce({ data: mockSearchData });

    const result = await searchUsers("alice", 10);

    expect(mockAuthQuery).toHaveBeenCalledOnce();
    expect(mockQuery).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.edges).toEqual(mockSearchData.searchUsers.edges);
    expect(result.pageInfo).toEqual(mockSearchData.searchUsers.pageInfo);
    expect(result.error).toBeNull();
  });

  it("uses query when user is not authenticated", async () => {
    mockUnauthenticated();
    mockQuery.mockResolvedValueOnce({ data: mockSearchData });

    const result = await searchUsers("alice", 10);

    expect(mockQuery).toHaveBeenCalledOnce();
    expect(mockAuthQuery).not.toHaveBeenCalled();
    expect(result.success).toBe(true);
    expect(result.edges).toEqual(mockSearchData.searchUsers.edges);
  });

  it("passes trimmed query to the GraphQL request", async () => {
    mockAuthenticated();
    mockAuthQuery.mockResolvedValueOnce({ data: mockSearchData });

    await searchUsers("  alice  ", 10);

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const searchArgs = (
      callArg.searchUsers as { __args: { input: { query: string } } }
    ).__args.input;
    expect(searchArgs.query).toBe("alice");
  });

  it("passes after cursor when provided", async () => {
    mockAuthenticated();
    mockAuthQuery.mockResolvedValueOnce({ data: mockSearchData });

    await searchUsers("alice", 10, "cursor123");

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const searchArgs = (
      callArg.searchUsers as { __args: Record<string, unknown> }
    ).__args;
    expect(searchArgs).toHaveProperty("after", "cursor123");
  });

  it("omits after from args when not provided", async () => {
    mockAuthenticated();
    mockAuthQuery.mockResolvedValueOnce({ data: mockSearchData });

    await searchUsers("alice", 10);

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const searchArgs = (
      callArg.searchUsers as { __args: Record<string, unknown> }
    ).__args;
    expect(searchArgs).not.toHaveProperty("after");
  });

  it("returns error result on GraphQL errors (authenticated)", async () => {
    mockAuthenticated();
    mockAuthQuery.mockResolvedValueOnce({
      data: {},
      errors: [{ message: "Search failed" }],
    });

    const result = await searchUsers("alice", 10);

    expect(result).toEqual({
      success: false,
      edges: null,
      pageInfo: null,
      error: "Search failed",
    });
  });

  it("returns error result on GraphQL errors (unauthenticated)", async () => {
    mockUnauthenticated();
    mockQuery.mockResolvedValueOnce({
      data: {},
      errors: [{ message: "Service unavailable" }],
    });

    const result = await searchUsers("alice", 10);

    expect(result).toEqual({
      success: false,
      edges: null,
      pageInfo: null,
      error: "Service unavailable",
    });
  });

  it("returns error result on network failure", async () => {
    mockAuthenticated();
    mockAuthQuery.mockRejectedValueOnce(new Error("Network error"));

    const result = await searchUsers("alice", 10);

    expect(result).toEqual({
      success: false,
      edges: null,
      pageInfo: null,
      error: "Failed to search. Please try again.",
    });
  });

  it("returns empty edges and default pageInfo when searchUsers data is absent", async () => {
    mockAuthenticated();
    mockAuthQuery.mockResolvedValueOnce({ data: { searchUsers: null } });

    const result = await searchUsers("alice", 10);

    expect(result).toEqual(emptyResult);
  });
});
