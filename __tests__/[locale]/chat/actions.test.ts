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
  loadChatRooms,
  loadChatRoom,
  loadMessages,
  loadMutualFollows,
  findDirectMessageRoom,
  createDirectMessage,
  createGroupChat,
  sendMessage,
  sendMediaMessage,
  updateMessage,
  deleteMessage,
  addMember,
  updateMemberRole,
  leaveChat,
  removeMember,
} from "@/app/[locale]/chat/actions";

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
// loadChatRooms
// ---------------------------------------------------------------------------

describe("loadChatRooms", () => {
  beforeEach(() => vi.clearAllMocks());

  const emptyConnection = {
    edges: [],
    pageInfo: { hasNextPage: false, endCursor: null },
  };

  it("returns chat rooms connection on success", async () => {
    const mockRooms = {
      edges: [{ cursor: "c1", node: { id: "r1", __typename: "DirectMessageChatRoom" } }],
      pageInfo: { hasNextPage: false, endCursor: "c1" },
    };
    mockQuerySuccess({ chatRooms: mockRooms });

    const result = await loadChatRooms(10);

    expect(result).toEqual(mockRooms);
  });

  it("passes after cursor when provided", async () => {
    mockQuerySuccess({ chatRooms: emptyConnection });

    await loadChatRooms(10, "cursor123");

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const chatRoomsArgs = (
      callArg.chatRooms as { __args: Record<string, unknown> }
    ).__args;
    expect(chatRoomsArgs).toHaveProperty("after", "cursor123");
  });

  it("omits after from args when not provided", async () => {
    mockQuerySuccess({ chatRooms: emptyConnection });

    await loadChatRooms(10);

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const chatRoomsArgs = (
      callArg.chatRooms as { __args: Record<string, unknown> }
    ).__args;
    expect(chatRoomsArgs).not.toHaveProperty("after");
  });

  it("returns null on GraphQL errors", async () => {
    mockQueryGraphqlError("Unauthorized");

    const result = await loadChatRooms(10);

    expect(result).toBeNull();
  });

  it("returns null on network failure", async () => {
    mockQueryNetworkError();

    const result = await loadChatRooms(10);

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// loadChatRoom
// ---------------------------------------------------------------------------

describe("loadChatRoom", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns chat room on success", async () => {
    const mockRoom = {
      id: "room1",
      __typename: "GroupChatRoom",
      createdDate: "2025-01-01",
      members: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } },
    };
    mockQuerySuccess({ chatRoom: mockRoom });

    const result = await loadChatRoom("room1");

    expect(result).toEqual(mockRoom);
  });

  it("returns null on GraphQL errors", async () => {
    mockQueryGraphqlError("Not found");

    const result = await loadChatRoom("room1");

    expect(result).toBeNull();
  });

  it("returns null on network failure", async () => {
    mockQueryNetworkError();

    const result = await loadChatRoom("room1");

    expect(result).toBeNull();
  });

  it("returns null when chatRoom data is null", async () => {
    mockQuerySuccess({ chatRoom: null });

    const result = await loadChatRoom("room1");

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// loadMessages
// ---------------------------------------------------------------------------

describe("loadMessages", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockMessages = {
    edges: [{ cursor: "c1", node: { id: "m1", __typename: "TextChatMessage" } }],
    pageInfo: { hasPreviousPage: false, startCursor: "c1" },
  };

  it("returns messages on success", async () => {
    mockQuerySuccess({ chatRoom: { chatMessages: mockMessages } });

    const result = await loadMessages("room1", 20);

    expect(result).toEqual(mockMessages);
  });

  it("passes before cursor when provided", async () => {
    mockQuerySuccess({ chatRoom: { chatMessages: mockMessages } });

    await loadMessages("room1", 20, "beforeCursor");

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const chatMessagesArgs = (
      (callArg.chatRoom as { chatMessages: { __args: Record<string, unknown> } })
        .chatMessages.__args
    );
    expect(chatMessagesArgs).toHaveProperty("before", "beforeCursor");
  });

  it("omits before from args when not provided", async () => {
    mockQuerySuccess({ chatRoom: { chatMessages: mockMessages } });

    await loadMessages("room1", 20);

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const chatMessagesArgs = (
      (callArg.chatRoom as { chatMessages: { __args: Record<string, unknown> } })
        .chatMessages.__args
    );
    expect(chatMessagesArgs).not.toHaveProperty("before");
  });

  it("returns null on GraphQL errors", async () => {
    mockQueryGraphqlError("Unauthorized");

    const result = await loadMessages("room1", 20);

    expect(result).toBeNull();
  });

  it("returns null on network failure", async () => {
    mockQueryNetworkError();

    const result = await loadMessages("room1", 20);

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// loadMutualFollows
// ---------------------------------------------------------------------------

describe("loadMutualFollows", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns mutual follows on success", async () => {
    const mockMutualFollows = {
      edges: [
        {
          cursor: "c1",
          node: {
            id: 1,
            displayName: "Alice",
            username: "alice",
            profilePicture: null,
          },
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: "c1" },
    };
    mockQuerySuccess({ mutualFollows: mockMutualFollows });

    const result = await loadMutualFollows(10);

    expect(result).toEqual(mockMutualFollows);
  });

  it("passes after cursor when provided", async () => {
    mockQuerySuccess({ mutualFollows: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } });

    await loadMutualFollows(10, "cursor456");

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const mutualFollowsArgs = (
      callArg.mutualFollows as { __args: Record<string, unknown> }
    ).__args;
    expect(mutualFollowsArgs).toHaveProperty("after", "cursor456");
  });

  it("omits after from args when not provided", async () => {
    mockQuerySuccess({ mutualFollows: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } });

    await loadMutualFollows(10);

    const callArg = mockAuthQuery.mock.calls[0][0] as Record<string, unknown>;
    const mutualFollowsArgs = (
      callArg.mutualFollows as { __args: Record<string, unknown> }
    ).__args;
    expect(mutualFollowsArgs).not.toHaveProperty("after");
  });

  it("returns null on GraphQL errors", async () => {
    mockQueryGraphqlError("Unauthorized");

    const result = await loadMutualFollows(10);

    expect(result).toBeNull();
  });

  it("returns null on network failure", async () => {
    mockQueryNetworkError();

    const result = await loadMutualFollows(10);

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// findDirectMessageRoom
// ---------------------------------------------------------------------------

describe("findDirectMessageRoom", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns chat room on success", async () => {
    const mockRoom = {
      id: "dm1",
      __typename: "DirectMessageChatRoom",
      createdDate: "2025-01-01",
    };
    mockQuerySuccess({ directMessageChatRoom: mockRoom });

    const result = await findDirectMessageRoom(1);

    expect(result).toEqual(mockRoom);
  });

  it("returns null on GraphQL errors", async () => {
    mockQueryGraphqlError("Not found");

    const result = await findDirectMessageRoom(1);

    expect(result).toBeNull();
  });

  it("returns null when no room exists", async () => {
    mockQuerySuccess({ directMessageChatRoom: null });

    const result = await findDirectMessageRoom(1);

    expect(result).toBeNull();
  });

  it("returns null on network failure", async () => {
    mockQueryNetworkError();

    const result = await findDirectMessageRoom(1);

    expect(result).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// createDirectMessage
// ---------------------------------------------------------------------------

describe("createDirectMessage", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockChatRoom = {
    id: "dm1",
    __typename: "DirectMessageChatRoom",
    createdDate: "2025-01-01",
  };

  it("returns success with chatRoom on creation", async () => {
    mockMutateSuccess("createDirectMessage", "CreateDirectMessageResponse", {
      chatRoom: mockChatRoom,
    });

    const result = await createDirectMessage(1);

    expect(result).toEqual({ success: true, chatRoom: mockChatRoom });
    expect(mockAuthMutate).toHaveBeenCalledOnce();
  });

  it("returns VALIDATION_ERROR when userId is not positive without calling authMutate", async () => {
    const result = await createDirectMessage(0);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.VALIDATION_ERROR,
      message: expect.any(String),
    });
    expect(mockAuthMutate).not.toHaveBeenCalled();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const result = await createDirectMessage(1);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
    });
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("createDirectMessage", "UserNotFoundError", "User not found");

    const result = await createDirectMessage(1);

    expect(result).toEqual({
      success: false,
      errorType: "UserNotFoundError",
      message: "User not found",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await createDirectMessage(1);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to create direct message",
    });
  });
});

// ---------------------------------------------------------------------------
// createGroupChat
// ---------------------------------------------------------------------------

describe("createGroupChat", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockChatRoom = {
    id: "group1",
    __typename: "GroupChatRoom",
    createdDate: "2025-01-01",
  };

  it("returns success with chatRoom on creation", async () => {
    mockMutateSuccess("createGroupChat", "CreateGroupChatResponse", {
      chatRoom: mockChatRoom,
    });

    const result = await createGroupChat("My Group", [1, 2]);

    expect(result).toEqual({ success: true, chatRoom: mockChatRoom });
    expect(mockAuthMutate).toHaveBeenCalledOnce();
  });

  it("returns VALIDATION_ERROR when name is empty without calling authMutate", async () => {
    const result = await createGroupChat("", [1]);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.VALIDATION_ERROR,
      message: expect.any(String),
    });
    expect(mockAuthMutate).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR when userIds array is empty without calling authMutate", async () => {
    const result = await createGroupChat("My Group", []);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.VALIDATION_ERROR,
      message: expect.any(String),
    });
    expect(mockAuthMutate).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR when name exceeds 100 chars without calling authMutate", async () => {
    const longName = "a".repeat(101);
    const result = await createGroupChat(longName, [1]);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.VALIDATION_ERROR,
      message: expect.any(String),
    });
    expect(mockAuthMutate).not.toHaveBeenCalled();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const result = await createGroupChat("My Group", [1]);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
    });
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("createGroupChat", "ChatRoomCreationError", "Cannot create chat");

    const result = await createGroupChat("My Group", [1]);

    expect(result).toEqual({
      success: false,
      errorType: "ChatRoomCreationError",
      message: "Cannot create chat",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await createGroupChat("My Group", [1]);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to create group chat",
    });
  });
});

// ---------------------------------------------------------------------------
// sendMessage
// ---------------------------------------------------------------------------

describe("sendMessage", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockChatMessage = {
    id: "msg1",
    __typename: "TextChatMessage",
    content: "Hello",
  };

  it("returns success with chatMessage on send", async () => {
    mockMutateSuccess("sendChatMessage", "SendChatMessageResponse", {
      chatMessage: mockChatMessage,
    });

    const result = await sendMessage("room1", "Hello");

    expect(result).toEqual({ success: true, chatMessage: mockChatMessage });
    expect(mockAuthMutate).toHaveBeenCalledOnce();
  });

  it("returns success with replyToId when provided", async () => {
    mockMutateSuccess("sendChatMessage", "SendChatMessageResponse", {
      chatMessage: mockChatMessage,
    });

    await sendMessage("room1", "Hello", "replyMsg1");

    const callArg = mockAuthMutate.mock.calls[0][0] as Record<string, unknown>;
    const sendArgs = (
      callArg.sendChatMessage as { __args: { input: { textMessage: Record<string, unknown> } } }
    ).__args.input.textMessage;
    expect(sendArgs).toHaveProperty("replyToId", "replyMsg1");
  });

  it("omits replyToId when not provided", async () => {
    mockMutateSuccess("sendChatMessage", "SendChatMessageResponse", {
      chatMessage: mockChatMessage,
    });

    await sendMessage("room1", "Hello");

    const callArg = mockAuthMutate.mock.calls[0][0] as Record<string, unknown>;
    const sendArgs = (
      callArg.sendChatMessage as { __args: { input: { textMessage: Record<string, unknown> } } }
    ).__args.input.textMessage;
    expect(sendArgs).not.toHaveProperty("replyToId");
  });

  it("returns VALIDATION_ERROR when chatRoomId is empty without calling authMutate", async () => {
    const result = await sendMessage("", "Hello");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.VALIDATION_ERROR,
      message: expect.any(String),
    });
    expect(mockAuthMutate).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR when content is empty without calling authMutate", async () => {
    const result = await sendMessage("room1", "");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.VALIDATION_ERROR,
      message: expect.any(String),
    });
    expect(mockAuthMutate).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR when content exceeds 5000 chars without calling authMutate", async () => {
    const longContent = "a".repeat(5001);
    const result = await sendMessage("room1", longContent);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.VALIDATION_ERROR,
      message: expect.any(String),
    });
    expect(mockAuthMutate).not.toHaveBeenCalled();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Room not found");

    const result = await sendMessage("room1", "Hello");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Room not found",
    });
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("sendChatMessage", "ChatRoomNotFoundError", "Chat room does not exist");

    const result = await sendMessage("room1", "Hello");

    expect(result).toEqual({
      success: false,
      errorType: "ChatRoomNotFoundError",
      message: "Chat room does not exist",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await sendMessage("room1", "Hello");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to send message",
    });
  });
});

// ---------------------------------------------------------------------------
// sendMediaMessage
// ---------------------------------------------------------------------------

describe("sendMediaMessage", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockChatMessage = {
    id: "msg2",
    __typename: "MediaChatMessage",
  };

  it("returns success with chatMessage on send", async () => {
    mockMutateSuccess("sendChatMessage", "SendChatMessageResponse", {
      chatMessage: mockChatMessage,
    });

    const result = await sendMediaMessage("room1", "resource1");

    expect(result).toEqual({ success: true, chatMessage: mockChatMessage });
    expect(mockAuthMutate).toHaveBeenCalledOnce();
  });

  it("sends mediaMessage input with chatRoomId and resourceId", async () => {
    mockMutateSuccess("sendChatMessage", "SendChatMessageResponse", {
      chatMessage: mockChatMessage,
    });

    await sendMediaMessage("room1", "resource1");

    const callArg = mockAuthMutate.mock.calls[0][0] as Record<string, unknown>;
    const mediaArgs = (
      callArg.sendChatMessage as { __args: { input: { mediaMessage: Record<string, unknown> } } }
    ).__args.input.mediaMessage;
    expect(mediaArgs).toEqual({ chatRoomId: "room1", resourceId: "resource1" });
  });

  it("includes caption and replyToId when provided", async () => {
    mockMutateSuccess("sendChatMessage", "SendChatMessageResponse", {
      chatMessage: mockChatMessage,
    });

    await sendMediaMessage("room1", "resource1", "A caption", "replyMsg1");

    const callArg = mockAuthMutate.mock.calls[0][0] as Record<string, unknown>;
    const mediaArgs = (
      callArg.sendChatMessage as { __args: { input: { mediaMessage: Record<string, unknown> } } }
    ).__args.input.mediaMessage;
    expect(mediaArgs).toEqual({
      chatRoomId: "room1",
      resourceId: "resource1",
      caption: "A caption",
      replyToId: "replyMsg1",
    });
  });

  it("omits caption and replyToId when not provided", async () => {
    mockMutateSuccess("sendChatMessage", "SendChatMessageResponse", {
      chatMessage: mockChatMessage,
    });

    await sendMediaMessage("room1", "resource1");

    const callArg = mockAuthMutate.mock.calls[0][0] as Record<string, unknown>;
    const mediaArgs = (
      callArg.sendChatMessage as { __args: { input: { mediaMessage: Record<string, unknown> } } }
    ).__args.input.mediaMessage;
    expect(mediaArgs).not.toHaveProperty("caption");
    expect(mediaArgs).not.toHaveProperty("replyToId");
  });

  it("returns VALIDATION_ERROR when caption exceeds 5000 chars without calling authMutate", async () => {
    const longCaption = "a".repeat(5001);
    const result = await sendMediaMessage("room1", "resource1", longCaption);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.VALIDATION_ERROR,
      message: expect.any(String),
    });
    expect(mockAuthMutate).not.toHaveBeenCalled();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const result = await sendMediaMessage("room1", "resource1");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
    });
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("sendChatMessage", "ResourceNotFoundError", "Resource not found");

    const result = await sendMediaMessage("room1", "resource1");

    expect(result).toEqual({
      success: false,
      errorType: "ResourceNotFoundError",
      message: "Resource not found",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await sendMediaMessage("room1", "resource1");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to send message",
    });
  });
});

// ---------------------------------------------------------------------------
// updateMessage
// ---------------------------------------------------------------------------

describe("updateMessage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success on update", async () => {
    mockMutateSuccess("updateChatMessage", "UpdateChatMessageResponse", {
      chatMessage: { id: "msg1", content: "Updated", updatedDate: "2025-01-01" },
    });

    const result = await updateMessage("msg1", "Updated");

    expect(result).toEqual({ success: true });
    expect(mockAuthMutate).toHaveBeenCalledOnce();
  });

  it("returns VALIDATION_ERROR when id is empty without calling authMutate", async () => {
    const result = await updateMessage("", "Updated");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.VALIDATION_ERROR,
      message: expect.any(String),
    });
    expect(mockAuthMutate).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR when content is empty without calling authMutate", async () => {
    const result = await updateMessage("msg1", "");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.VALIDATION_ERROR,
      message: expect.any(String),
    });
    expect(mockAuthMutate).not.toHaveBeenCalled();
  });

  it("returns VALIDATION_ERROR when content exceeds 5000 chars without calling authMutate", async () => {
    const longContent = "a".repeat(5001);
    const result = await updateMessage("msg1", longContent);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.VALIDATION_ERROR,
      message: expect.any(String),
    });
    expect(mockAuthMutate).not.toHaveBeenCalled();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Message not found");

    const result = await updateMessage("msg1", "Updated");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Message not found",
    });
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("updateChatMessage", "MessageNotFoundError", "Message does not exist");

    const result = await updateMessage("msg1", "Updated");

    expect(result).toEqual({
      success: false,
      errorType: "MessageNotFoundError",
      message: "Message does not exist",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await updateMessage("msg1", "Updated");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to update message",
    });
  });
});

// ---------------------------------------------------------------------------
// deleteMessage
// ---------------------------------------------------------------------------

describe("deleteMessage", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success on deletion", async () => {
    mockMutateSuccess("deleteChatMessage", "DeleteChatMessageResponse", { id: "msg1" });

    const result = await deleteMessage("msg1");

    expect(result).toEqual({ success: true });
    expect(mockAuthMutate).toHaveBeenCalledOnce();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Forbidden");

    const result = await deleteMessage("msg1");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Forbidden",
    });
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("deleteChatMessage", "MessageNotFoundError", "Message not found");

    const result = await deleteMessage("msg1");

    expect(result).toEqual({
      success: false,
      errorType: "MessageNotFoundError",
      message: "Message not found",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await deleteMessage("msg1");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to delete message",
    });
  });
});

// ---------------------------------------------------------------------------
// addMember
// ---------------------------------------------------------------------------

describe("addMember", () => {
  beforeEach(() => vi.clearAllMocks());

  const mockMember = {
    id: "m1",
    user: { id: 1, username: "alice" },
    role: "MEMBER",
    joinedDate: "2025-01-01",
  };

  it("returns success with member on add", async () => {
    mockMutateSuccess("addChatRoomMember", "AddChatRoomMemberResponse", {
      member: mockMember,
    });

    const result = await addMember("room1", 1);

    expect(result).toEqual({ success: true, member: mockMember });
    expect(mockAuthMutate).toHaveBeenCalledOnce();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Not authorized");

    const result = await addMember("room1", 1);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Not authorized",
    });
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("addChatRoomMember", "UserAlreadyMemberError", "User is already a member");

    const result = await addMember("room1", 1);

    expect(result).toEqual({
      success: false,
      errorType: "UserAlreadyMemberError",
      message: "User is already a member",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await addMember("room1", 1);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to add member",
    });
  });
});

// ---------------------------------------------------------------------------
// updateMemberRole
// ---------------------------------------------------------------------------

describe("updateMemberRole", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success on role update", async () => {
    mockMutateSuccess("updateChatRoomMemberRole", "UpdateChatRoomMemberRoleResponse", {
      member: { id: "m1", role: "ADMIN" },
    });

    const result = await updateMemberRole("room1", 1, "ADMIN");

    expect(result).toEqual({ success: true });
    expect(mockAuthMutate).toHaveBeenCalledOnce();
  });

  it("sends role as EnumType in mutation input", async () => {
    mockMutateSuccess("updateChatRoomMemberRole", "UpdateChatRoomMemberRoleResponse", {
      member: { id: "m1", role: "ADMIN" },
    });

    await updateMemberRole("room1", 1, "ADMIN");

    const callArg = mockAuthMutate.mock.calls[0][0] as Record<string, unknown>;
    const roleInput = (
      callArg.updateChatRoomMemberRole as { __args: { input: Record<string, unknown> } }
    ).__args.input.role;
    // Role should be an EnumType object, not a plain string
    expect(typeof roleInput).toBe("object");
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Unauthorized");

    const result = await updateMemberRole("room1", 1, "ADMIN");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Unauthorized",
    });
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("updateChatRoomMemberRole", "MemberNotFoundError", "Member not found");

    const result = await updateMemberRole("room1", 1, "ADMIN");

    expect(result).toEqual({
      success: false,
      errorType: "MemberNotFoundError",
      message: "Member not found",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await updateMemberRole("room1", 1, "ADMIN");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to update role",
    });
  });
});

// ---------------------------------------------------------------------------
// leaveChat
// ---------------------------------------------------------------------------

describe("leaveChat", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success on leaving chat", async () => {
    mockMutateSuccess("leaveChatRoom", "LeaveChatRoomResponse", { chatRoomId: "room1" });

    const result = await leaveChat("room1");

    expect(result).toEqual({ success: true });
    expect(mockAuthMutate).toHaveBeenCalledOnce();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Not a member");

    const result = await leaveChat("room1");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Not a member",
    });
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("leaveChatRoom", "ChatRoomNotFoundError", "Chat room not found");

    const result = await leaveChat("room1");

    expect(result).toEqual({
      success: false,
      errorType: "ChatRoomNotFoundError",
      message: "Chat room not found",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await leaveChat("room1");

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to leave chat",
    });
  });
});

// ---------------------------------------------------------------------------
// removeMember
// ---------------------------------------------------------------------------

describe("removeMember", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns success on member removal", async () => {
    mockMutateSuccess("removeChatRoomMember", "RemoveChatRoomMemberResponse", {
      chatRoomId: "room1",
      userId: 1,
    });

    const result = await removeMember("room1", 1);

    expect(result).toEqual({ success: true });
    expect(mockAuthMutate).toHaveBeenCalledOnce();
  });

  it("returns GRAPHQL_ERROR on top-level errors", async () => {
    mockMutateGraphqlError("Forbidden");

    const result = await removeMember("room1", 1);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.GRAPHQL_ERROR,
      message: "Forbidden",
    });
  });

  it("returns union error type on mutation error", async () => {
    mockMutateUnionError("removeChatRoomMember", "MemberNotFoundError", "Member not found");

    const result = await removeMember("room1", 1);

    expect(result).toEqual({
      success: false,
      errorType: "MemberNotFoundError",
      message: "Member not found",
    });
  });

  it("returns UNEXPECTED_ERROR on network failure", async () => {
    mockMutateNetworkError();

    const result = await removeMember("room1", 1);

    expect(result).toEqual({
      success: false,
      errorType: MutationErrorType.UNEXPECTED_ERROR,
      message: "Failed to remove member",
    });
  });
});
