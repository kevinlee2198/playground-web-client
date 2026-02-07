# 0014 - CRUD Chat

## Overview

Add chat functionality to the Playground web client, allowing authenticated users to have 1-on-1 direct messages and group conversations with friends. This iteration covers CRUD operations only -- no real-time websocket support (that will be a separate follow-up feature).

## Scope

### In Scope

- Chat room list view with split-panel layout
- Conversation view with message history
- Create chat rooms (1-on-1 DMs and group chats)
- Send, edit, and delete text messages
- Reply to specific messages
- Add/remove chat room members
- Member list panel
- Navbar link to chat

### Out of Scope

- Real-time updates (websockets/subscriptions) -- separate feature
- Auto-polling or manual refresh button -- will come with websockets
- File and image messages (schema supports them but deferred)
- Role management (promote/demote members)
- Chat room renaming or deletion
- Read receipts / typing indicators
- Message search

---

## Functional Requirements

### FR-1: Authentication Guard

All chat pages and operations require authentication. If a user is not authenticated, redirect them to the sign-in flow.

### FR-2: Navigation

**FR-2.1:** Add a "Chat" link to the navbar. It should appear alongside the existing navigation items and link to `/chat`.

**FR-2.2:** The chat link should only be visible to authenticated users.

### FR-3: Chat Page Layout

**FR-3.1:** The chat page lives at the route `/{locale}/chat`. It uses a split-panel (Slack/Discord-style) layout:
- **Left panel:** Chat room list (sidebar)
- **Right panel:** Selected chat room conversation view

**FR-3.2:** The layout does NOT use the standard page layout with footer. The chat page should fill the available viewport height between the navbar and the bottom of the screen (no footer on this page).

**FR-3.3:** When no chat room is selected, the right panel shows an empty state with a prompt to select or create a conversation.

### FR-4: Chat Room List (Left Panel)

**FR-4.1:** Display the current user's chat rooms, fetched via the `chatRooms` query with cursor-based pagination.

**FR-4.2:** Each chat room list item displays:
- **Room name:** For DMs (exactly 2 members), display the other user's name (`firstName lastName`). For group chats (3+ members), display the `ChatRoom.name`.
- **Last message preview:** A truncated preview of the most recent message content. For deleted messages, show the "message deleted" placeholder text. For system messages, show the system message text.
- **Timestamp:** The `createdDate` of the most recent message, formatted as relative time (e.g., "2m ago", "1h ago", "Yesterday", "Jan 5").
- **Unread indicator:** A visual indicator (e.g., dot or badge) for rooms with unread messages. Note: the backend does not currently provide an unread count or read-status API. For now, this should be stubbed as a placeholder in the UI (always hidden), ready to be wired up when that API exists.

**FR-4.3:** Chat rooms are sorted by most recent message timestamp (most recent at top). The backend returns them in this order.

**FR-4.4:** Infinite scroll pagination -- load more chat rooms as the user scrolls down.

**FR-4.5:** The currently selected chat room should be visually highlighted in the list.

**FR-4.6:** A "New Chat" button at the top of the list panel to create a new chat room (see FR-6).

**FR-4.7:** When fetching the last message for preview, use `chatMessages(last: 1)` on each chat room.

### FR-5: Conversation View (Right Panel)

**FR-5.1:** Display the conversation header at the top with:
- Chat room name (same DM/group logic as FR-4.2)
- A button/icon to open the member list panel (see FR-8)

**FR-5.2:** Messages are displayed in chronological order (oldest at top, newest at bottom). The view should auto-scroll to the bottom on initial load.

**FR-5.3:** Load messages using `chatMessages(last: N)` to fetch the most recent N messages. Use `last: 25` as the default page size.

**FR-5.4:** Infinite scroll upward -- when the user scrolls to the top of the message list, load older messages using `before` cursor pagination. Maintain scroll position when older messages are prepended.

**FR-5.5:** Each message displays:
- Sender's name (`firstName lastName`)
- Message content (for `TextChatMessage`)
- Timestamp (`createdDate`), formatted as time for today's messages and date+time for older messages
- An "(edited)" indicator if `updatedDate` is present and `deletedDate` is not present
- For deleted messages (`deletedDate` is present): show "This message was deleted" in italicized/muted styling instead of content
- System messages (`isSystemMessage: true`): show in a distinct centered/muted style

**FR-5.6:** Reply-to display: If a message has a `replyTo` field, show an inline preview above the message bubble containing:
- The original sender's name
- A truncated preview of the original message content
- Clicking the reply preview scrolls to the original message (if it is loaded in the current view)

**FR-5.7:** Message input area at the bottom of the conversation:
- A text input field for composing messages
- Send button (and Enter key to send, Shift+Enter for newline)
- When replying to a message, show a reply preview bar above the input with a dismiss button

**FR-5.8:** Messages sent by the current user should be visually distinct from messages sent by others (e.g., aligned right vs. left, different background color).

**FR-5.9:** Consecutive messages from the same user should be visually grouped — show the sender name and avatar only on the first message in a group, with subsequent messages displayed as compact bubbles without repeating the name/avatar.

### FR-6: Create Chat Room

**FR-6.1:** Triggered by the "New Chat" button (FR-4.5). Opens a dialog/modal.

**FR-6.2:** The dialog shows a friend selector. Friends are fetched via the `friendships` query with `status: ACCEPTED`. Display friends as a searchable/filterable list with checkboxes.

**FR-6.3:** DM vs. Group Chat behavior:
- **1 friend selected:** First, call `directMessageChatRoom(userId)` to check if a DM already exists. If it does, navigate directly to it (skip creation). If not, create via `createChatRoom` with `isDirectMessage: true`. The `name` field should be auto-generated as "DM - {currentUserName}, {friendName}" (or similar backend-friendly format). No name input is shown to the user.
- **2+ friends selected:** Creates a group chat. A "Group Name" text input field is shown and required. Set `isDirectMessage: false` in the input (or omit, defaulting to false).

**FR-6.4:** The `userIds` array sent to `createChatRoom` should include only the selected friend IDs (the backend automatically adds the current user).

**FR-6.5:** After successful creation (or existing DM lookup), navigate to the chat room (select it in the list and show the conversation view).

**FR-6.6:** If the user has no friends, the dialog should display a message indicating they need to add friends first.

### FR-6B: Message from User Profile

**FR-6B.1:** When viewing a friend's profile (friendship status `ACCEPTED`), show a "Message" button alongside the existing friend actions in `FriendActions` component (`src/components/profile/friend-actions.tsx`).

**FR-6B.2:** Clicking the button calls `directMessageChatRoom(userId)`. If a DM exists, navigate to `/chat` with that room selected. If not, create one via `createChatRoom` with `isDirectMessage: true`, then navigate.

---

### FR-7: Message Operations

**FR-7.1: Send Message**
- Use `sendChatMessage` mutation with `textMessage: { chatRoomId, content, replyToId? }`.
- After sending, append the message to the conversation view and scroll to the bottom.
- Clear the input field and dismiss any reply preview.

**FR-7.2: Edit Message**
- Users can edit their own messages only.
- Triggered by an action menu (e.g., hover or right-click context menu on the message) with an "Edit" option.
- When editing, replace the message content area with an inline text input pre-filled with the current content, with Save/Cancel buttons.
- Use `updateChatMessage` mutation with `textMessage: { id, content }`.
- After saving, update the message in place and show the "(edited)" indicator.

**FR-7.3: Delete Message**
- Users can delete their own messages.
- OWNER and ADMIN role members can delete any message in the chat room.
- Triggered by the same action menu with a "Delete" option.
- Show a confirmation dialog before deleting.
- Use `deleteChatMessage` mutation with `{ id }`.
- After deletion, replace the message content with the "This message was deleted" placeholder.

**FR-7.4: Reply to Message**
- Triggered by the action menu with a "Reply" option.
- Sets the reply context in the message input area (FR-5.7).
- Sends `replyToId` with the message.

### FR-8: Member Management

**FR-8.1:** A member list panel (drawer or side panel) accessible from the conversation header (FR-5.1).

**FR-8.2:** The member list displays each member with:
- Name (`firstName lastName`)
- Role badge (OWNER, ADMIN, or MEMBER)
- Join date

**FR-8.3: Add Member (group chats only)**
- An "Add Member" button in the member list panel.
- Opens a friend selector (same as FR-6.2) filtered to exclude current members.
- Uses `addChatRoomMember` mutation. Any member can add new members.
- Only shows when `isDirectMessage` is `false`. Hidden for DMs.

**FR-8.4: Remove Member (group chats only)**
- A "Remove" action on each member in the list.
- Any member can remove any other member (per current requirements -- may change in the future).
- Users cannot remove themselves (they should use a "Leave" action instead, if implemented later).
- Uses `removeChatRoomMember` mutation.
- Only shows when `isDirectMessage` is `false`. Hidden for DMs.
- Show a confirmation dialog before removing.

**FR-8.5:** When a member is added or removed, the member list should update immediately in the UI.

---

## DM vs. Group Chat Detection

The backend schema includes an `isDirectMessage: Boolean!` field on `ChatRoom`, set at creation time and immutable. The frontend uses this field as the source of truth:

| `isDirectMessage` | Type | Display Name | Add/Remove Members |
|---|---|---|---|
| `true` | DM | Other user's `firstName lastName` | Not allowed (backend enforces) |
| `false` | Group Chat | `ChatRoom.name` | Allowed |

**Backend enforcement:**
- DM rooms always have exactly 2 members. The backend blocks `addChatRoomMember` and `removeChatRoomMember` mutations on DM rooms.
- The backend prevents duplicate DM rooms between the same two users (returns existing room or errors on duplicate creation).

---

## Error Handling

**ERR-1:** Display toast notifications for mutation errors (send, edit, delete, add/remove member, create room) using the existing Sonner `<Toaster>` component.

**ERR-2:** Display an error state in the conversation view if the `chatRoom` query fails (e.g., room not found, permission denied).

**ERR-3:** Display an error state in the chat room list if the `chatRooms` query fails.

---

## Security

- All chat queries and mutations use `authQuery` / `authMutate` (authenticated GraphQL calls).
- The chat page route should redirect unauthenticated users.
- Delete permissions: users can delete their own messages; OWNER/ADMIN can delete any message. The frontend should only show the delete option when the user has permission. The backend enforces this as well.

---

## i18n

All user-facing strings must use translation keys under a new `chat` namespace in `messages/en.json`. Suggested key structure:

```json
{
  "chat": {
    "title": "Chat",
    "newChat": "New Chat",
    "noConversation": "Select a conversation or start a new one",
    "noRooms": "No conversations yet",
    "createFirst": "Start a conversation with a friend",
    "noFriends": "You need to add friends before you can start a conversation",
    "groupName": "Group Name",
    "groupNameRequired": "Group name is required",
    "searchFriends": "Search friends...",
    "selectedCount": "{count, plural, one {# friend} other {# friends}} selected",
    "createRoom": "Create",
    "message": {
      "placeholder": "Type a message...",
      "send": "Send",
      "edit": "Edit",
      "delete": "Delete",
      "reply": "Reply",
      "edited": "(edited)",
      "deleted": "This message was deleted",
      "editMessage": "Edit Message",
      "save": "Save",
      "cancel": "Cancel"
    },
    "members": {
      "title": "Members",
      "add": "Add Member",
      "remove": "Remove",
      "removeConfirm": "Are you sure you want to remove {name} from this chat?",
      "owner": "Owner",
      "admin": "Admin",
      "member": "Member",
      "joined": "Joined {date}"
    },
    "deleteConfirm": {
      "title": "Delete Message",
      "description": "Are you sure you want to delete this message? This action cannot be undone.",
      "confirm": "Delete",
      "cancel": "Cancel"
    },
    "errors": {
      "loadRooms": "Failed to load conversations",
      "loadMessages": "Failed to load messages",
      "sendMessage": "Failed to send message",
      "editMessage": "Failed to edit message",
      "deleteMessage": "Failed to delete message",
      "createRoom": "Failed to create conversation",
      "addMember": "Failed to add member",
      "removeMember": "Failed to remove member",
      "roomNotFound": "Conversation not found"
    },
    "time": {
      "justNow": "Just now",
      "minutesAgo": "{count}m ago",
      "hoursAgo": "{count}h ago",
      "yesterday": "Yesterday"
    }
  }
}
```

---

## GraphQL Operations Reference

### Queries

| Operation | Query | Pagination | Notes |
|---|---|---|---|
| List user's chat rooms | `chatRooms(first, after)` | Forward cursor, infinite scroll | Include `chatMessages(last: 1)` for preview |
| Get single chat room | `chatRoom(id)` | -- | Fetch on room selection |
| Get existing DM room | `directMessageChatRoom(userId)` | -- | Returns null if no DM exists; use before creating a DM |
| Get messages | `chatRoom.chatMessages(last, before)` | Backward cursor (newest first load, scroll up for older) | `last: 25` default page size |
| Get members | `chatRoom.members(first, after)` | Forward cursor | For member list panel |
| Get friends | `friendships(input: { status: ACCEPTED })` | Forward cursor | For friend selector in create room / add member |

### Mutations

| Operation | Mutation | Input |
|---|---|---|
| Create chat room | `createChatRoom` | `{ name, isDirectMessage, userIds }` |
| Send message | `sendChatMessage` | `{ textMessage: { chatRoomId, content, replyToId? } }` |
| Edit message | `updateChatMessage` | `{ textMessage: { id, content } }` |
| Delete message | `deleteChatMessage` | `{ id }` |
| Add member | `addChatRoomMember` | `{ chatRoomId, userId }` |
| Remove member | `removeChatRoomMember` | `{ chatRoomId, userId }` |

---

## UI Components (Anticipated)

These are the expected new components. The design agent will finalize the component tree.

- `ChatPage` -- top-level page component at `/{locale}/chat`
- `ChatLayout` -- split-panel layout (sidebar + conversation)
- `ChatRoomList` -- scrollable list of chat rooms
- `ChatRoomListItem` -- individual room in the list
- `ConversationView` -- message display + input area
- `MessageList` -- scrollable message container with infinite scroll
- `MessageBubble` -- individual message with actions
- `MessageInput` -- text input with send/reply functionality
- `ReplyPreview` -- inline reply preview (in message bubble and input area)
- `CreateChatRoomDialog` -- modal for creating new chat rooms
- `FriendSelector` -- searchable checkbox list of friends
- `MemberListPanel` -- drawer/panel showing chat room members
- `DeleteMessageDialog` -- confirmation dialog for message deletion
- `RemoveMemberDialog` -- confirmation dialog for member removal
