"use server";

import type { Edge, PageInfo } from "@/lib/graphql-connection";
import {
  chatMessageNodeSelection,
  chatRoomInlineFragments,
  chatUserFragment,
  errorFragment,
} from "@/lib/graphql-fragments";
import { authMutate, authQuery } from "@/lib/graphql-request";
import { extractMutationResult, MutationErrorType } from "@/lib/graphql-result";
import type {
  ChatMessageNode,
  ChatRoomDetailNode,
  ChatRoomListNode,
  ChatRoomMemberNode,
  ChatRoomRole as ChatRoomRoleType,
} from "@/lib/types/chat";
import { z } from "zod";

const sendMessageSchema = z.object({
  chatRoomId: z.string().min(1),
  content: z.string().min(1).max(5000),
  replyToId: z.string().min(1).optional(),
});

const updateMessageSchema = z.object({
  id: z.string().min(1),
  content: z.string().min(1).max(5000),
});

const createDirectMessageSchema = z.object({
  userId: z.string().min(1),
});

const createGroupChatSchema = z.object({
  name: z.string().min(1).max(100),
  userIds: z.array(z.string().min(1)).min(1),
});

/** Reusable chat room list node selection */
const chatRoomListNodeSelection = {
  __typename: true,
  id: true,
  createdDate: true,
  __on: chatRoomInlineFragments,
  members: {
    __args: { first: 10 },
    edges: {
      node: {
        user: chatUserFragment,
      },
    },
  },
  chatMessages: {
    __args: { last: 1 },
    edges: {
      node: chatMessageNodeSelection,
    },
  },
};

/**
 * Load chat rooms with last message preview
 */
export async function loadChatRooms(
  first: number,
  after?: string,
): Promise<{ edges: Edge<ChatRoomListNode>[]; pageInfo: PageInfo } | null> {
  try {
    const response = await authQuery({
      chatRooms: {
        __args: {
          first,
          ...(after ? { after } : {}),
        },
        edges: {
          cursor: true,
          node: chatRoomListNodeSelection,
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

    return response.data?.chatRooms || null;
  } catch (error) {
    console.error("Failed to load chat rooms:", error);
    return null;
  }
}

/**
 * Load a single chat room with member details
 */
export async function loadChatRoom(
  id: string,
): Promise<ChatRoomDetailNode | null> {
  try {
    const response = await authQuery({
      chatRoom: {
        __args: { id },
        __typename: true,
        id: true,
        createdDate: true,
        __on: chatRoomInlineFragments,
        members: {
          __args: { first: 50 },
          edges: {
            cursor: true,
            node: {
              id: true,
              user: chatUserFragment,
              role: true,
              joinedDate: true,
            },
          },
          pageInfo: {
            hasNextPage: true,
            endCursor: true,
          },
        },
      },
    });

    if (response.errors?.length > 0) {
      return null;
    }

    return response.data?.chatRoom || null;
  } catch (error) {
    console.error("Failed to load chat room:", error);
    return null;
  }
}

/**
 * Load messages for a chat room (backward pagination)
 */
export async function loadMessages(
  chatRoomId: string,
  last: number,
  before?: string,
): Promise<{ edges: Edge<ChatMessageNode>[]; pageInfo: PageInfo } | null> {
  try {
    const response = await authQuery({
      chatRoom: {
        __args: { id: chatRoomId },
        chatMessages: {
          __args: {
            last,
            ...(before ? { before } : {}),
          },
          edges: {
            cursor: true,
            node: chatMessageNodeSelection,
          },
          pageInfo: {
            hasPreviousPage: true,
            startCursor: true,
          },
        },
      },
    });

    if (response.errors?.length > 0) {
      return null;
    }

    return response.data?.chatRoom?.chatMessages || null;
  } catch (error) {
    console.error("Failed to load messages:", error);
    return null;
  }
}

/**
 * Load friendships for the friend selector
 */
export async function loadFriendships(first: number, after?: string) {
  const { EnumType } = await import("json-to-graphql-query");
  try {
    const response = await authQuery({
      friendships: {
        __args: {
          input: { status: new EnumType("ACCEPTED") },
          first,
          ...(after ? { after } : {}),
        },
        edges: {
          cursor: true,
          node: {
            id: true,
            requester: chatUserFragment,
            addressee: chatUserFragment,
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

    return response.data?.friendships || null;
  } catch (error) {
    console.error("Failed to load friendships:", error);
    return null;
  }
}

/**
 * Find existing direct message room with a user
 */
export async function findDirectMessageRoom(
  userId: string,
): Promise<ChatRoomListNode | null> {
  try {
    const response = await authQuery({
      directMessageChatRoom: {
        __args: { userId },
        ...chatRoomListNodeSelection,
      },
    });

    if (response.errors?.length > 0) {
      return null;
    }

    return response.data?.directMessageChatRoom || null;
  } catch (error) {
    console.error("Failed to find direct message room:", error);
    return null;
  }
}

/**
 * Create a direct message conversation with another user.
 * Idempotent: returns the existing DM if one already exists.
 */
export async function createDirectMessage(userId: string): Promise<{
  success: boolean;
  chatRoom?: ChatRoomListNode;
  errorType?: string;
  message?: string;
}> {
  const parsed = createDirectMessageSchema.safeParse({ userId });
  if (!parsed.success) {
    return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: parsed.error.issues[0].message };
  }

  try {
    const response = await authMutate({
      createDirectMessage: {
        __args: {
          input: { userId: parsed.data.userId },
        },
        __typename: true,
        __on: [
          { __typeName: "CreateDirectMessageResponse", chatRoom: chatRoomListNodeSelection },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.createDirectMessage, "CreateDirectMessageResponse");
    if (!result.success) return result;

    return { success: true, chatRoom: result.data.chatRoom };
  } catch (error) {
    console.error("Failed to create direct message:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to create direct message" };
  }
}

/**
 * Create a group chat with multiple users.
 */
export async function createGroupChat(
  name: string,
  userIds: string[],
): Promise<{
  success: boolean;
  chatRoom?: ChatRoomListNode;
  errorType?: string;
  message?: string;
}> {
  const parsed = createGroupChatSchema.safeParse({ name, userIds });
  if (!parsed.success) {
    return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: parsed.error.issues[0].message };
  }

  try {
    const response = await authMutate({
      createGroupChat: {
        __args: {
          input: {
            name: parsed.data.name,
            userIds: parsed.data.userIds,
          },
        },
        __typename: true,
        __on: [
          { __typeName: "CreateGroupChatResponse", chatRoom: chatRoomListNodeSelection },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.createGroupChat, "CreateGroupChatResponse");
    if (!result.success) return result;

    return { success: true, chatRoom: result.data.chatRoom };
  } catch (error) {
    console.error("Failed to create group chat:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to create group chat" };
  }
}

/**
 * Send a chat message
 */
export async function sendMessage(
  chatRoomId: string,
  content: string,
  replyToId?: string,
): Promise<{
  success: boolean;
  chatMessage?: ChatMessageNode;
  errorType?: string;
  message?: string;
}> {
  const parsed = sendMessageSchema.safeParse({
    chatRoomId,
    content,
    replyToId,
  });
  if (!parsed.success) {
    return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: parsed.error.issues[0].message };
  }

  try {
    const response = await authMutate({
      sendChatMessage: {
        __args: {
          input: {
            textMessage: {
              chatRoomId: parsed.data.chatRoomId,
              content: parsed.data.content,
              ...(parsed.data.replyToId
                ? { replyToId: parsed.data.replyToId }
                : {}),
            },
          },
        },
        __typename: true,
        __on: [
          { __typeName: "SendChatMessageResponse", chatMessage: chatMessageNodeSelection },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.sendChatMessage, "SendChatMessageResponse");
    if (!result.success) return result;

    return { success: true, chatMessage: result.data.chatMessage };
  } catch (error) {
    console.error("Failed to send message:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to send message" };
  }
}

/**
 * Send a media chat message. This auto-confirms the resource -- do NOT call confirmUpload.
 */
export async function sendMediaMessage(
  chatRoomId: string,
  resourceId: string,
): Promise<{
  success: boolean;
  chatMessage?: ChatMessageNode;
  errorType?: string;
  message?: string;
}> {
  try {
    const response = await authMutate({
      sendChatMessage: {
        __args: {
          input: {
            mediaMessage: {
              chatRoomId,
              resourceId,
            },
          },
        },
        __typename: true,
        __on: [
          { __typeName: "SendChatMessageResponse", chatMessage: chatMessageNodeSelection },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.sendChatMessage, "SendChatMessageResponse");
    if (!result.success) return result;

    return { success: true, chatMessage: result.data.chatMessage };
  } catch (error) {
    console.error("Failed to send media message:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to send message" };
  }
}

/**
 * Update a chat message
 */
export async function updateMessage(id: string, content: string): Promise<{
  success: boolean;
  errorType?: string;
  message?: string;
}> {
  const parsed = updateMessageSchema.safeParse({ id, content });
  if (!parsed.success) {
    return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: parsed.error.issues[0].message };
  }

  try {
    const response = await authMutate({
      updateChatMessage: {
        __args: {
          input: {
            textMessage: { id: parsed.data.id, content: parsed.data.content },
          },
        },
        __typename: true,
        __on: [
          {
            __typeName: "UpdateChatMessageResponse",
            chatMessage: {
              id: true,
              __on: [{ __typeName: "TextChatMessage", content: true, updatedDate: true }],
            },
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.updateChatMessage, "UpdateChatMessageResponse");
    if (!result.success) return result;

    return { success: true };
  } catch (error) {
    console.error("Failed to update message:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to update message" };
  }
}

/**
 * Delete a chat message
 */
export async function deleteMessage(id: string): Promise<{
  success: boolean;
  errorType?: string;
  message?: string;
}> {
  try {
    const response = await authMutate({
      deleteChatMessage: {
        __args: {
          input: { id },
        },
        __typename: true,
        __on: [
          { __typeName: "DeleteChatMessageResponse", id: true },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.deleteChatMessage, "DeleteChatMessageResponse");
    if (!result.success) return result;

    return { success: true };
  } catch (error) {
    console.error("Failed to delete message:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to delete message" };
  }
}

/**
 * Add a member to a chat room
 */
export async function addMember(chatRoomId: string, userId: string): Promise<{
  success: boolean;
  member?: ChatRoomMemberNode;
  errorType?: string;
  message?: string;
}> {
  try {
    const response = await authMutate({
      addChatRoomMember: {
        __args: {
          input: { chatRoomId, userId },
        },
        __typename: true,
        __on: [
          {
            __typeName: "AddChatRoomMemberResponse",
            member: {
              id: true,
              user: chatUserFragment,
              role: true,
              joinedDate: true,
            },
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.addChatRoomMember, "AddChatRoomMemberResponse");
    if (!result.success) return result;

    return { success: true, member: result.data.member as ChatRoomMemberNode };
  } catch (error) {
    console.error("Failed to add member:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to add member" };
  }
}

/**
 * Update a chat room member's role
 */
export async function updateMemberRole(
  chatRoomId: string,
  userId: string,
  role: ChatRoomRoleType,
): Promise<{ success: boolean; errorType?: string; message?: string }> {
  const { EnumType } = await import("json-to-graphql-query");
  try {
    const response = await authMutate({
      updateChatRoomMemberRole: {
        __args: {
          input: { chatRoomId, userId, role: new EnumType(role) },
        },
        __typename: true,
        __on: [
          {
            __typeName: "UpdateChatRoomMemberRoleResponse",
            member: { id: true, role: true },
          },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.updateChatRoomMemberRole, "UpdateChatRoomMemberRoleResponse");
    if (!result.success) return result;

    return { success: true };
  } catch (error) {
    console.error("Failed to update member role:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to update role" };
  }
}

/**
 * Leave a chat room
 */
export async function leaveChat(
  chatRoomId: string,
): Promise<{ success: boolean; errorType?: string; message?: string }> {
  try {
    const response = await authMutate({
      leaveChatRoom: {
        __args: { input: { chatRoomId } },
        __typename: true,
        __on: [
          { __typeName: "LeaveChatRoomResponse", chatRoomId: true },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.leaveChatRoom, "LeaveChatRoomResponse");
    if (!result.success) return result;

    return { success: true };
  } catch (error) {
    console.error("Failed to leave chat room:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to leave chat" };
  }
}

/**
 * Remove a member from a chat room
 */
export async function removeMember(chatRoomId: string, userId: string): Promise<{
  success: boolean;
  errorType?: string;
  message?: string;
}> {
  try {
    const response = await authMutate({
      removeChatRoomMember: {
        __args: {
          input: { chatRoomId, userId },
        },
        __typename: true,
        __on: [
          { __typeName: "RemoveChatRoomMemberResponse", chatRoomId: true, userId: true },
          errorFragment,
        ],
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, errorType: MutationErrorType.GRAPHQL_ERROR, message: response.errors[0].message };
    }

    const result = extractMutationResult(response.data.removeChatRoomMember, "RemoveChatRoomMemberResponse");
    if (!result.success) return result;

    return { success: true };
  } catch (error) {
    console.error("Failed to remove member:", error);
    return { success: false, errorType: MutationErrorType.UNEXPECTED_ERROR, message: "Failed to remove member" };
  }
}
