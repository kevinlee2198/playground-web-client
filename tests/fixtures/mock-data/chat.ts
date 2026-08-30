import { http, HttpResponse } from "msw";
import { OTHER_USER_ID, TEST_BACKEND_USER_ID } from "../test-ids";
import { mockMeResponse } from "./me";
import { buildConnection, emptyConnection } from "./connection";

/**
 * Local field-name extraction (deliberately NOT imported from
 * graphql-handlers.ts — that module imports response builders FROM this
 * file, so importing back would create a circular dependency).
 */
function getOperationField(queryString: string): string | null {
  const match = queryString.match(
    /(?:query|mutation)?\s*(?:\w+\s*)?\{[\s]*(\w+)/,
  );
  return match?.[1] ?? null;
}

export const CHAT_CURRENT_USER = {
  id: TEST_BACKEND_USER_ID,
  firstName: "Test",
  lastName: "User",
  displayName: "Test User",
};

export const CHAT_OTHER_USER = {
  id: OTHER_USER_ID,
  firstName: "Other",
  lastName: "Person",
  displayName: "Other Person",
};

// ---------------------------------------------------------------------------
// Message node builders (chatMessageNodeSelection shape)
// ---------------------------------------------------------------------------

export function mockTextMessage(overrides?: Record<string, unknown>) {
  return {
    __typename: "TextChatMessage",
    id: "msg-1",
    createdDate: new Date().toISOString(),
    user: CHAT_OTHER_USER,
    updatedDate: null,
    deletedDate: null,
    replyTo: null,
    content: "Hello",
    ...overrides,
  };
}

/**
 * A real, minimal 1x1 PNG. Specs decode it to stage a file through the
 * composer's hidden file input without touching disk.
 */
export const PNG_1X1_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

/**
 * Inlined so the mock image URLs actually LOAD: a broken image keeps a
 * placeholder box in Chromium/Firefox but collapses to 0x0 in WebKit, which
 * makes `toBeVisible()` on the rendered <img> engine-dependent.
 */
const PNG_1X1_DATA_URI = `data:image/png;base64,${PNG_1X1_BASE64}`;

export function mockImageResource(overrides?: Record<string, unknown>) {
  return {
    __typename: "ImageResource",
    id: "resource-1",
    filename: "photo.png",
    size: 2048,
    mimeType: "image/png",
    downloadUrl: PNG_1X1_DATA_URI,
    createdDate: new Date().toISOString(),
    width: 400,
    height: 300,
    thumbnailUrl: PNG_1X1_DATA_URI,
    ...overrides,
  };
}

export function mockMediaMessage(overrides?: Record<string, unknown>) {
  return {
    __typename: "MediaChatMessage",
    id: "msg-media-1",
    createdDate: new Date().toISOString(),
    user: CHAT_CURRENT_USER,
    updatedDate: null,
    deletedDate: null,
    replyTo: null,
    caption: null,
    resource: mockImageResource(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Room list (chatRooms query — chatRoomListNodeSelection shape)
// ---------------------------------------------------------------------------

export function mockChatRoomListNode(overrides?: Record<string, unknown>) {
  return {
    __typename: "DirectMessageChatRoom",
    id: "room-1",
    createdDate: new Date().toISOString(),
    canMessage: true,
    members: {
      edges: [{ node: { user: CHAT_CURRENT_USER } }, { node: { user: CHAT_OTHER_USER } }],
    },
    chatMessages: {
      edges: [{ node: mockTextMessage() }],
    },
    ...overrides,
  };
}

export function mockChatRoomsResponse(rooms?: Record<string, unknown>[]) {
  return {
    data: {
      chatRooms: buildConnection(rooms ?? [mockChatRoomListNode()]),
    },
  };
}

export function mockEmptyChatRoomsResponse() {
  return { data: { chatRooms: emptyConnection() } };
}

// ---------------------------------------------------------------------------
// Room detail (the "chatRoom" field — serves BOTH loadChatRoom and
// loadMessages, which both select it under that same top-level field name)
// ---------------------------------------------------------------------------

export function mockChatRoomDetail(overrides?: Record<string, unknown>) {
  return {
    __typename: "DirectMessageChatRoom",
    id: "room-1",
    createdDate: new Date().toISOString(),
    canMessage: true,
    members: {
      edges: [
        {
          cursor: "member-1",
          node: {
            id: "member-1",
            user: CHAT_CURRENT_USER,
            role: "MEMBER",
            joinedDate: new Date().toISOString(),
          },
        },
        {
          cursor: "member-2",
          node: {
            id: "member-2",
            user: CHAT_OTHER_USER,
            role: "MEMBER",
            joinedDate: new Date().toISOString(),
          },
        },
      ],
      pageInfo: { hasNextPage: false, endCursor: null },
    },
    chatMessages: {
      edges: [],
      pageInfo: { hasPreviousPage: false, startCursor: null },
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// requestUpload (media send flow)
// ---------------------------------------------------------------------------

export function mockRequestUploadResponse(overrides?: Record<string, unknown>) {
  return {
    data: {
      requestUpload: {
        __typename: "RequestUploadResponse",
        uploadUrl: null, // LOCAL storage dev environments skip the S3 PUT
        resourceId: "resource-uploaded-1",
        ...overrides,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// sendChatMessage — branches on input.mediaMessage vs input.textMessage since
// the raw query text (not a separate "variables" payload) carries the input.
// Echoes caption/content + replyToId so the composer's send-and-render flow
// is verifiable end-to-end.
// ---------------------------------------------------------------------------

export function mockSendChatMessageResponse(queryString: string) {
  const replyToId = queryString.match(/replyToId\s*:\s*"([^"]*)"/)?.[1];
  const replyTo = replyToId
    ? {
        replyTo: {
          __typename: "TextChatMessage",
          id: replyToId,
          deletedDate: null,
          user: CHAT_OTHER_USER,
          content: "Original message",
        },
      }
    : {};

  const chatMessage = /mediaMessage\s*:/.test(queryString)
    ? mockMediaMessage({
        id: "msg-echo-media",
        caption: queryString.match(/caption\s*:\s*"([^"]*)"/)?.[1] ?? null,
        resource: mockImageResource({
          id: queryString.match(/resourceId\s*:\s*"([^"]*)"/)?.[1] ?? "resource-1",
        }),
        ...replyTo,
      })
    : mockTextMessage({
        id: "msg-echo-text",
        content: queryString.match(/content\s*:\s*"([^"]*)"/)?.[1] ?? "",
        user: CHAT_CURRENT_USER,
        ...replyTo,
      });

  return {
    data: {
      sendChatMessage: {
        __typename: "SendChatMessageResponse",
        chatMessage,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Composite per-test handler: routes me/chatRooms/chatRoom/requestUpload/
// sendChatMessage for a single open conversation. `chatRoom` serves both the
// room-detail query AND the messages query (same top-level field); pass
// `olderMessages` to also branch on a `before:` older-history fetch.
// ---------------------------------------------------------------------------

interface ChatConversationHandlerOptions {
  /** Room entry for the left-pane room list (chatRooms query). */
  roomListEntry: Record<string, unknown>;
  /** Combined room-detail + initial chatMessages window (the "chatRoom" field). */
  room: Record<string, unknown>;
  /** Returned instead of `room.chatMessages` when the request's `before` cursor matches. */
  olderMessages?: { cursor: string; chatMessages: Record<string, unknown> };
  requestUpload?: Record<string, unknown>;
}

export function mockChatConversationHandler({
  roomListEntry,
  room,
  olderMessages,
  requestUpload,
}: ChatConversationHandlerOptions) {
  return http.post("*/graphql", async ({ request }) => {
    const body = (await request.json()) as { query: string };
    const field = getOperationField(body.query);

    if (field === "me") {
      return HttpResponse.json(mockMeResponse());
    }
    if (field === "chatRooms") {
      return HttpResponse.json(mockChatRoomsResponse([roomListEntry]));
    }
    if (field === "chatRoom") {
      if (
        olderMessages &&
        body.query.includes(`before: "${olderMessages.cursor}"`)
      ) {
        return HttpResponse.json({
          data: { chatRoom: { ...room, chatMessages: olderMessages.chatMessages } },
        });
      }
      return HttpResponse.json({ data: { chatRoom: room } });
    }
    if (field === "requestUpload") {
      return HttpResponse.json(requestUpload ?? mockRequestUploadResponse());
    }
    if (field === "sendChatMessage") {
      return HttpResponse.json(mockSendChatMessageResponse(body.query));
    }

    return HttpResponse.json({ data: {} });
  });
}
