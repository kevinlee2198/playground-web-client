# 0014 - CRUD Chat: Technical Design

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [File Structure](#file-structure)
3. [TypeScript Types](#typescript-types)
4. [GraphQL Operations](#graphql-operations)
5. [Server Actions](#server-actions)
6. [Component Hierarchy and Data Flow](#component-hierarchy-and-data-flow)
7. [State Management](#state-management)
8. [Infinite Scroll Strategy](#infinite-scroll-strategy)
9. [Message Grouping](#message-grouping)
10. [Layout Approach](#layout-approach)
11. [Integration Points](#integration-points)
12. [i18n Keys](#i18n-keys)
13. [shadcn/ui Components](#shadcnui-components)
14. [Alternative Approaches and Trade-offs](#alternative-approaches-and-trade-offs)
15. [Schema Observations](#schema-observations)

---

## Architecture Overview

The chat feature is a client-heavy, interactive feature. The page at `/{locale}/chat` uses a server component for the initial page shell (auth guard, initial data fetch for chat room list) and delegates all interactive behavior to client components.

The chat page opts out of the default layout footer. Since the root layout in `src/app/[locale]/layout.tsx` renders `<Footer />` unconditionally, the chat page needs a layout override. The cleanest approach is to use a Next.js route group or a chat-specific layout that hides the footer. However, the simplest solution without restructuring is to use a CSS approach: the chat page renders a full-height container that visually replaces the normal content flow. The footer will still render in the DOM but the chat page will fill the viewport using `h-[calc(100vh-4rem)]` (accounting for the 4rem/h-16 navbar height) with `overflow-hidden`, making the footer unreachable.

**Better approach**: Create a `src/app/[locale]/chat/layout.tsx` that wraps children without a footer, and hide the root layout's footer using CSS on the chat route. Since we cannot conditionally render in the root layout without making it a client component (which we should avoid), we will apply a CSS class to the chat page's main container that sets it to fill the remaining viewport, and the footer will naturally be pushed out of view. The `flex-1` on `<main>` in the root layout already makes this work -- we just need the chat page content to consume all available space.

**Selected approach**: The chat page server component renders a full-height flex container. The root layout has `min-h-screen flex flex-col` on body, `flex-1` on main. The chat page will set its content to `h-[calc(100vh-4rem)] overflow-hidden` which fills the viewport minus the navbar. The footer exists in the DOM below but is not visible since the content does not scroll.

---

## File Structure

### New Files

```
src/app/[locale]/chat/
  page.tsx                          # Server component: auth guard, initial chat rooms fetch
  actions.ts                        # Server actions for all chat mutations + data loading

src/lib/types/
  chat.ts                           # TypeScript types for chat domain

src/components/chat/
  chat-layout.tsx                   # Client: split-panel layout (sidebar + conversation)
  chat-room-list.tsx                # Client: scrollable list of chat rooms with infinite scroll
  chat-room-list-item.tsx           # Client: single chat room entry in the list
  conversation-view.tsx             # Client: message list + input + header
  conversation-header.tsx           # Client: room name + member list toggle
  message-list.tsx                  # Client: scrollable message container with reverse infinite scroll
  message-bubble.tsx                # Client: single message with actions
  message-input.tsx                 # Client: text input with send/reply
  reply-preview.tsx                 # Client: inline reply preview (used in both bubble and input)
  message-actions-menu.tsx          # Client: dropdown menu for edit/delete/reply
  create-chat-room-dialog.tsx       # Client: dialog for creating new chat rooms
  friend-selector.tsx               # Client: searchable checkbox list of friends
  member-list-panel.tsx             # Client: sheet panel showing members
  delete-message-dialog.tsx         # Client: confirmation dialog for message deletion
  remove-member-dialog.tsx          # Client: confirmation dialog for member removal
  message-button.tsx                # Client: "Message" button for profile page (FR-6B)
```

### Modified Files

```
src/components/playground/navbar-auth-links.tsx   # Add "Chat" nav link
src/components/profile/profile-header.tsx         # Wire up Message button to navigate to chat
src/lib/constants.ts                              # Add ChatRoomRole enum
messages/en.json                                  # Add chat i18n keys
```

---

## TypeScript Types

File: `src/lib/types/chat.ts`

```typescript
/** A user reference as returned in chat-related queries */
export interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
}

/** A chat message as returned from queries */
export interface ChatMessageNode {
  id: string;
  user: ChatUser;
  content: string | null; // null when deleted
  createdDate: string;
  updatedDate: string | null;
  deletedDate: string | null;
  isSystemMessage: boolean;
  replyTo: ChatMessageReplyTo | null;
}

/** Minimal reply-to reference */
export interface ChatMessageReplyTo {
  id: string;
  user: ChatUser;
  content: string | null;
}

/** A chat room member */
export interface ChatRoomMemberNode {
  id: string;
  user: ChatUser;
  role: ChatRoomRole;
  joinedDate: string;
}

/** A chat room as returned from the list query */
export interface ChatRoomListNode {
  id: string;
  name: string;
  isDirectMessage: boolean;
  createdDate: string;
  members: {
    edges: { node: { user: ChatUser } }[];
  };
  chatMessages: {
    edges: { node: ChatMessageNode }[];
  };
}

/** A chat room as returned from the detail query */
export interface ChatRoomDetailNode {
  id: string;
  name: string;
  isDirectMessage: boolean;
  createdDate: string;
  members: {
    edges: { cursor: string; node: ChatRoomMemberNode }[];
    pageInfo: import("@/lib/graphql-connection").PageInfo;
  };
}

/** A friendship edge for the friend selector */
export interface FriendshipNode {
  id: string;
  requester: ChatUser;
  addressee: ChatUser;
  status: string;
}

/** Friend item derived from a friendship for easier consumption */
export interface FriendItem {
  userId: string;
  firstName: string;
  lastName: string;
}

export type ChatRoomRole = "OWNER" | "ADMIN" | "MEMBER";
```

Add to `src/lib/constants.ts`:

```typescript
export enum ChatRoomRole {
  OWNER = "OWNER",
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}
```

---

## GraphQL Operations

All queries use `json-to-graphql-query` object format, matching the existing codebase patterns.

### Query: Chat Room List (with last message preview)

```typescript
const chatRoomsQuery = (first: number, after?: string) => ({
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
              content: true,
              createdDate: true,
              deletedDate: true,
              isSystemMessage: true,
              user: {
                id: true,
                firstName: true,
                lastName: true,
              },
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
```

### Query: Chat Room Detail (for conversation view)

```typescript
const chatRoomDetailQuery = (id: string) => ({
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
```

### Query: Chat Messages (backward pagination)

```typescript
const chatMessagesQuery = (chatRoomId: string, last: number, before?: string) => ({
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
          content: true,
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
            content: true,
            user: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      },
      pageInfo: {
        hasPreviousPage: true,
        startCursor: true,
      },
    },
  },
});
```

### Query: Direct Message Chat Room

```typescript
const directMessageChatRoomQuery = (userId: string) => ({
  directMessageChatRoom: {
    __args: { userId },
    id: true,
    name: true,
    isDirectMessage: true,
  },
});
```

### Query: Friendships (for friend selector)

```typescript
const friendshipsQuery = (first: number, after?: string) => ({
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
```

### Mutation: Create Chat Room

```typescript
const createChatRoomMutation = (name: string, userIds: string[], isDirectMessage: boolean) => ({
  createChatRoom: {
    __args: {
      input: { name, userIds, isDirectMessage },
    },
    chatRoom: {
      id: true,
      name: true,
      isDirectMessage: true,
      createdDate: true,
    },
  },
});
```

### Mutation: Send Chat Message

```typescript
const sendChatMessageMutation = (chatRoomId: string, content: string, replyToId?: string) => ({
  sendChatMessage: {
    __args: {
      input: {
        textMessage: {
          chatRoomId,
          content,
          ...(replyToId ? { replyToId } : {}),
        },
      },
    },
    chatMessage: {
      id: true,
      content: true,
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
        content: true,
        user: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
    },
  },
});
```

### Mutation: Update Chat Message

```typescript
const updateChatMessageMutation = (id: string, content: string) => ({
  updateChatMessage: {
    __args: {
      input: {
        textMessage: { id, content },
      },
    },
    chatMessage: {
      id: true,
      content: true,
      updatedDate: true,
    },
  },
});
```

### Mutation: Delete Chat Message

```typescript
const deleteChatMessageMutation = (id: string) => ({
  deleteChatMessage: {
    __args: {
      input: { id },
    },
    id: true,
  },
});
```

### Mutation: Add Chat Room Member

```typescript
const addChatRoomMemberMutation = (chatRoomId: string, userId: string) => ({
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
```

### Mutation: Remove Chat Room Member

```typescript
const removeChatRoomMemberMutation = (chatRoomId: string, userId: string) => ({
  removeChatRoomMember: {
    __args: {
      input: { chatRoomId, userId },
    },
    chatRoomId: true,
    userId: true,
  },
});
```

---

## Server Actions

File: `src/app/[locale]/chat/actions.ts`

All server actions follow the established pattern: `"use server"` directive, use `authQuery`/`authMutate`, return `{ success: boolean; data?: T; error?: string }`.

```typescript
"use server";

// Action signatures:
export async function loadChatRooms(first: number, after?: string)
  // Returns: { edges, pageInfo } | null

export async function loadChatRoom(id: string)
  // Returns: ChatRoomDetailNode | null

export async function loadMessages(chatRoomId: string, last: number, before?: string)
  // Returns: { edges, pageInfo } | null

export async function loadFriendships(first: number, after?: string)
  // Returns: { edges, pageInfo } | null

export async function findDirectMessageRoom(userId: string)
  // Returns: { id, name, isDirectMessage } | null

export async function createChatRoom(name: string, userIds: string[], isDirectMessage: boolean)
  // Returns: { success: boolean; chatRoom?: { id, name, isDirectMessage }; error?: string }

export async function sendMessage(chatRoomId: string, content: string, replyToId?: string)
  // Returns: { success: boolean; message?: ChatMessageNode; error?: string }

export async function updateMessage(id: string, content: string)
  // Returns: { success: boolean; error?: string }

export async function deleteMessage(id: string)
  // Returns: { success: boolean; error?: string }

export async function addMember(chatRoomId: string, userId: string)
  // Returns: { success: boolean; member?: ChatRoomMemberNode; error?: string }

export async function removeMember(chatRoomId: string, userId: string)
  // Returns: { success: boolean; error?: string }
```

---

## Component Hierarchy and Data Flow

```
page.tsx (Server Component)
  |-- Auth guard: redirect if not authenticated
  |-- Fetches: current user (me query), initial chat rooms (first: 20)
  |-- Renders: ChatLayout (Client)
      |
      |-- ChatLayout (Client Component)
      |   Props: { initialChatRooms, currentUser }
      |   State: selectedRoomId, memberPanelOpen
      |
      |-- LEFT PANEL: ChatRoomList
      |   |   Props: { rooms, selectedRoomId, onSelectRoom, currentUserId }
      |   |   State: rooms[], pageInfo (for infinite scroll)
      |   |
      |   |-- "New Chat" Button --> CreateChatRoomDialog
      |   |   |-- FriendSelector
      |   |   |   Props: { onSelectionChange, excludeUserIds? }
      |   |   |   State: friends[], selectedIds, searchFilter, pageInfo
      |   |   |
      |   |   |-- Group name input (conditional, 2+ selected)
      |   |
      |   |-- ChatRoomListItem (one per room)
      |       Props: { room, isSelected, currentUserId, onClick }
      |
      |-- RIGHT PANEL: ConversationView (or empty state)
          |   Props: { roomId, currentUser }
          |   State: room detail, messages[], pageInfo, replyTo
          |
          |-- ConversationHeader
          |   Props: { room, currentUserId, onToggleMembers }
          |
          |-- MessageList
          |   |   Props: { messages, currentUserId, onReply, onEdit, onDelete, onScrollTop }
          |   |   Handles: reverse infinite scroll, message grouping, auto-scroll
          |   |
          |   |-- MessageBubble (one per message)
          |   |   Props: { message, isOwn, showSender, currentUserRole, onReply, onEdit, onDelete, onScrollToMessage }
          |   |   |-- ReplyPreview (if replyTo exists)
          |   |   |-- MessageActionsMenu (hover/click)
          |   |       |-- Reply, Edit (own only), Delete (own or admin/owner)
          |   |
          |   |-- DeleteMessageDialog
          |       Props: { messageId, open, onOpenChange, onConfirm }
          |
          |-- MessageInput
              Props: { onSend, replyTo, onClearReply }
              State: content, isSubmitting
              |-- ReplyPreview (if replying)

      |-- MemberListPanel (Sheet, side panel)
          Props: { room, members, currentUserId, isDirectMessage, onAddMember, onRemoveMember }
          |-- Member list items
          |-- "Add Member" button (group only) --> FriendSelector in a sub-dialog
          |-- RemoveMemberDialog
```

### Data Flow Details

1. **Initial Load (Server)**:
   - `page.tsx` fetches `me` (current user) and `chatRooms(first: 20)` with last message preview
   - Passes data to `ChatLayout` as props

2. **Room Selection (Client)**:
   - User clicks a room in `ChatRoomList`
   - `ChatLayout` sets `selectedRoomId` in state
   - `ConversationView` receives the `roomId` prop, calls `loadChatRoom(id)` and `loadMessages(id, 25)` server actions
   - Results stored in `ConversationView` local state

3. **Sending Messages (Client)**:
   - `MessageInput` calls `sendMessage` server action
   - On success, appends the returned message to the local messages array
   - Updates the corresponding room's last message preview in `ChatRoomList`

4. **Infinite Scroll - Room List (Client)**:
   - `ChatRoomList` uses IntersectionObserver at the bottom
   - Calls `loadChatRooms(20, endCursor)` server action
   - Appends new edges to local state

5. **Infinite Scroll - Messages (Client)**:
   - `MessageList` uses IntersectionObserver at the top (sentinel element)
   - Calls `loadMessages(roomId, 25, startCursor)` server action
   - Prepends new edges to local state, preserves scroll position

6. **Message from Profile (Client)**:
   - `MessageButton` on profile calls `findDirectMessageRoom(userId)` server action
   - If room exists, navigates to `/chat?room={roomId}`
   - If not, calls `createChatRoom(...)`, then navigates

---

## State Management

All state is managed with React `useState` and `useTransition`. No external state management library is needed.

### ChatLayout State

```typescript
const [selectedRoomId, setSelectedRoomId] = useState<string | null>(initialRoomId);
const [memberPanelOpen, setMemberPanelOpen] = useState(false);
```

`initialRoomId` comes from the URL search param `?room=<id>` (parsed in the server component and passed down). This allows linking directly to a chat room from the profile page.

### ChatRoomList State

```typescript
const [rooms, setRooms] = useState<Edge<ChatRoomListNode>[]>(initialRooms);
const [pageInfo, setPageInfo] = useState<PageInfo>(initialPageInfo);
```

Provides a callback `updateRoomLastMessage(roomId, message)` to allow `ConversationView` to update the sidebar preview when a message is sent.

### ConversationView State

```typescript
const [room, setRoom] = useState<ChatRoomDetailNode | null>(null);
const [messages, setMessages] = useState<Edge<ChatMessageNode>[]>([]);
const [messagesPageInfo, setMessagesPageInfo] = useState<PageInfo | null>(null);
const [replyTo, setReplyTo] = useState<ChatMessageNode | null>(null);
const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
```

When `roomId` prop changes (user selects a different room), reset all state and fetch fresh data.

### URL State

The selected room ID is synced to the URL as a search parameter `?room=<id>` using `useRouter().replace()`. This enables:
- Deep linking from profile page Message button
- Browser back/forward navigation between rooms
- Shareable URLs

---

## Infinite Scroll Strategy

### Chat Room List (Forward Pagination - Scroll Down)

Same pattern as `GameInfiniteList`:
- Uses `IntersectionObserver` on a sentinel `<div>` at the bottom of the list
- Calls `loadChatRooms(20, endCursor)` when sentinel enters viewport
- `rootMargin: "100px"` for pre-fetching
- `hasNextPage` from `pageInfo` guards against unnecessary requests

### Message List (Backward Pagination - Scroll Up)

This is more complex because we load the newest messages first and paginate backward:

1. **Initial load**: Fetch `chatMessages(last: 25)` -- returns the 25 most recent messages
2. **Sentinel at top**: An `IntersectionObserver` watches a sentinel `<div>` at the top of the message list
3. **Load older**: When sentinel enters viewport and `hasPreviousPage` is true, call `loadMessages(roomId, 25, startCursor)`
4. **Scroll position preservation**: Before prepending messages, record `scrollHeight`. After state update and re-render, calculate the new `scrollHeight` difference and set `scrollTop` to maintain the user's view position. Use `useLayoutEffect` (or `requestAnimationFrame`) for this.
5. **Auto-scroll to bottom**: On initial load and when the current user sends a new message, scroll to the bottom of the message list.

```typescript
// Scroll position preservation pseudocode
// Get the ScrollArea viewport element for scroll control
const scrollAreaRef = useRef<HTMLDivElement>(null);
const getViewport = () =>
  scrollAreaRef.current?.querySelector<HTMLDivElement>('[data-slot="scroll-area-viewport"]');

function prependMessages(newEdges: Edge<ChatMessageNode>[]) {
  const viewport = getViewport();
  if (!viewport) return;

  const previousScrollHeight = viewport.scrollHeight;

  setMessages(prev => [...newEdges, ...prev]);

  // After React re-render, restore scroll position
  requestAnimationFrame(() => {
    const newScrollHeight = viewport.scrollHeight;
    viewport.scrollTop = newScrollHeight - previousScrollHeight;
  });
}
```

---

## Message Grouping

Messages from the same user sent consecutively (without another user's message in between) are visually grouped. The grouping logic is computed during render, not stored in state.

```typescript
function shouldShowSender(messages: ChatMessageNode[], index: number): boolean {
  if (index === 0) return true;
  const current = messages[index];
  const previous = messages[index - 1];

  // Different sender
  if (current.user.id !== previous.user.id) return true;

  // System messages always show independently
  if (current.isSystemMessage || previous.isSystemMessage) return true;

  // Time gap > 5 minutes breaks the group
  const timeDiff = new Date(current.createdDate).getTime() - new Date(previous.createdDate).getTime();
  if (timeDiff > 5 * 60 * 1000) return true;

  return false;
}
```

For the first message in a group: show avatar, sender name, full timestamp. For subsequent messages in the group: compact bubble, show only a subtle timestamp on hover.

---

## Layout Approach

### Split-Panel Layout

```
+------------------------------------------------------------------+
| Navbar (h-16, from root layout)                                   |
+------------------------------------------------------------------+
| Chat Layout (h-[calc(100vh-4rem)])                                |
| +------------------+---------------------------------------------+|
| | Left Panel       | Right Panel                                 ||
| | (w-80, border-r) | (flex-1)                                    ||
| |                  |                                              ||
| | [New Chat btn]   | ConversationHeader                          ||
| | ChatRoomList     | +-------------------------------------+     ||
| |  - Room 1 (sel)  | | MessageList (flex-1, overflow-y)    |     ||
| |  - Room 2        | |  - sentinel (top)                   |     ||
| |  - Room 3        | |  - message bubbles...               |     ||
| |  - ...           | |                                     |     ||
| |  - sentinel (bot)| +-------------------------------------+     ||
| |                  | MessageInput                                 ||
| +------------------+---------------------------------------------+|
+------------------------------------------------------------------+
| Footer (exists in DOM but pushed below viewport)                  |
+------------------------------------------------------------------+
```

The chat layout uses:
- `h-[calc(100vh-4rem)]` to fill viewport minus navbar
- `overflow-hidden` to prevent the page from scrolling to the footer
- CSS `flex` for the split panel: left panel has `w-80 shrink-0 border-r`, right panel has `flex-1`
- Both panels use `ScrollArea` for their scrollable sections

### Responsive Behavior

On mobile (below `md` breakpoint):
- Show only one panel at a time
- Default: show the room list
- When a room is selected: show the conversation view with a back button in the header
- Use state to toggle between panels, not routing

```typescript
// In ChatLayout
const [mobileView, setMobileView] = useState<"list" | "conversation">("list");

// On room select:
setSelectedRoomId(roomId);
setMobileView("conversation");

// Back button in ConversationHeader on mobile:
onBack={() => setMobileView("list");
```

CSS:
```
Left panel:  "hidden md:flex" when mobileView === "conversation"
Right panel: "hidden md:flex" when mobileView === "list"
```

---

## Integration Points

### 1. Navbar Chat Link

File: `src/components/playground/navbar-auth-links.tsx`

Add a new `NavigationMenuItem` for Chat, following the exact same pattern as the Games and Player links:

```tsx
<NavigationMenuItem>
  <NavigationMenuLink
    render={
      <Link
        href="/chat"
        className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary"
      />
    }
  >
    <TypographyP>{t("header.chat")}</TypographyP>
  </NavigationMenuLink>
</NavigationMenuItem>
```

Add `"chat": "Chat"` to the `header` namespace in `messages/en.json`.

### 2. Profile Page Message Button

File: `src/components/profile/profile-header.tsx`

The current Message button is a disabled placeholder. Replace it with the new `MessageButton` client component that handles the DM lookup/create flow:

```tsx
// Replace the current static Message button with:
{isAuthenticated && isFriends && (
  <MessageButton userId={user.id} />
)}
{isAuthenticated && !isFriends && (
  <TooltipProvider>
    <Tooltip>
      <TooltipTrigger>
        <span>
          <Button variant="outline" disabled>
            <MessageCircle className="mr-2 h-4 w-4" />
            {t("message")}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p>{t("messageFriendsOnly")}</p>
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
)}
```

The `MessageButton` component (`src/components/chat/message-button.tsx`):
- Client component with `"use client"`
- Calls `findDirectMessageRoom(userId)` server action
- If room exists, navigates to `/chat?room={roomId}`
- If no room, calls `createChatRoom(...)` with `isDirectMessage: true`
- Shows loading spinner during the operation
- Shows toast on error

### 3. Profile Header becomes hybrid

The `ProfileHeader` is currently an async server component. The Message button needs client-side interactivity. Since `FriendActions` is already a client component imported into `ProfileHeader`, we can follow the same pattern: `MessageButton` is a client component imported and rendered by the server component `ProfileHeader`. No changes to `ProfileHeader` being a server component are needed beyond swapping the JSX.

---

## i18n Keys

Add to `messages/en.json` under the root object. Also add `"chat": "Chat"` to the `header` namespace.

```json
{
  "header": {
    "chat": "Chat"
  },
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
    "back": "Back",
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

## shadcn/ui Components

### Existing Components Used

- `Button` - new chat, send, save, cancel, back
- `Dialog` / `DialogContent` / `DialogHeader` / `DialogTitle` / `DialogFooter` - create chat room, add member
- `AlertDialog` - delete message confirmation, remove member confirmation
- `Sheet` / `SheetContent` / `SheetHeader` / `SheetTitle` - member list panel (side: "right")
- `ScrollArea` - room list and message list scrolling
- `Input` - message input, group name input, friend search
- `Avatar` / `AvatarFallback` - user avatars in message bubbles and member list
- `Badge` - role badges (Owner, Admin, Member)
- `DropdownMenu` / `DropdownMenuTrigger` / `DropdownMenuContent` / `DropdownMenuItem` - message actions
- `Separator` - visual separators
- `Skeleton` - loading states
- `Tooltip` - disabled message button on profile

### New Components to Add

- **Checkbox** (`npx shadcn@latest add checkbox`): needed for the friend selector in `CreateChatRoomDialog` and `MemberListPanel` add-member flow.
- **Textarea** (already exists at `src/components/ui/textarea.tsx`): for the message input (multi-line support with Shift+Enter).

---

## Detailed Component Specifications

### ChatLayout (`src/components/chat/chat-layout.tsx`)

```typescript
"use client";

interface ChatLayoutProps {
  initialRooms: Edge<ChatRoomListNode>[];
  initialPageInfo: PageInfo;
  currentUser: { id: string; firstName: string; lastName: string };
  initialRoomId: string | null; // from URL ?room= param
}
```

- Manages `selectedRoomId`, `mobileView`, `memberPanelOpen`
- Passes `onRoomSelect` callback to `ChatRoomList`
- Passes `onRoomLastMessageUpdate` callback to `ConversationView` so sending a message updates the sidebar
- Syncs `selectedRoomId` to URL via `router.replace(`/chat?room=${id}`, { scroll: false })`
- Provides `onNewRoomCreated` callback to `CreateChatRoomDialog` to prepend the new room to the list and select it

### ChatRoomList (`src/components/chat/chat-room-list.tsx`)

```typescript
interface ChatRoomListProps {
  initialRooms: Edge<ChatRoomListNode>[];
  initialPageInfo: PageInfo;
  selectedRoomId: string | null;
  currentUserId: string;
  onSelectRoom: (roomId: string) => void;
  onNewRoomCreated: (room: ChatRoomListNode) => void;
}
```

- Manages its own room list state (appending on scroll)
- Renders `CreateChatRoomDialog` trigger button
- Uses IntersectionObserver for infinite scroll
- Calls `loadChatRooms` server action for pagination
- Exposes imperative method or accepts a prop to update a room's last message

### ChatRoomListItem (`src/components/chat/chat-room-list-item.tsx`)

```typescript
interface ChatRoomListItemProps {
  room: ChatRoomListNode;
  isSelected: boolean;
  currentUserId: string;
  onClick: () => void;
}
```

- Computes display name: if `isDirectMessage`, find the other user in `members.edges` and show their name; otherwise show `room.name`
- Shows last message preview (truncated to ~50 chars)
- Shows relative timestamp of last message
- Highlighted background when selected (`bg-accent`)
- Unread indicator stub (hidden, placeholder for future)

### ConversationView (`src/components/chat/conversation-view.tsx`)

```typescript
interface ConversationViewProps {
  roomId: string;
  currentUser: { id: string; firstName: string; lastName: string };
  onBack: () => void; // mobile back button
  onToggleMembers: () => void;
  onLastMessageUpdate: (roomId: string, message: ChatMessageNode) => void;
}
```

- Fetches room detail and messages when `roomId` changes (via `useEffect`)
- Manages `messages`, `messagesPageInfo`, `replyTo`, `editingMessageId`
- Provides handlers: `handleSend`, `handleEdit`, `handleDelete`, `handleReply`
- On `handleSend`: calls server action, appends message to state, calls `onLastMessageUpdate`
- On `handleEdit`: replaces message content in state, sets `updatedDate`
- On `handleDelete`: sets `deletedDate` on the message in state (does not remove it)

### MessageList (`src/components/chat/message-list.tsx`)

```typescript
interface MessageListProps {
  messages: Edge<ChatMessageNode>[];
  currentUserId: string;
  currentUserRole: ChatRoomRole | null;
  onReply: (message: ChatMessageNode) => void;
  onEdit: (message: ChatMessageNode) => void;
  onDelete: (messageId: string) => void;
  onLoadOlder: () => void;
  hasOlderMessages: boolean;
  isLoadingOlder: boolean;
  onScrollToMessage?: (messageId: string) => void;
}
```

- Manages the scroll container ref
- Top sentinel for reverse infinite scroll
- Computes message grouping using `shouldShowSender`
- Auto-scrolls to bottom on mount and when new messages from the current user are appended
- Provides `scrollToMessage(id)` for reply-to click navigation

### MessageBubble (`src/components/chat/message-bubble.tsx`)

```typescript
interface MessageBubbleProps {
  message: ChatMessageNode;
  isOwn: boolean;
  showSender: boolean;
  isFirstInGroup: boolean;
  isLastInGroup: boolean;
  currentUserRole: ChatRoomRole | null;
  isEditing: boolean;
  onReply: () => void;
  onStartEdit: () => void;
  onSaveEdit: (content: string) => void;
  onCancelEdit: () => void;
  onDelete: () => void;
  onScrollToReply: (messageId: string) => void;
}
```

- Renders differently based on `isOwn` (right-aligned, primary bg) vs others (left-aligned, muted bg)
- System messages: centered, muted, no actions
- Deleted messages: italic muted text, no actions
- Shows `(edited)` indicator when `updatedDate` is present and `deletedDate` is not
- Shows `ReplyPreview` above content when `replyTo` exists
- Shows `MessageActionsMenu` on hover (desktop) or via a "more" button
- Inline edit mode: replaces content with a textarea + Save/Cancel buttons
- Shows avatar + name only when `showSender` is true (first in group)

### MessageInput (`src/components/chat/message-input.tsx`)

```typescript
interface MessageInputProps {
  onSend: (content: string, replyToId?: string) => void;
  replyTo: ChatMessageNode | null;
  onClearReply: () => void;
  disabled?: boolean;
}
```

- Uses `Textarea` component for multi-line input
- Enter to send, Shift+Enter for newline (handle via `onKeyDown`)
- Shows `ReplyPreview` bar above input when `replyTo` is set, with X button to clear
- Send button with `SendHorizonal` icon from Lucide
- Clears input and reply on successful send
- Disabled state while sending (using `useTransition` or local state)

### CreateChatRoomDialog (`src/components/chat/create-chat-room-dialog.tsx`)

```typescript
interface CreateChatRoomDialogProps {
  onRoomCreated: (room: ChatRoomListNode) => void;
  currentUserId: string;
}
```

- Dialog with `FriendSelector` inside
- Shows group name input when 2+ friends selected
- DM behavior: checks for existing DM first via `findDirectMessageRoom`
- Loading states during DM lookup and creation
- "No friends" empty state

### FriendSelector (`src/components/chat/friend-selector.tsx`)

```typescript
interface FriendSelectorProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  excludeUserIds?: string[];
  currentUserId: string;
}
```

- Fetches friendships via `loadFriendships` server action
- Extracts the "friend" user from each friendship (requester or addressee, whichever is not the current user)
- Renders a searchable list with checkboxes
- Client-side search filter on name
- Shows selected count
- Infinite scroll if many friends (use first: 50 with pagination)

### MemberListPanel (`src/components/chat/member-list-panel.tsx`)

```typescript
interface MemberListPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roomId: string;
  members: Edge<ChatRoomMemberNode>[];
  currentUserId: string;
  isDirectMessage: boolean;
}
```

- Uses `Sheet` (side: "right")
- Lists members with name, role badge, join date
- "Add Member" button (hidden for DMs) opens a nested dialog with `FriendSelector`
- "Remove" button on each member (hidden for DMs, hidden for self)
- `RemoveMemberDialog` for confirmation
- Updates member list locally on add/remove

### MessageButton (`src/components/chat/message-button.tsx`)

```typescript
interface MessageButtonProps {
  userId: string;
}
```

- Client component
- On click: calls `findDirectMessageRoom`, navigates or creates then navigates
- Shows loading spinner while processing
- Uses `useRouter` from `@/i18n/navigation`

---

## Timestamp Formatting

Create a utility function in `src/components/chat/chat-utils.ts` (not a separate lib file, since it is chat-specific):

```typescript
export function formatMessageTime(dateString: string): string {
  // For today's messages: "3:42 PM"
  // For yesterday: "Yesterday 3:42 PM"
  // For this year: "Jan 5 3:42 PM"
  // For older: "Jan 5, 2024 3:42 PM"
}

export function formatRelativeTime(dateString: string): string {
  // For chat room list preview timestamps
  // < 1 min: "Just now"
  // < 60 min: "5m ago"
  // < 24 hours: "3h ago"
  // Yesterday: "Yesterday"
  // This year: "Jan 5"
  // Older: "Jan 5, 2024"
}

export function getChatRoomDisplayName(
  room: { name: string; isDirectMessage: boolean; members: { edges: { node: { user: ChatUser } }[] } },
  currentUserId: string
): string {
  if (!room.isDirectMessage) return room.name;
  const otherMember = room.members.edges.find(e => e.node.user.id !== currentUserId);
  if (!otherMember) return room.name;
  return `${otherMember.node.user.firstName} ${otherMember.node.user.lastName}`;
}
```

Use `Intl.DateTimeFormat` or the `date-fns` library if it is already a dependency. Check `package.json` -- if `date-fns` is not present, use `Intl.DateTimeFormat` and manual relative time calculation to avoid adding a dependency.

---

## Alternative Approaches and Trade-offs

### 1. URL-based Room Selection vs. State-based

**Chosen: URL search param (`?room=<id>`)**
- Pro: Deep linking from profile, browser history works, shareable
- Pro: Server component can pre-fetch room data on initial page load if room ID is in URL
- Con: Slightly more complex to manage URL sync

**Alternative: State-only**
- Pro: Simpler implementation
- Con: Loses room context on page refresh, cannot deep-link from profile

### 2. Server Component per Room vs. Client-side Fetching

**Chosen: Client-side fetching via server actions**
- Pro: No full-page re-render on room switch, instant UI response
- Pro: Easier to manage message list state (prepending, editing, deleting)
- Con: Initial room data is not SSR'd (except the room list)

**Alternative: Parallel routes with server components**
- Pro: SSR for each room view
- Con: Full re-render on room switch, complex state management for message editing/deleting, incompatible with infinite scroll state

### 3. Chat Page Layout: Dedicated Layout vs. CSS Approach

**Chosen: CSS approach (fill viewport, footer hidden)**
- Pro: No restructuring of root layout, simpler
- Con: Footer is technically in the DOM but hidden

**Alternative: Route group with separate layout**
- Pro: Cleaner separation, footer truly not rendered
- Con: Requires moving the root layout's shared elements (Navbar, Toaster, NextIntlClientProvider) to a shared layout, which is a larger refactor. Not worth it for one page.

### 4. Checkbox Component: shadcn/ui vs. Simple Toggle

**Chosen: Install shadcn/ui checkbox**
- Pro: Consistent with design system, accessible
- Con: One more component to install

### 5. ScrollArea vs. Native Scroll

**Chosen: `ScrollArea` (shadcn/ui / Base UI) for both room list and message list**
- Pro: Consistent custom scrollbar styling across the app
- Pro: Base UI's `ScrollArea.Viewport` renders as a plain `<div>` — `scrollHeight`/`scrollTop` work normally
- Pro: IntersectionObserver works naturally within the viewport

For programmatic scroll control (reverse infinite scroll in the message list), access the viewport element via `[data-slot="scroll-area-viewport"]` selector on the ScrollArea container ref, or use the `render` prop on the Viewport to attach a ref directly.

---

## Schema Observations

1. **ChatMessage is an interface, not a concrete type.** The query returns `TextChatMessage`, `FileChatMessage`, or `ImageChatMessage`. Since we only handle `TextChatMessage` in this iteration, we should use inline fragments (`__on` / `__typeName`) to select `content` from `TextChatMessage`:

```typescript
// In the messages query, the node should use:
node: {
  __typename: true,
  id: true,
  createdDate: true,
  updatedDate: true,
  deletedDate: true,
  isSystemMessage: true,
  user: { id: true, firstName: true, lastName: true },
  replyTo: {
    id: true,
    __on: [{
      __typeName: "TextChatMessage",
      content: true,
    }],
    user: { id: true, firstName: true, lastName: true },
  },
  __on: [{
    __typeName: "TextChatMessage",
    content: true,
  }],
}
```

This is important because `content` is only on `TextChatMessage`, not on the `ChatMessage` interface. If we query `content` directly without the inline fragment, the GraphQL server will reject the query.

2. **`chatRooms` query pagination**: The schema supports both `first/after` and `last/before`. The requirements specify forward cursor pagination for the room list, which is correct.

3. **Member count is not directly available.** To detect DM vs group chat for display name logic, we rely on the `isDirectMessage` boolean field rather than counting members, which is correct per the requirements.

4. **`directMessageChatRoom` returns nullable.** Returns `null` when no DM exists between the two users. Our flow handles this correctly: check first, create if null.

5. **No `chatMessages` top-level query.** Messages are only accessible through `chatRoom.chatMessages(...)`. This means loading more messages requires re-querying `chatRoom(id) { chatMessages(last, before) }`, which is slightly verbose but works.

6. **Delete response returns `id: ID` (nullable).** The `DeleteChatMessageResponse` implements `DeleteResponse { id: ID }`. After deletion, we locally mark the message's `deletedDate` rather than removing it from the list, so we do not need the response ID.

---

## Implementation Priority

Suggested order for the implementation agent:

1. Types (`src/lib/types/chat.ts`) and constants
2. Server actions (`src/app/[locale]/chat/actions.ts`)
3. Chat utils (`src/components/chat/chat-utils.ts`)
4. Chat page (`src/app/[locale]/chat/page.tsx`) -- server component shell
5. `ChatLayout` -- split panel with empty state
6. `ChatRoomList` + `ChatRoomListItem` -- room sidebar with infinite scroll
7. `ConversationView` + `ConversationHeader` -- room detail
8. `MessageList` + `MessageBubble` -- message display with grouping
9. `MessageInput` + `ReplyPreview` -- sending messages
10. `MessageActionsMenu` -- edit/delete/reply actions
11. `DeleteMessageDialog` -- delete confirmation
12. `CreateChatRoomDialog` + `FriendSelector` -- room creation
13. `MemberListPanel` + `RemoveMemberDialog` -- member management
14. `MessageButton` -- profile page integration
15. Navbar link update
16. i18n keys
17. Install checkbox component (`npx shadcn@latest add checkbox`)
