# Requirements: Live Chat WebSocket Support

## Overview

Add real-time live chat by subscribing to the `chatEvents` GraphQL subscription over the existing singleton WebSocket client. When chat events arrive (messages sent, updated, deleted; members added, removed), the UI updates immediately without requiring manual refresh. This builds on the existing WebSocket infrastructure established by the notification subscription feature (singleton client in `src/lib/graphql-ws-client.ts`, hook pattern in `src/hooks/use-notification-subscription.ts`).

## Functional Requirements

### 1. Chat Subscription Hook

1.1. Create a custom React hook `useChatSubscription` in `src/hooks/use-chat-subscription.ts` that subscribes to the `chatEvents` GraphQL subscription.

1.2. The hook must reuse the existing singleton WebSocket client from `src/lib/graphql-ws-client.ts` via `getGraphQLWsClient()`, sharing the same connection used by the notification subscription.

1.3. The hook must follow the same pattern as `useNotificationSubscription`: use refs for callbacks to avoid re-subscriptions, distinguish first connection from reconnection, and clean up on unmount.

1.4. The hook must only be active when the user is authenticated (`enabled` flag, same as the notification hook).

1.5. The subscription query must request all 5 event types using inline fragments on `ChatEvent`:
  - `ChatMessageSentEvent` -- includes `chatRoom` and `chatMessage`
  - `ChatMessageUpdatedEvent` -- includes `chatRoom` and `chatMessage`
  - `ChatMessageDeletedEvent` -- includes `chatRoom` and `chatMessage`
  - `ChatRoomMemberAddedEvent` -- includes `chatRoom` and `member`
  - `ChatRoomMemberRemovedEvent` -- includes `chatRoom` and `userId`

1.6. The `chatRoom` field in each event must include enough data to construct a `ChatRoomListNode` (id, `__typename`, name for group chats, members with user info, and last message). The `chatMessage` field must include enough data to construct a `ChatMessageNode` (all fields currently selected by `chatMessageNodeSelection` in `src/app/[locale]/chat/actions.ts`).

1.7. The hook must provide separate callbacks for each event type so the consuming component can handle them independently.

1.8. The hook must provide an `onReconnect` callback that fires when the WebSocket reconnects after a disconnection (not on first connection).

### 2. Active Conversation -- Message Events

2.1. When a `ChatMessageSentEvent` is received for the currently viewed room, the new message must be inserted into the message list sorted by `createdDate` (not simply appended, to handle out-of-order delivery).

2.2. Self-event deduplication: if a message with the same `id` already exists in the message list (from the optimistic update after the user sent it), the WebSocket event must be skipped. Do not add a duplicate.

2.3. When a `ChatMessageUpdatedEvent` is received for the currently viewed room, the existing message in the list must be updated in place with the new content and `updatedDate`.

2.4. When a `ChatMessageDeletedEvent` is received for the currently viewed room, the existing message in the list must be updated in place with the `deletedDate` set (marking it as deleted, matching the existing soft-delete display pattern).

2.5. For updated and deleted events, self-event deduplication applies: if the message already reflects the change (e.g., the current user just edited or deleted it via optimistic update), the event should still be applied since it replaces the optimistic local values with the authoritative server values. Matching by `id` and applying the server data is sufficient.

### 3. Active Conversation -- Scroll Behavior

3.1. The existing `MessageList` component already auto-scrolls to the bottom when new messages arrive and the user is near the bottom (within 100px). This behavior must continue to work for WebSocket-delivered messages.

3.2. When the user has scrolled up (more than 100px from the bottom) and a new message arrives, a "new messages" indicator must appear. This is a clickable element that, when clicked, scrolls the user to the bottom of the message list.

3.3. The "new messages" indicator must disappear when the user scrolls back to the bottom (within 100px of the bottom).

3.4. The "new messages" indicator text must use a translation key under the `chat` namespace (e.g., `chat.newMessages`).

### 4. Room List -- Message Events for Non-Active Rooms

4.1. When a `ChatMessageSentEvent` is received for a room that is NOT currently selected, the room list must update that room's last message preview with the new message content and timestamp.

4.2. The room must be moved to the top of the room list when a new message arrives for it.

4.3. An unread dot indicator must appear on the room list item for any room that has received new messages while it was not selected. This is a simple dot (not a count badge).

4.4. The unread dot must be cleared when the user selects (clicks on) that room.

4.5. For message updated and deleted events on non-active rooms: if the affected message is the room's current last message preview, update the preview content accordingly.

### 5. New Room Appearance

5.1. When a `ChatRoomMemberAddedEvent` is received where the added member is the current user, and the room does not already exist in the room list, the room must be added to the top of the room list using the `chatRoom` data from the event.

5.2. The new room must appear with an unread dot indicator.

5.3. When a `ChatRoomMemberAddedEvent` is received for a room the user is currently viewing, the member list in the `MemberListPanel` must update to include the new member (if the panel is open or when it is next opened).

### 6. Member Removed Events

6.1. When a `ChatRoomMemberRemovedEvent` is received where the removed `userId` is the current user, the room must be removed from the room list. If the user is currently viewing that room, they must be redirected to no room selected (empty state).

6.2. When a `ChatRoomMemberRemovedEvent` is received for a room the user is currently viewing (and the removed user is not the current user), the member list in the `MemberListPanel` must update to remove that member.

6.3. Member added and removed events are typically followed by a system message event from the backend. The system message will be handled by the standard `ChatMessageSentEvent` flow (requirement 2.1).

### 7. Reconnection Catch-Up

7.1. When the WebSocket reconnects after a disconnection, the following data must be re-fetched to catch up on missed events:
  - The room list (first page, same as initial load)
  - Messages for the currently active room (if one is selected)

7.2. Re-fetched data must replace the current local state entirely (not merge), since the disconnect gap makes incremental updates unreliable.

### 8. Integration Point

8.1. The `useChatSubscription` hook must be consumed in the `ChatLayout` component, which already manages room list state, selected room, and coordinates between child components.

8.2. `ChatLayout` must pass WebSocket-delivered message events down to `ConversationView` for the active room. This can be done via a callback prop or by lifting the message event handling into `ChatLayout` and passing updated state down.

8.3. The subscription must be established when `ChatLayout` mounts and torn down when it unmounts. It must not persist outside the chat page.

## Non-Functional Requirements

### NFR-1: Security

- The user must be authenticated to receive chat events. The existing WebSocket client already handles token injection via `connectionParams`.
- The subscription only delivers events for rooms the authenticated user is a member of (enforced server-side).

### NFR-2: Performance

- The existing singleton WebSocket client is shared with the notification subscription. No additional WebSocket connections are created.
- Event handlers must not trigger unnecessary re-renders. Use refs for callbacks (matching the notification hook pattern) and stable state update functions.

### NFR-3: i18n

New translation keys required under the `chat` namespace in `messages/en.json`:

| Key | English Value | Purpose |
|---|---|---|
| `chat.newMessages` | `"New messages"` | Indicator shown when new messages arrive while scrolled up |

### NFR-4: Error Handling

- WebSocket errors must be logged to the console (matching existing behavior in `graphql-ws-client.ts`).
- If event data is malformed or missing expected fields, the event must be silently skipped with a console warning. It must not crash the UI.

## Out of Scope

- **Typing indicators**: The backend schema does not include typing events.
- **Online presence**: The backend schema does not include presence events.
- **Sound effects**: No audio notifications for incoming messages.
- **Browser notifications**: No desktop/push notifications for chat messages.
- **Unread count badge**: Only a simple unread dot is shown, not a numeric count.
- **Message read receipts**: No tracking of which messages other users have read.
- **Chat room rename/update events**: The backend schema does not include room metadata change events.
- **Media message sending via WebSocket**: Media messages continue to use the existing upload + mutation flow. The WebSocket only receives events.

## Affected Files

### New Files

| File | Purpose |
|---|---|
| `src/hooks/use-chat-subscription.ts` | Custom hook managing the `chatEvents` subscription lifecycle |
| `src/lib/types/chat-event.ts` | TypeScript types for all 5 chat event types |

### Modified Files

| File | Change |
|---|---|
| `src/components/chat/chat-layout.tsx` | Integrate `useChatSubscription`, manage unread state, handle all event types, pass events to child components |
| `src/components/chat/chat-room-list.tsx` | Accept and display unread dot state, handle room reordering from events |
| `src/components/chat/chat-room-list-item.tsx` | Render unread dot indicator |
| `src/components/chat/conversation-view.tsx` | Accept and process incoming WebSocket message events (insert, update, delete) |
| `src/components/chat/message-list.tsx` | Add "new messages" indicator when scrolled up and new messages arrive |
| `messages/en.json` | Add `chat.newMessages` translation key |
