# Design: Live Chat WebSocket Support

## 1. Overview

This feature adds real-time chat updates by subscribing to the `chatEvents` GraphQL subscription over the existing singleton WebSocket client. The `useChatSubscription` hook follows the exact same pattern as `useNotificationSubscription` -- refs for callbacks, first-connection vs reconnection tracking, and cleanup on unmount. The hook is consumed exclusively in `ChatLayout`, which routes events to child components through props and state updates.

The design avoids creating new WebSocket connections (the singleton in `src/lib/graphql-ws-client.ts` is shared with notifications), avoids unnecessary re-renders by using refs for all callback props, and handles reconnection by fully replacing local state with fresh server data.

## 2. New Types (`src/lib/types/chat-event.ts`)

All types follow the project convention: response types use `field: T | null` for nullable GraphQL fields.

```typescript
import type { ChatMessageNode, ChatRoomListNode, ChatRoomMemberNode } from "@/lib/types/chat";

/** Base fields shared by all chat events */
interface ChatEventBase {
  createdDate: string;
  chatRoom: ChatRoomListNode;
}

/** A new message was sent in a chat room */
export interface ChatMessageSentEvent extends ChatEventBase {
  __typename: "ChatMessageSentEvent";
  chatMessage: ChatMessageNode;
}

/** An existing message was updated (edited) */
export interface ChatMessageUpdatedEvent extends ChatEventBase {
  __typename: "ChatMessageUpdatedEvent";
  chatMessage: ChatMessageNode;
}

/** A message was deleted (soft-delete) */
export interface ChatMessageDeletedEvent extends ChatEventBase {
  __typename: "ChatMessageDeletedEvent";
  chatMessage: ChatMessageNode;
}

/** A member was added to a chat room */
export interface ChatRoomMemberAddedEvent extends ChatEventBase {
  __typename: "ChatRoomMemberAddedEvent";
  member: ChatRoomMemberNode;
}

/** A member was removed from a chat room */
export interface ChatRoomMemberRemovedEvent extends ChatEventBase {
  __typename: "ChatRoomMemberRemovedEvent";
  userId: string;
}

/** Discriminated union for all chat event types */
export type ChatEvent =
  | ChatMessageSentEvent
  | ChatMessageUpdatedEvent
  | ChatMessageDeletedEvent
  | ChatRoomMemberAddedEvent
  | ChatRoomMemberRemovedEvent;
```

Note: The `chatRoom` field uses `ChatRoomListNode` because the subscription query selects the same fields as the room list query (members, last message, typename-specific fields). This allows direct insertion into the room list state without transformation.

## 3. Subscription Hook (`src/hooks/use-chat-subscription.ts`)

### Hook Interface

```typescript
"use client";

import type { ChatEvent } from "@/lib/types/chat-event";

interface UseChatSubscriptionOptions {
  enabled: boolean;
  onEvent: (event: ChatEvent) => void;
  onReconnect?: () => void;
}

export function useChatSubscription({
  enabled,
  onEvent,
  onReconnect,
}: UseChatSubscriptionOptions): void;
```

Design decision: A single `onEvent` callback rather than five separate callbacks. The discriminated union with `__typename` makes switching trivial in the consumer, and a single callback means one ref instead of five. The consumer (`ChatLayout`) already needs to coordinate across event types (e.g., updating both room list and message list for the same event), so a single entry point is cleaner.

### Subscription Query

The query uses `json-to-graphql-query` format and reuses fragments from `src/lib/graphql-fragments.ts`:

```typescript
import {
  chatMessageInlineFragments,
  chatRoomInlineFragments,
  chatUserFragment,
} from "@/lib/graphql-fragments";
import { jsonToGraphQLQuery } from "json-to-graphql-query";

const chatMessageNodeSelection = {
  __typename: true,
  id: true,
  createdDate: true,
  updatedDate: true,
  deletedDate: true,
  isSystemMessage: true,
  user: chatUserFragment,
  replyTo: {
    __typename: true,
    id: true,
    user: chatUserFragment,
    __on: chatMessageInlineFragments,
  },
  __on: chatMessageInlineFragments,
};

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

const SUBSCRIPTION_QUERY = jsonToGraphQLQuery({
  subscription: {
    chatEvents: {
      __typename: true,
      createdDate: true,
      chatRoom: chatRoomListNodeSelection,
      __on: [
        {
          __typeName: "ChatMessageSentEvent",
          chatMessage: chatMessageNodeSelection,
        },
        {
          __typeName: "ChatMessageUpdatedEvent",
          chatMessage: chatMessageNodeSelection,
        },
        {
          __typeName: "ChatMessageDeletedEvent",
          chatMessage: chatMessageNodeSelection,
        },
        {
          __typeName: "ChatRoomMemberAddedEvent",
          member: {
            id: true,
            user: chatUserFragment,
            role: true,
            joinedDate: true,
          },
        },
        {
          __typeName: "ChatRoomMemberRemovedEvent",
          userId: true,
        },
      ],
    },
  },
});
```

Note: The `chatMessageNodeSelection` and `chatRoomListNodeSelection` are duplicated from `src/app/[locale]/chat/actions.ts` because that file is a `"use server"` module and cannot be imported from a client component. This duplication is acceptable since both are derived from the same shared fragments.

### Lifecycle Implementation

```typescript
export function useChatSubscription({
  enabled,
  onEvent,
  onReconnect,
}: UseChatSubscriptionOptions): void {
  const onEventRef = useRef(onEvent);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onEventRef.current = onEvent;
    onReconnectRef.current = onReconnect;
  });

  // Note: unlike the notification hook, we do NOT dispose the WebSocket client
  // when disabled. The notification hook already handles disposal on logout.
  // This hook simply subscribes/unsubscribes.

  useEffect(() => {
    if (!enabled) return;

    let isFirstConnection = true;

    const client = getGraphQLWsClient(async () => {
      const token = await getAccessToken();
      if (!token) throw new Error("No access token available");
      return token;
    });

    const unsubscribeConnected = client.on("connected", () => {
      if (isFirstConnection) {
        isFirstConnection = false;
      } else {
        onReconnectRef.current?.();
      }
    });

    const unsubscribe = client.subscribe<{
      chatEvents: ChatEvent;
    }>(
      { query: SUBSCRIPTION_QUERY },
      {
        next: (result) => {
          const event = result.data?.chatEvents;
          if (!event || !event.__typename) {
            console.warn("[useChatSubscription] Malformed event received:", result.data);
            return;
          }
          onEventRef.current(event);
        },
        error: (error) => {
          console.error("[useChatSubscription] Subscription error:", error);
        },
        complete: () => {},
      },
    );

    return () => {
      unsubscribeConnected();
      unsubscribe();
    };
  }, [enabled]);
}
```

Key differences from the notification hook:
- Does NOT call `disposeGraphQLWsClient()` when disabled. The notification hook already handles that on logout. Adding a second disposal call from this hook would be incorrect since both hooks share the singleton. The notification hook is the "owner" of the connection lifecycle.
- Validates `event.__typename` before dispatching to guard against malformed data (NFR-4).

## 4. ChatLayout Changes

### Hook Integration

`ChatLayout` is already a `"use client"` component. The hook is integrated at the top level:

```typescript
// New state
const [unreadRoomIds, setUnreadRoomIds] = useState<Set<string>>(new Set());
const [incomingEventVersion, setIncomingEventVersion] = useState(0);
const incomingEventRef = useRef<ChatEvent | null>(null);
const [reconnectCounter, setReconnectCounter] = useState(0);

// Refs for stable access in callbacks
const selectedRoomIdRef = useRef(selectedRoomId);
useEffect(() => {
  selectedRoomIdRef.current = selectedRoomId;
}, [selectedRoomId]);

// The subscription
useChatSubscription({
  enabled: true, // ChatLayout only mounts when authenticated
  onEvent: handleChatEvent,
  onReconnect: handleReconnect,
});
```

Note: `enabled` is always `true` because `ChatLayout` is only rendered for authenticated users (the chat page requires authentication). The WebSocket client itself handles token injection.

#### Event Delivery to ConversationView

Events are delivered to `ConversationView` via a **version counter + ref** pattern rather than passing the event object as a prop directly. This solves the problem where two events arriving in quick succession could be the same object reference, causing `useEffect` to not re-fire:

```typescript
// ChatLayout stores the event in a ref and bumps a version counter
incomingEventRef.current = event;
setIncomingEventVersion((v) => v + 1);

// ConversationView receives the version counter as a prop and reads the event via a getter
<ConversationView
  incomingEventVersion={incomingEventVersion}
  getIncomingEvent={() => incomingEventRef.current}
  // ...
/>
```

The version counter guarantees every event triggers the `useEffect`, even if React batches state updates. The ref avoids passing large event objects through props.

### Event Routing

The `handleChatEvent` function dispatches events based on type and whether the event targets the active room:

```typescript
const dispatchToConversation = useCallback((event: ChatEvent) => {
  incomingEventRef.current = event;
  setIncomingEventVersion((v) => v + 1);
}, []);

const handleChatEvent = useCallback((event: ChatEvent) => {
  const roomId = event.chatRoom.id;
  const isActiveRoom = roomId === selectedRoomIdRef.current;

  switch (event.__typename) {
    case "ChatMessageSentEvent": {
      // Update room list: move room to top, update last message
      setRoomListEvent({ type: "upsert", room: event.chatRoom });

      if (isActiveRoom) {
        // Pass to ConversationView for message insertion
        dispatchToConversation(event);
      } else {
        // Mark room as unread
        setUnreadRoomIds((prev) => new Set(prev).add(roomId));
      }
      break;
    }

    case "ChatMessageUpdatedEvent":
    case "ChatMessageDeletedEvent": {
      // Update room list last message if it matches
      setRoomListEvent({ type: "upsert", room: event.chatRoom });

      if (isActiveRoom) {
        dispatchToConversation(event);
      }
      break;
    }

    case "ChatRoomMemberAddedEvent": {
      if (event.member.user.id === currentUser.id) {
        // Current user was added to a new room
        setRoomListEvent({ type: "upsert", room: event.chatRoom });
        setUnreadRoomIds((prev) => new Set(prev).add(roomId));
      } else if (isActiveRoom) {
        // Someone else was added to the active room -- update member list
        setActiveRoomMembers((prev) => {
          if (prev.some((e) => e.node.id === event.member.id)) return prev;
          return [...prev, { cursor: event.member.id, node: event.member }];
        });
      }
      break;
    }

    case "ChatRoomMemberRemovedEvent": {
      if (event.userId === currentUser.id) {
        // Current user was removed
        setRoomListEvent({ type: "remove", roomId });
        if (isActiveRoom) {
          setSelectedRoomId(null);
          setMobileView("list");
        }
      } else if (isActiveRoom) {
        // Someone else was removed from the active room -- update member list
        setActiveRoomMembers((prev) =>
          prev.filter((e) => e.node.user.id !== event.userId),
        );
      }
      break;
    }
  }
}, [currentUser.id, dispatchToConversation]);
```

### Room List State Helpers

These functions are defined inside `ChatLayout` and operate on the room list state that is currently managed through the `newRoom` and `lastMessageUpdate` props to `ChatRoomList`. However, for WebSocket events, we need more direct control. The design introduces a new pattern:

```typescript
// New state: a "room list event" that ChatRoomList processes
const [roomListEvent, setRoomListEvent] = useState<RoomListEvent | null>(null);

type RoomListEvent =
  | { type: "upsert"; room: ChatRoomListNode }  // Add or move to top
  | { type: "remove"; roomId: string }
  | { type: "replace"; rooms: Edge<ChatRoomListNode>[]; pageInfo: PageInfo }; // Reconnection
```

**Important: Preserving existing optimistic update flows.** The existing `newRoom` and `lastMessageUpdate` props are kept alongside `roomListEvent`. They continue to serve their existing purpose:

- `newRoom` — set by `handleNewRoomCreated` when the user creates a room via the dialog
- `lastMessageUpdate` — set by `handleRoomLastMessageUpdate` when the user sends a message (optimistic update from mutation response)

These are NOT replaced by `roomListEvent`. The `roomListEvent` prop is used exclusively for WebSocket-driven updates and reconnection. `ChatRoomList` processes all three independently. This avoids breaking the existing optimistic update flows, which produce `ChatMessageNode` objects (not full `ChatRoomListNode` objects needed for `upsert`).

### Clearing Unread State

When a room is selected, clear its unread state:

```typescript
const handleRoomSelect = (roomId: string) => {
  setSelectedRoomId(roomId);
  setMobileView("conversation");
  setMemberPanelOpen(false);
  setUnreadRoomIds((prev) => {
    const next = new Set(prev);
    next.delete(roomId);
    return next;
  });
};
```

### Reconnection Catch-Up

Uses the `reconnectCounter` state (declared in Hook Integration above) to signal `ConversationView` to re-fetch:

```typescript
const handleReconnect = useCallback(async () => {
  // Re-fetch room list
  const roomsResult = await loadChatRooms(20);
  if (roomsResult) {
    setRoomListEvent({
      type: "replace",
      rooms: roomsResult.edges,
      pageInfo: roomsResult.pageInfo,
    });
  }

  // Signal ConversationView to re-fetch
  setReconnectCounter((c) => c + 1);
}, []);
```

### Props Changes to Children

Updated `ChatRoomList` props:
```typescript
interface ChatRoomListProps {
  // ... existing props (including newRoom, lastMessageUpdate) ...
  // ADDED:
  roomListEvent: RoomListEvent | null;
  unreadRoomIds: Set<string>;
}
```

Updated `ConversationView` props:
```typescript
interface ConversationViewProps {
  // ... existing props ...
  // ADDED:
  incomingEventVersion: number;
  getIncomingEvent: () => ChatEvent | null;
  reconnectCounter: number;
}
```

## 5. ConversationView Changes

### Receiving Events

`ConversationView` processes incoming events via the version counter pattern. The `incomingEventVersion` prop triggers the `useEffect`, and the event is read from the getter:

```typescript
useEffect(() => {
  if (incomingEventVersion === 0) return; // Skip initial render

  const event = getIncomingEvent();
  if (!event) return;

  // Guard against stale events from a room switch race condition:
  // If the user switches rooms while an event is in flight, the event
  // could target the old room. Validate before processing.
  if (event.chatRoom.id !== roomId) return;

  switch (event.__typename) {
    case "ChatMessageSentEvent":
      handleIncomingMessage(event.chatMessage);
      break;
    case "ChatMessageUpdatedEvent":
      handleIncomingUpdate(event.chatMessage);
      break;
    case "ChatMessageDeletedEvent":
      handleIncomingDelete(event.chatMessage);
      break;
  }
}, [incomingEventVersion, roomId]);
```

Note: `ChatRoomMemberAddedEvent` and `ChatRoomMemberRemovedEvent` are handled directly in `ChatLayout` (which owns the `activeRoomMembers` state), so they are not dispatched to `ConversationView`.

### Message Insertion (ChatMessageSentEvent)

```typescript
const handleIncomingMessage = (message: ChatMessageNode) => {
  setMessages((prev) => {
    // Self-event deduplication: skip if message already exists
    if (prev.some((edge) => edge.node.id === message.id)) {
      return prev;
    }

    const newEdge: Edge<ChatMessageNode> = {
      cursor: message.id,
      node: message,
    };

    // Insert sorted by createdDate
    const insertIndex = prev.findIndex(
      (edge) =>
        new Date(edge.node.createdDate).getTime() >
        new Date(message.createdDate).getTime(),
    );

    if (insertIndex === -1) {
      // Append to end (most common case)
      return [...prev, newEdge];
    }

    // Insert at correct position
    const next = [...prev];
    next.splice(insertIndex, 0, newEdge);
    return next;
  });
};
```

### Message Update (ChatMessageUpdatedEvent)

```typescript
const handleIncomingUpdate = (message: ChatMessageNode) => {
  setMessages((prev) =>
    prev.map((edge) => {
      if (edge.node.id === message.id) {
        return { ...edge, node: message };
      }
      return edge;
    }),
  );
};
```

This replaces the entire message node with the server-authoritative data. This handles both self-events (replacing optimistic values) and events from other users correctly.

### Message Delete (ChatMessageDeletedEvent)

```typescript
const handleIncomingDelete = (message: ChatMessageNode) => {
  setMessages((prev) =>
    prev.map((edge) => {
      if (edge.node.id === message.id) {
        return { ...edge, node: message };
      }
      return edge;
    }),
  );
};
```

Same logic as update -- replace with server data. The `deletedDate` on the server-provided message will cause the existing soft-delete display pattern to render.

### Member Events

Member added/removed events are handled directly in `ChatLayout`'s `handleChatEvent` (see Section 4), not in `ConversationView`. `ChatLayout` owns the `activeRoomMembers` state and updates it directly using functional state updates (`setActiveRoomMembers((prev) => ...)`) to avoid stale closure issues.

**Known limitation:** If a `ChatRoomMemberAddedEvent` arrives while `ConversationView` is still loading the room (async `loadChatRoom` call), the member update will be applied to `activeRoomMembers`, but then overwritten when `handleRoomLoaded` fires with the server response. This is acceptable because the server response will include the newly added member (the event happened before/during the fetch). The same applies to removal events.

### Self-Event Deduplication in handleSend

The existing `handleSend` must also deduplicate, to handle the case where the WebSocket event arrives **before** the mutation response:

```typescript
const handleSend = async (content: string, replyToId?: string) => {
  const result = await sendMessage(roomId, content, replyToId);

  if (!result.success || !result.message) {
    toast.error(result.error || t("errors.sendMessage"));
    throw new Error("Failed to send message");
  }

  // Append the new message, but deduplicate in case the WebSocket event
  // arrived before the mutation response
  const newEdge: Edge<ChatMessageNode> = {
    cursor: result.message.id,
    node: result.message,
  };
  setMessages((prev) => {
    if (prev.some((edge) => edge.node.id === result.message!.id)) {
      return prev;
    }
    return [...prev, newEdge];
  });

  onLastMessageUpdate(roomId, result.message);
  setReplyTo(null);
};
```

### Reconnection Re-Fetch

```typescript
useEffect(() => {
  if (reconnectCounter === 0) return; // Skip initial render

  const refetch = async () => {
    setIsLoading(true);
    try {
      const messagesData = await loadMessages(roomId, 25);
      if (messagesData) {
        setMessages(messagesData.edges);
        setMessagesPageInfo(messagesData.pageInfo);
      }
    } catch (error) {
      console.error("Failed to re-fetch messages on reconnect:", error);
    } finally {
      setIsLoading(false);
    }
  };

  refetch();
}, [reconnectCounter, roomId]);
```

## 6. MessageList Changes

### "New Messages" Indicator

A new state and scroll tracking mechanism is added to `MessageList`:

```typescript
interface MessageListProps {
  // ... existing props ...
  // No new props needed -- this is self-contained scroll behavior
}
```

New internal state:

```typescript
const [showNewMessageIndicator, setShowNewMessageIndicator] = useState(false);
const isNearBottomRef = useRef(true);
```

### Scroll Detection

Add a scroll event listener to the viewport to track whether the user is near the bottom:

```typescript
useEffect(() => {
  const viewport = getViewport();
  if (!viewport) return;

  const handleScroll = () => {
    const nearBottom =
      viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 100;
    isNearBottomRef.current = nearBottom;

    if (nearBottom) {
      setShowNewMessageIndicator(false);
    }
  };

  viewport.addEventListener("scroll", handleScroll);
  return () => viewport.removeEventListener("scroll", handleScroll);
}, []);
```

### Showing the Indicator on New Messages

Modify the existing "auto-scroll to bottom when new messages are added" effect:

```typescript
useEffect(() => {
  if (
    !isInitialMount.current &&
    messages.length > previousMessageCount.current
  ) {
    const viewport = getViewport();
    if (viewport) {
      if (isNearBottomRef.current) {
        requestAnimationFrame(() => {
          viewport.scrollTop = viewport.scrollHeight;
        });
      } else {
        // User is scrolled up -- show indicator
        setShowNewMessageIndicator(true);
      }
    }
  }
  previousMessageCount.current = messages.length;
}, [messages.length]);
```

### Indicator Rendering

Add the indicator at the bottom of the `ScrollArea`, positioned sticky:

```typescript
{showNewMessageIndicator && (
  <div className="sticky bottom-2 flex justify-center px-4">
    <button
      onClick={() => {
        const viewport = getViewport();
        if (viewport) {
          viewport.scrollTo({
            top: viewport.scrollHeight,
            behavior: "smooth",
          });
        }
        setShowNewMessageIndicator(false);
      }}
      className={cn(
        "rounded-full bg-primary px-4 py-1.5 text-primary-foreground",
        "text-sm font-medium shadow-md",
        "hover:bg-primary/90 transition-colors",
      )}
    >
      {t("newMessages")}
    </button>
  </div>
)}
```

The `MessageList` component will need `useTranslations("chat")` added for the new translation key. It currently does not use translations.

### Reset on Room Change

The indicator should reset when the parent remounts `MessageList` (which happens when `roomId` changes and `ConversationView` resets). Since `MessageList` is unmounted and remounted when `ConversationView` resets state, the initial state values handle this automatically.

## 7. ChatRoomList / ChatRoomListItem Changes

### ChatRoomList: Processing RoomListEvent

Replace the existing `newRoom` and `lastMessageUpdate` effect handlers with a single `roomListEvent` handler:

```typescript
useEffect(() => {
  if (!roomListEvent) return;

  switch (roomListEvent.type) {
    case "upsert": {
      setRooms((prev) => {
        // Remove existing entry if present
        const filtered = prev.filter((e) => e.node.id !== roomListEvent.room.id);
        // Prepend to top
        return [{ cursor: roomListEvent.room.id, node: roomListEvent.room }, ...filtered];
      });
      break;
    }
    case "remove": {
      setRooms((prev) => prev.filter((e) => e.node.id !== roomListEvent.roomId));
      break;
    }
    case "replace": {
      setRooms(roomListEvent.rooms);
      setPageInfo(roomListEvent.pageInfo);
      break;
    }
  }
}, [roomListEvent]);
```

The `upsert` operation handles both:
- New rooms appearing (from `ChatRoomMemberAddedEvent` for current user)
- Existing rooms moving to top with updated last message (from `ChatMessageSentEvent`)

### ChatRoomListItem: Unread Dot

Add the `hasUnread` prop:

```typescript
interface ChatRoomListItemProps {
  // ... existing props ...
  hasUnread: boolean;
}
```

Render the dot in the header area, next to the timestamp:

```typescript
<div className="flex items-baseline justify-between gap-2 mb-1">
  <h3 className="font-semibold text-sm truncate">{displayName}</h3>
  <div className="flex items-center gap-1.5 shrink-0">
    {lastMessageTime && (
      <span className="text-xs text-muted-foreground">
        {lastMessageTime}
      </span>
    )}
    {hasUnread && (
      <span className="h-2.5 w-2.5 rounded-full bg-primary" />
    )}
  </div>
</div>
```

### ChatRoomList: Passing Unread State

```typescript
{rooms.map((edge) => (
  <ChatRoomListItem
    key={edge.node.id}
    room={edge.node}
    isSelected={selectedRoomId === edge.node.id}
    currentUserId={currentUserId}
    onClick={() => onSelectRoom(edge.node.id)}
    hasUnread={unreadRoomIds.has(edge.node.id)}
  />
))}
```

## 8. Data Flow Diagram

```
WebSocket Server
      |
      | chatEvents subscription
      v
+---------------------------+
| graphql-ws-client.ts      |  (singleton, shared with notifications)
| getGraphQLWsClient()      |
+---------------------------+
      |
      | subscribe / on("connected")
      v
+---------------------------+
| use-chat-subscription.ts  |
| - refs for callbacks      |
| - first connect tracking  |
| - malformed event guard   |
+---------------------------+
      |
      | onEvent(ChatEvent)          onReconnect()
      v                             v
+----------------------------------------------------------+
| ChatLayout                                               |
| - handleChatEvent() switch on __typename                 |
| - manages unreadRoomIds: Set<string>                     |
| - manages roomListEvent for ChatRoomList                 |
| - manages incomingEventVersion + ref for ConversationView|
| - manages reconnectCounter                               |
| - manages activeRoomMembers for MemberListPanel          |
+----------------------------------------------------------+
      |                    |                    |
      v                    v                    v
+--------------+  +------------------+  +------------------+
| ChatRoomList |  | ConversationView |  | MemberListPanel  |
| - roomList   |  | - messages[]     |  | - members[]      |
|   Event      |  | - eventVersion   |  |   (from layout)  |
| - newRoom    |  | - getIncoming    |  |                  |
| - lastMsg    |  |   Event()        |  |                  |
|   Update     |  | - reconnect      |  |                  |
| - unreadRoom |  |   Counter        |  |                  |
|   Ids        |  |                  |  |                  |
+--------------+  +------------------+  +------------------+
      |                    |
      v                    v
+--------------+  +------------------+
| ChatRoomList |  | MessageList      |
| Item         |  | - scroll detect  |
| - hasUnread  |  | - new messages   |
|   dot        |  |   indicator      |
+--------------+  +------------------+
```

Event flow for a `ChatMessageSentEvent` targeting a non-active room:

```
1. WebSocket delivers event
2. useChatSubscription.onEvent fires
3. ChatLayout.handleChatEvent:
   a. setRoomListEvent({ type: "upsert", room: event.chatRoom })
   b. setUnreadRoomIds(prev => new Set(prev).add(roomId))
4. ChatRoomList processes "upsert": moves room to top with updated last message
5. ChatRoomListItem renders unread dot
```

Event flow for a `ChatMessageSentEvent` targeting the active room:

```
1. WebSocket delivers event
2. useChatSubscription.onEvent fires
3. ChatLayout.handleChatEvent:
   a. setRoomListEvent({ type: "upsert", room: event.chatRoom })
   b. incomingEventRef.current = event
   c. setIncomingEventVersion(v => v + 1)
4. ChatRoomList processes "upsert": updates last message preview
5. ConversationView effect fires (incomingEventVersion changed):
   a. Reads event via getIncomingEvent()
   b. Validates event.chatRoom.id === roomId (room switch guard)
   c. Checks for duplicate by message ID (self-event dedup)
   d. Inserts message sorted by createdDate
6. MessageList detects new message:
   a. If near bottom: auto-scrolls
   b. If scrolled up: shows "New messages" indicator
```

## 9. i18n Keys

Add to `messages/en.json` under the `chat` namespace:

```json
{
  "chat": {
    "newMessages": "New messages"
  }
}
```

## 10. shadcn/ui Components

No new shadcn/ui components need to be added. The feature uses:

- Existing `ScrollArea` (already used in `MessageList`)
- Native `button` element for the "New messages" indicator (styled with Tailwind, not a `Button` component, because it is a floating pill-style element that does not match the standard button variants)

## 11. Alternative Approaches Considered

### Single event prop vs. message array state lifting

**Considered:** Lifting the entire messages array state from `ConversationView` into `ChatLayout`, so `ChatLayout` can directly mutate it when events arrive.

**Rejected:** This would require `ChatLayout` to manage loading, pagination, and all message CRUD -- responsibilities that are well-encapsulated in `ConversationView`. The `incomingEvent` prop approach keeps the separation of concerns clean while allowing `ConversationView` to handle its own state.

### Separate callbacks per event type in the hook

**Considered:** Five separate callback props (`onMessageSent`, `onMessageUpdated`, etc.) instead of one `onEvent`.

**Rejected:** More refs to maintain, and the consumer needs to coordinate across event types anyway. The discriminated union approach is idiomatic TypeScript and keeps the hook interface simple.

### Using React context for event distribution

**Considered:** A `ChatEventContext` provider that child components subscribe to.

**Rejected:** Overengineered for this use case. `ChatLayout` is the only consumer of the hook, and it already passes props to its direct children. Context would add indirection without benefit.

### Optimistic updates for incoming messages with rollback

**Considered:** Immediately rendering WebSocket messages optimistically and rolling back if they fail validation.

**Rejected:** WebSocket events are already server-confirmed. There is no optimistic/pessimistic distinction for incoming events -- they are authoritative. The only "optimistic" path is the existing send flow (mutation response), and self-event dedup handles the overlap.

## 12. API Observations

The GraphQL schema is well-suited for this feature. A few notes:

1. The `chatRoom` field on every event type provides enough data to construct a full `ChatRoomListNode`, which simplifies room list updates. This is a good design choice in the schema.

2. The `ChatRoomMemberRemovedEvent` only includes `userId` (not a full `ChatRoomMember` object), which is sufficient since removal only needs an identifier.

3. There is no `ChatRoomUpdatedEvent` (e.g., for room rename). If group chat rename is added in the future, a new event type would be needed in the schema. This is correctly listed as out of scope.

4. The `chatEvents` subscription does not take any arguments (no room-specific filtering). The server handles authorization by only delivering events for rooms the user belongs to. This is the correct approach for a global chat subscription.

## 13. Design Review Fixes

The following issues were identified during adversarial review and have been incorporated into this design:

### Fix 1: Event Version Counter (Critical)
**Problem:** Passing `incomingEvent` as a prop and watching it in `useEffect` can fail when two events arrive in quick succession — React may not detect a dependency change if the same object reference is reused, or the effect may not re-fire for batched updates.

**Solution:** Use a version counter (`incomingEventVersion`) alongside a ref (`incomingEventRef`). The counter is a simple number that increments on every event, guaranteeing the `useEffect` fires. The event object is stored in a ref and read via a getter function, avoiding large object prop passing.

### Fix 2: Room Switch Race Condition (High)
**Problem:** If the user switches rooms while an event is being processed, `selectedRoomIdRef.current` could be stale (the ref updates in a `useEffect` which runs after render), causing an event for the old room to be dispatched to `ConversationView` which has already reset for the new room.

**Solution:** `ConversationView` validates `event.chatRoom.id === roomId` before processing any event. Events targeting a different room are silently skipped.

### Fix 3: Preserve Existing Optimistic Update Props (High)
**Problem:** The original design replaced `newRoom` and `lastMessageUpdate` props with `roomListEvent`, but these props are still produced by the create-room dialog and send-message handler for optimistic UI updates.

**Solution:** Keep `newRoom` and `lastMessageUpdate` props alongside the new `roomListEvent` prop. `ChatRoomList` processes all three independently. `roomListEvent` is used exclusively for WebSocket-driven updates.

### Fix 4: Self-Event Dedup in handleSend (Medium)
**Problem:** If the WebSocket `ChatMessageSentEvent` arrives before the `sendMessage` mutation response, the mutation response handler would add a duplicate message (dedup only existed in the WebSocket handler).

**Solution:** Add the same ID-based deduplication check to `handleSend` in `ConversationView`. Both paths now check `prev.some((edge) => edge.node.id === message.id)` before inserting.

### Fix 5: Member State Race — Accepted Limitation (Medium)
**Problem:** If a `ChatRoomMemberAddedEvent` arrives while `loadChatRoom` is in flight, the member update gets overwritten when `handleRoomLoaded` fires.

**Resolution:** Accepted as a non-issue. The server response from `loadChatRoom` will include the newly added member since the add event occurred before/during the fetch. The overwrite produces the correct final state.
