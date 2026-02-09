"use server";

import type { Edge, PageInfo } from "@/lib/graphql-connection";
import { authMutate, authQuery } from "@/lib/graphql-request";
import type {
  ChatMessageNode,
  ChatRoomDetailNode,
  ChatRoomListNode,
  ChatRoomMemberNode,
} from "@/lib/types/chat";
import { EnumType } from "json-to-graphql-query";
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

const createChatRoomSchema = z.object({
  name: z.string().min(1).max(100),
  userIds: z.array(z.string().min(1)).min(1),
  isDirectMessage: z.boolean(),
});

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
          node: {
            id: true,
            name: true,
            isDirectMessage: true,
            createdDate: true,
            members: {
              __args: { first: 10 },
              edges: {
                node: {
                  user: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
            chatMessages: {
              __args: { last: 1 },
              edges: {
                node: {
                  id: true,
                  createdDate: true,
                  updatedDate: true,
                  deletedDate: true,
                  isSystemMessage: true,
                  user: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                  __on: [
                    {
                      __typeName: "TextChatMessage",
                      content: true,
                    },
                  ],
                },
              },
            },
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
        id: true,
        name: true,
        isDirectMessage: true,
        createdDate: true,
        members: {
          __args: { first: 50 },
          edges: {
            cursor: true,
            node: {
              id: true,
              user: {
                id: true,
                firstName: true,
                lastName: true,
              },
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
            node: {
              id: true,
              createdDate: true,
              updatedDate: true,
              deletedDate: true,
              isSystemMessage: true,
              user: {
                id: true,
                firstName: true,
                lastName: true,
              },
              replyTo: {
                id: true,
                user: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
                __on: [
                  {
                    __typeName: "TextChatMessage",
                    content: true,
                  },
                ],
              },
              __on: [
                {
                  __typeName: "TextChatMessage",
                  content: true,
                },
              ],
            },
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
            requester: {
              id: true,
              firstName: true,
              lastName: true,
            },
            addressee: {
              id: true,
              firstName: true,
              lastName: true,
            },
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
        id: true,
        name: true,
        isDirectMessage: true,
        createdDate: true,
        members: {
          __args: { first: 10 },
          edges: {
            node: {
              user: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        chatMessages: {
          __args: { last: 1 },
          edges: {
            node: {
              id: true,
              createdDate: true,
              updatedDate: true,
              deletedDate: true,
              isSystemMessage: true,
              user: {
                id: true,
                firstName: true,
                lastName: true,
              },
              __on: [
                {
                  __typeName: "TextChatMessage",
                  content: true,
                },
              ],
            },
          },
        },
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
 * Create a new chat room
 */
export async function createChatRoom(
  name: string,
  userIds: string[],
  isDirectMessage: boolean,
): Promise<{
  success: boolean;
  chatRoom?: ChatRoomListNode;
  error?: string;
}> {
  const parsed = createChatRoomSchema.safeParse({
    name,
    userIds,
    isDirectMessage,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const response = await authMutate({
      createChatRoom: {
        __args: {
          input: {
            name: parsed.data.name,
            userIds: parsed.data.userIds,
            isDirectMessage: parsed.data.isDirectMessage,
          },
        },
        chatRoom: {
          id: true,
          name: true,
          isDirectMessage: true,
          createdDate: true,
          members: {
            __args: { first: 10 },
            edges: {
              node: {
                user: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          chatMessages: {
            __args: { last: 1 },
            edges: {
              node: {
                id: true,
                createdDate: true,
                updatedDate: true,
                deletedDate: true,
                isSystemMessage: true,
                user: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
                __on: [
                  {
                    __typeName: "TextChatMessage",
                    content: true,
                  },
                ],
              },
            },
          },
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return {
      success: true,
      chatRoom: response.data.createChatRoom.chatRoom,
    };
  } catch (error) {
    console.error("Failed to create chat room:", error);
    return { success: false, error: "Failed to create chat room" };
  }
}

/**
 * Send a chat message
 */
export async function sendMessage(
  chatRoomId: string,
  content: string,
  replyToId?: string,
) {
  const parsed = sendMessageSchema.safeParse({
    chatRoomId,
    content,
    replyToId,
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
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
        chatMessage: {
          id: true,
          createdDate: true,
          updatedDate: true,
          deletedDate: true,
          isSystemMessage: true,
          user: {
            id: true,
            firstName: true,
            lastName: true,
          },
          replyTo: {
            id: true,
            user: {
              id: true,
              firstName: true,
              lastName: true,
            },
            __on: [
              {
                __typeName: "TextChatMessage",
                content: true,
              },
            ],
          },
          __on: [
            {
              __typeName: "TextChatMessage",
              content: true,
            },
          ],
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return {
      success: true,
      message: response.data.sendChatMessage.chatMessage,
    };
  } catch (error) {
    console.error("Failed to send message:", error);
    return { success: false, error: "Failed to send message" };
  }
}

/**
 * Update a chat message
 */
export async function updateMessage(id: string, content: string) {
  const parsed = updateMessageSchema.safeParse({ id, content });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  try {
    const response = await authMutate({
      updateChatMessage: {
        __args: {
          input: {
            textMessage: { id: parsed.data.id, content: parsed.data.content },
          },
        },
        chatMessage: {
          id: true,
          updatedDate: true,
          __on: [
            {
              __typeName: "TextChatMessage",
              content: true,
            },
          ],
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to update message:", error);
    return { success: false, error: "Failed to update message" };
  }
}

/**
 * Delete a chat message
 */
export async function deleteMessage(id: string) {
  try {
    const response = await authMutate({
      deleteChatMessage: {
        __args: {
          input: { id },
        },
        id: true,
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to delete message:", error);
    return { success: false, error: "Failed to delete message" };
  }
}

/**
 * Add a member to a chat room
 */
export async function addMember(chatRoomId: string, userId: string) {
  try {
    const response = await authMutate({
      addChatRoomMember: {
        __args: {
          input: { chatRoomId, userId },
        },
        member: {
          id: true,
          user: {
            id: true,
            firstName: true,
            lastName: true,
          },
          role: true,
          joinedDate: true,
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return {
      success: true,
      member: response.data.addChatRoomMember.member as ChatRoomMemberNode,
    };
  } catch (error) {
    console.error("Failed to add member:", error);
    return { success: false, error: "Failed to add member" };
  }
}

/**
 * Remove a member from a chat room
 */
export async function removeMember(chatRoomId: string, userId: string) {
  try {
    const response = await authMutate({
      removeChatRoomMember: {
        __args: {
          input: { chatRoomId, userId },
        },
        chatRoomId: true,
        userId: true,
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return { success: true };
  } catch (error) {
    console.error("Failed to remove member:", error);
    return { success: false, error: "Failed to remove member" };
  }
}
