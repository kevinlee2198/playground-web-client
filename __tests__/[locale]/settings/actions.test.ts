import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockAuthQuery, mockAuthMutate } = vi.hoisted(() => ({
  mockAuthQuery: vi.fn(),
  mockAuthMutate: vi.fn(),
}));

vi.mock("@/lib/graphql-request", () => ({
  authQuery: mockAuthQuery,
  authMutate: mockAuthMutate,
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

import { revalidatePath } from "next/cache";
import {
  loadBlockedUsers,
  loadUserPreferences,
  updatePreferences,
} from "@/app/[locale]/settings/actions";
import { MutationErrorType } from "@/lib/graphql-result";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function mockQuerySuccess(data: Record<string, unknown>) {
  mockAuthQuery.mockResolvedValueOnce({ data });
}

function mockQueryNetworkError() {
  mockAuthQuery.mockRejectedValueOnce(new Error("Network failure"));
}

function mockMutateSuccess(data: Record<string, unknown>) {
  mockAuthMutate.mockResolvedValueOnce({ data });
}

function mockUpdatePreferencesSuccess() {
  mockMutateSuccess({
    updateUserPreferences: {
      __typename: "UpdateUserPreferencesResponse",
      preferences: mockPreferences,
    },
  });
}

/** Extract the gqlInput passed to the updateUserPreferences mutation. */
function getLastMutateInput(): Record<string, unknown> {
  const callArg = mockAuthMutate.mock.calls[0][0] as Record<string, unknown>;
  return (
    callArg.updateUserPreferences as { __args: { input: Record<string, unknown> } }
  ).__args.input;
}

const mockPreferences = {
  measurementUnit: "METRIC",
  notificationsEnabled: true,
  emailDigestFrequency: "WEEKLY",
  profileVisibility: "PUBLIC",
  showOnlineStatus: true,
  showGameHistory: true,
  showStatistics: true,
  preferredSports: ["BASKETBALL"],
};

// ---------------------------------------------------------------------------
// loadBlockedUsers
// ---------------------------------------------------------------------------

describe("loadBlockedUsers", () => {
  beforeEach(() => vi.clearAllMocks());

  const emptyConnection = {
    edges: [],
    pageInfo: { hasNextPage: false, endCursor: null },
  };

  it("returns edges and pageInfo on success", async () => {
    const mockBlockedUsers = {
      edges: [
        {
          cursor: "c1",
          node: {
            id: "u2",
            displayName: "Bob Jones",
            username: "bob",
          },
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: "c1" },
    };
    mockQuerySuccess({ blockedUsers: mockBlockedUsers });

    const result = await loadBlockedUsers(10);

    expect(result).toEqual(mockBlockedUsers);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("passes pagination cursor when after is provided", async () => {
    mockQuerySuccess({ blockedUsers: emptyConnection });

    await loadBlockedUsers(10, "cursor456");

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const blockedUsersArgs = (
      callArg.blockedUsers as { __args: Record<string, unknown> }
    ).__args;
    expect(blockedUsersArgs).toHaveProperty("after", "cursor456");
    expect(blockedUsersArgs).toHaveProperty("first", 10);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("omits after from args when not provided", async () => {
    mockQuerySuccess({ blockedUsers: emptyConnection });

    await loadBlockedUsers(10);

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const blockedUsersArgs = (
      callArg.blockedUsers as { __args: Record<string, unknown> }
    ).__args;
    expect(blockedUsersArgs).not.toHaveProperty("after");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns null on top-level graphql errors", async () => {
    mockAuthQuery.mockResolvedValueOnce({
      data: {},
      errors: [{ message: "Unauthorized" }],
    });

    const result = await loadBlockedUsers(10);

    expect(result).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns null on network error", async () => {
    mockQueryNetworkError();

    const result = await loadBlockedUsers(10);

    expect(result).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// loadUserPreferences
// ---------------------------------------------------------------------------

describe("loadUserPreferences", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns preferences on success", async () => {
    mockQuerySuccess({ me: { preferences: mockPreferences } });

    const result = await loadUserPreferences();

    expect(result).toEqual(mockPreferences);
  });

  it("returns null on GraphQL errors", async () => {
    mockAuthQuery.mockResolvedValueOnce({
      data: {},
      errors: [{ message: "Unauthorized" }],
    });

    const result = await loadUserPreferences();

    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    mockAuthQuery.mockRejectedValueOnce(new Error("Network failure"));

    const result = await loadUserPreferences();

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updatePreferences
// ---------------------------------------------------------------------------

describe("updatePreferences", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated session
    mockGetSession.mockResolvedValue({ user: { id: "user-1" } });
  });

  it("returns unauthenticated error when no session", async () => {
    mockGetSession.mockResolvedValue(null);

    const result = await updatePreferences({ notificationsEnabled: false });

    expect(result.success).toBe(false);
    expect(result.errorType).toBe(MutationErrorType.UNEXPECTED_ERROR);
    expect(result.message).toBe("Not authenticated");
    expect(mockAuthMutate).not.toHaveBeenCalled();
  });

  it("returns success with preferences on successful mutation", async () => {
    mockUpdatePreferencesSuccess();

    const result = await updatePreferences({ notificationsEnabled: true });

    expect(result.success).toBe(true);
    expect(result.preferences).toEqual(mockPreferences);
  });

  it("returns GraphQL error on mutation errors", async () => {
    mockAuthMutate.mockResolvedValueOnce({
      data: {},
      errors: [{ message: "Permission denied" }],
    });

    const result = await updatePreferences({ notificationsEnabled: true });

    expect(result.success).toBe(false);
    expect(result.errorType).toBe(MutationErrorType.GRAPHQL_ERROR);
    expect(result.message).toBe("Permission denied");
  });

  it("surfaces error type from non-matching typename", async () => {
    mockMutateSuccess({
      updateUserPreferences: {
        __typename: "SomeErrorType",
        message: "Not allowed",
      },
    });

    const result = await updatePreferences({ notificationsEnabled: true });

    expect(result.success).toBe(false);
    expect(result.errorType).toBe("SomeErrorType");
    expect(result.message).toBe("Not allowed");
  });

  it("returns unexpected error on thrown exception", async () => {
    mockAuthMutate.mockRejectedValueOnce(new Error("Network failure"));

    const result = await updatePreferences({ notificationsEnabled: true });

    expect(result.success).toBe(false);
    expect(result.errorType).toBe(MutationErrorType.UNEXPECTED_ERROR);
    expect(result.message).toBe("Failed to update preferences");
  });

  it("only sends changed fields in the gqlInput", async () => {
    mockUpdatePreferencesSuccess();

    await updatePreferences({ notificationsEnabled: false });

    const input = getLastMutateInput();
    expect(Object.keys(input)).toEqual(["notificationsEnabled"]);
    expect(input.notificationsEnabled).toBe(false);
  });

  it("omits undefined fields from gqlInput", async () => {
    mockUpdatePreferencesSuccess();

    await updatePreferences({
      notificationsEnabled: true,
      measurementUnit: "IMPERIAL",
    });

    const input = getLastMutateInput();
    expect(Object.keys(input)).toHaveLength(2);
    expect(input).toHaveProperty("notificationsEnabled", true);
    expect(input).toHaveProperty("measurementUnit");
  });
});
