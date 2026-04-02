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

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

import { revalidatePath } from "next/cache";
import {
  followUser,
  unfollowUser,
  removeFollower,
  blockUser,
  unblockUser,
  loadFollowers,
  loadFollowing,
  updateUser,
  updatePlayer,
} from "@/app/[locale]/user/[username]/actions";

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

function mockMutateNetworkError() {
  mockAuthMutate.mockRejectedValueOnce(new Error("Network failure"));
}

function getMutationInput(key: string): Record<string, unknown> {
  const callArg = mockAuthMutate.mock.calls[0][0] as Record<string, unknown>;
  return (callArg[key] as { __args: { input: Record<string, unknown> } }).__args.input;
}

// ---------------------------------------------------------------------------
// Shared test data
// ---------------------------------------------------------------------------

const mockUserFollowData = {
  id: "u2",
  viewerFollowsUser: true,
  userFollowsViewer: false,
  followerCount: 42,
  followingCount: 10,
};

// ---------------------------------------------------------------------------
// followUser
// ---------------------------------------------------------------------------

describe("followUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success with user data on success", async () => {
    mockMutateSuccess("followUser", "FollowUserResponse", {
      user: mockUserFollowData,
    });

    const result = await followUser("u2");

    expect(result).toEqual({ success: true, type: "followed", user: mockUserFollowData });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("passes userId in mutation input", async () => {
    mockMutateSuccess("followUser", "FollowUserResponse", {
      user: mockUserFollowData,
    });

    await followUser("user-123");

    const mutInput = getMutationInput("followUser");
    expect(mutInput).toEqual({ userId: "user-123" });
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const result = await followUser("u2");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
    });
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("followUser", "CannotFollowSelfError", "Cannot follow yourself");

    const result = await followUser("u2");

    expect(result).toEqual({
      success: false,
      errorType: "CannotFollowSelfError",
      message: "Cannot follow yourself",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await followUser("u2");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to follow user",
    });
  });
});

// ---------------------------------------------------------------------------
// unfollowUser
// ---------------------------------------------------------------------------

describe("unfollowUser", () => {
  beforeEach(() => vi.clearAllMocks());

  const unfollowUserData = {
    ...mockUserFollowData,
    viewerFollowsUser: false,
    followerCount: 41,
  };

  it("returns success with user data and wasMutualFollow on success", async () => {
    mockMutateSuccess("unfollowUser", "UnfollowUserResponse", {
      user: unfollowUserData,
      wasMutualFollow: true,
    });

    const result = await unfollowUser("u2");

    expect(result).toEqual({ success: true, user: unfollowUserData, wasMutualFollow: true });
  });

  it("passes userId in mutation input", async () => {
    mockMutateSuccess("unfollowUser", "UnfollowUserResponse", {
      user: unfollowUserData,
      wasMutualFollow: false,
    });

    await unfollowUser("user-456");

    const mutInput = getMutationInput("unfollowUser");
    expect(mutInput).toEqual({ userId: "user-456" });
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Not following");

    const result = await unfollowUser("u2");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Not following",
    });
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("unfollowUser", "NotFollowingError", "You are not following this user");

    const result = await unfollowUser("u2");

    expect(result).toEqual({
      success: false,
      errorType: "NotFollowingError",
      message: "You are not following this user",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await unfollowUser("u2");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to unfollow user",
    });
  });
});

// ---------------------------------------------------------------------------
// removeFollower
// ---------------------------------------------------------------------------

describe("removeFollower", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success with userId on success", async () => {
    mockMutateSuccess("removeFollower", "RemoveFollowerResponse", {
      userId: "u3",
    });

    const result = await removeFollower("u3");

    expect(result).toEqual({ success: true, userId: "u3" });
  });

  it("passes userId in mutation input", async () => {
    mockMutateSuccess("removeFollower", "RemoveFollowerResponse", {
      userId: "user-789",
    });

    await removeFollower("user-789");

    const mutInput = getMutationInput("removeFollower");
    expect(mutInput).toEqual({ userId: "user-789" });
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("User not found");

    const result = await removeFollower("u3");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "User not found",
    });
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("removeFollower", "NotFollowerError", "User is not a follower");

    const result = await removeFollower("u3");

    expect(result).toEqual({
      success: false,
      errorType: "NotFollowerError",
      message: "User is not a follower",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await removeFollower("u3");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to remove follower",
    });
  });
});

// ---------------------------------------------------------------------------
// blockUser
// ---------------------------------------------------------------------------

describe("blockUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success with userId on success", async () => {
    mockMutateSuccess("blockUser", "BlockUserResponse", {
      userId: "u2",
    });

    const result = await blockUser("u2");

    expect(result).toEqual({ success: true, userId: "u2" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("passes userId in mutation input", async () => {
    mockMutateSuccess("blockUser", "BlockUserResponse", {
      userId: "target-789",
    });

    await blockUser("target-789");

    const mutInput = getMutationInput("blockUser");
    expect(mutInput).toEqual({ userId: "target-789" });
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("User not found");

    const result = await blockUser("u2");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "User not found",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("blockUser", "CannotBlockSelfError", "Cannot block yourself");

    const result = await blockUser("u2");

    expect(result).toEqual({
      success: false,
      errorType: "CannotBlockSelfError",
      message: "Cannot block yourself",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await blockUser("u2");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to block user",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// unblockUser
// ---------------------------------------------------------------------------

describe("unblockUser", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success with userId on success", async () => {
    mockMutateSuccess("unblockUser", "UnblockUserResponse", {
      userId: "u2",
    });

    const result = await unblockUser("u2");

    expect(result).toEqual({ success: true, userId: "u2" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("passes userId in mutation input", async () => {
    mockMutateSuccess("unblockUser", "UnblockUserResponse", {
      userId: "unblock-999",
    });

    await unblockUser("unblock-999");

    const mutInput = getMutationInput("unblockUser");
    expect(mutInput).toEqual({ userId: "unblock-999" });
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("User not found");

    const result = await unblockUser("u2");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "User not found",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("unblockUser", "UserNotBlockedError", "User is not blocked");

    const result = await unblockUser("u2");

    expect(result).toEqual({
      success: false,
      errorType: "UserNotBlockedError",
      message: "User is not blocked",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await unblockUser("u2");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to unblock user",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// loadFollowers
// ---------------------------------------------------------------------------

describe("loadFollowers", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockPageInfo = { hasNextPage: false, endCursor: null };
  const mockEdge = {
    cursor: "cursor-1",
    node: {
      id: "fr-1",
      follower: { id: "u-follower", username: "followeruser", displayName: "Follower" },
      following: { id: "u-target" },
      createdDate: "2024-01-01T00:00:00Z",
    },
  };

  it("returns edges and pageInfo on success", async () => {
    mockAuthQuery.mockResolvedValueOnce({
      data: { followers: { edges: [mockEdge], pageInfo: mockPageInfo } },
    });

    const result = await loadFollowers("u-target", 10);

    expect(result).toEqual({ edges: [mockEdge], pageInfo: mockPageInfo });
  });

  it("passes after cursor when provided", async () => {
    mockAuthQuery.mockResolvedValueOnce({
      data: { followers: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } },
    });

    await loadFollowers("u-target", 10, "some-cursor");

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const args = (callArg.followers as { __args: Record<string, unknown> }).__args;
    expect(args).toHaveProperty("after", "some-cursor");
  });

  it("omits after cursor when not provided", async () => {
    mockAuthQuery.mockResolvedValueOnce({
      data: { followers: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } },
    });

    await loadFollowers("u-target", 10);

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const args = (callArg.followers as { __args: Record<string, unknown> }).__args;
    expect(args).not.toHaveProperty("after");
  });

  it("returns null on GraphQL error", async () => {
    mockAuthQuery.mockResolvedValueOnce({
      data: {},
      errors: [{ message: "Unauthorized" }],
    });

    const result = await loadFollowers("u-target", 10);

    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    mockAuthQuery.mockRejectedValueOnce(new Error("Network failure"));

    const result = await loadFollowers("u-target", 10);

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// loadFollowing
// ---------------------------------------------------------------------------

describe("loadFollowing", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockPageInfo = { hasNextPage: true, endCursor: "cursor-end" };
  const mockEdge = {
    cursor: "cursor-2",
    node: {
      id: "fr-2",
      follower: { id: "u-source" },
      following: { id: "u-followee", username: "followeeuser", displayName: "Followee" },
      createdDate: "2024-02-01T00:00:00Z",
    },
  };

  it("returns edges and pageInfo on success", async () => {
    mockAuthQuery.mockResolvedValueOnce({
      data: { following: { edges: [mockEdge], pageInfo: mockPageInfo } },
    });

    const result = await loadFollowing("u-source", 10);

    expect(result).toEqual({ edges: [mockEdge], pageInfo: mockPageInfo });
  });

  it("passes after cursor when provided", async () => {
    mockAuthQuery.mockResolvedValueOnce({
      data: { following: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } },
    });

    await loadFollowing("u-source", 10, "page-cursor");

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const args = (callArg.following as { __args: Record<string, unknown> }).__args;
    expect(args).toHaveProperty("after", "page-cursor");
  });

  it("omits after cursor when not provided", async () => {
    mockAuthQuery.mockResolvedValueOnce({
      data: { following: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } },
    });

    await loadFollowing("u-source", 10);

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const args = (callArg.following as { __args: Record<string, unknown> }).__args;
    expect(args).not.toHaveProperty("after");
  });

  it("returns null on GraphQL error", async () => {
    mockAuthQuery.mockResolvedValueOnce({
      data: {},
      errors: [{ message: "Forbidden" }],
    });

    const result = await loadFollowing("u-source", 10);

    expect(result).toBeNull();
  });

  it("returns null on network error", async () => {
    mockAuthQuery.mockRejectedValueOnce(new Error("Network failure"));

    const result = await loadFollowing("u-source", 10);

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// updateUser
// ---------------------------------------------------------------------------

describe("updateUser", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockUser = { id: "u1", displayName: "Alice", biography: "Hello" };

  it("returns success with user data on success", async () => {
    mockMutateSuccess("updateUser", "UpdateUserResponse", {
      user: mockUser,
    });

    const result = await updateUser({ displayName: "Alice" });

    expect(result).toEqual({ success: true, user: mockUser });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/user/[username]", "page");
  });

  it("sends only displayName when only displayName provided (PATCH semantics)", async () => {
    mockMutateSuccess("updateUser", "UpdateUserResponse", {
      user: mockUser,
    });

    await updateUser({ displayName: "New Name" });

    const mutInput = getMutationInput("updateUser");
    expect(mutInput).toEqual({ displayName: "New Name" });
    expect(mutInput).not.toHaveProperty("biography");
  });

  it("sends only biography when only biography provided (PATCH semantics)", async () => {
    mockMutateSuccess("updateUser", "UpdateUserResponse", {
      user: { ...mockUser, biography: "Updated bio" },
    });

    await updateUser({ biography: "Updated bio" });

    const mutInput = getMutationInput("updateUser");
    expect(mutInput).toEqual({ biography: "Updated bio" });
    expect(mutInput).not.toHaveProperty("displayName");
  });

  it("sends null biography to clear the value (PATCH semantics)", async () => {
    mockMutateSuccess("updateUser", "UpdateUserResponse", {
      user: { ...mockUser, biography: null },
    });

    await updateUser({ biography: null });

    const mutInput = getMutationInput("updateUser");
    expect(mutInput).toHaveProperty("biography", null);
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const result = await updateUser({ displayName: "Alice" });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("surfaces error type when response typename does not match", async () => {
    mockAuthMutate.mockResolvedValueOnce({
      data: { updateUser: { __typename: "UpdateUserError", message: "Not allowed" } },
    });

    const result = await updateUser({ displayName: "Alice" });

    expect(result).toEqual({
      success: false,
      errorType: "UpdateUserError",
      message: "Not allowed",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR when data.updateUser is null", async () => {
    mockAuthMutate.mockResolvedValueOnce({
      data: { updateUser: null },
    });

    const result = await updateUser({ displayName: "Alice" });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Unexpected response",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await updateUser({ displayName: "Alice" });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to update user",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// updatePlayer
// ---------------------------------------------------------------------------

describe("updatePlayer", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockPlayer = { id: 1, age: 25, height: 180, weight: 75 };

  it("returns success with player data on success", async () => {
    mockMutateSuccess("updatePlayer", "UpdatePlayerResponse", {
      player: mockPlayer,
    });

    const result = await updatePlayer({ age: 25, height: 180, weight: 75 });

    expect(result).toEqual({ success: true, player: mockPlayer });
    expect(revalidatePath).toHaveBeenCalledWith("/[locale]/user/[username]", "page");
  });

  it("only sends age when only age provided (PATCH semantics)", async () => {
    mockMutateSuccess("updatePlayer", "UpdatePlayerResponse", {
      player: { ...mockPlayer, age: 30 },
    });

    await updatePlayer({ age: 30 });

    const mutInput = getMutationInput("updatePlayer");
    expect(mutInput).toHaveProperty("age", 30);
    expect(mutInput).not.toHaveProperty("height");
    expect(mutInput).not.toHaveProperty("weight");
  });

  it("only sends height when only height provided (PATCH semantics)", async () => {
    mockMutateSuccess("updatePlayer", "UpdatePlayerResponse", {
      player: { ...mockPlayer, height: 185 },
    });

    await updatePlayer({ height: 185 });

    const mutInput = getMutationInput("updatePlayer");
    expect(mutInput).toHaveProperty("height", 185);
    expect(mutInput).not.toHaveProperty("age");
    expect(mutInput).not.toHaveProperty("weight");
  });

  it("only sends weight when only weight provided (PATCH semantics)", async () => {
    mockMutateSuccess("updatePlayer", "UpdatePlayerResponse", {
      player: { ...mockPlayer, weight: 80 },
    });

    await updatePlayer({ weight: 80 });

    const mutInput = getMutationInput("updatePlayer");
    expect(mutInput).toHaveProperty("weight", 80);
    expect(mutInput).not.toHaveProperty("age");
    expect(mutInput).not.toHaveProperty("height");
  });

  it("sends null age to clear the value (PATCH semantics)", async () => {
    mockMutateSuccess("updatePlayer", "UpdatePlayerResponse", {
      player: { ...mockPlayer, age: null },
    });

    await updatePlayer({ age: null });

    const mutInput = getMutationInput("updatePlayer");
    expect(mutInput).toHaveProperty("age", null);
    expect(mutInput).not.toHaveProperty("height");
    expect(mutInput).not.toHaveProperty("weight");
  });

  it("sends null height to clear the value (PATCH semantics)", async () => {
    mockMutateSuccess("updatePlayer", "UpdatePlayerResponse", {
      player: { ...mockPlayer, height: null },
    });

    await updatePlayer({ height: null });

    const mutInput = getMutationInput("updatePlayer");
    expect(mutInput).toHaveProperty("height", null);
  });

  it("sends null weight to clear the value (PATCH semantics)", async () => {
    mockMutateSuccess("updatePlayer", "UpdatePlayerResponse", {
      player: { ...mockPlayer, weight: null },
    });

    await updatePlayer({ weight: null });

    const mutInput = getMutationInput("updatePlayer");
    expect(mutInput).toHaveProperty("weight", null);
  });

  it("sends empty object when no fields provided", async () => {
    mockMutateSuccess("updatePlayer", "UpdatePlayerResponse", {
      player: mockPlayer,
    });

    await updatePlayer({});

    const mutInput = getMutationInput("updatePlayer");
    expect(mutInput).toEqual({});
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const result = await updatePlayer({ age: 25 });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("updatePlayer", "PlayerNotFoundError", "Player does not exist");

    const result = await updatePlayer({ age: 25 });

    expect(result).toEqual({
      success: false,
      errorType: "PlayerNotFoundError",
      message: "Player does not exist",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await updatePlayer({ age: 25 });

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to update player",
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
