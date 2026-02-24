# Design: Chat Message Rework (0029)

## Summary

The GraphQL schema has been refactored from a flat `ChatMessage` model with an `isSystemMessage` boolean flag to a proper polymorphic type hierarchy. The frontend must be updated to:

1. Remove all references to the deleted `isSystemMessage` field
2. Remove `user`, `updatedDate`, `deletedDate`, and `replyTo` from the base `ChatMessage` interface (they now live on `UserChatMessage`)
3. Add support for new system message types: `MemberJoinedChatMessage` and `MemberLeftChatMessage`
4. Update TypeScript types, GraphQL query fragments, subscription queries, components, and i18n strings

---

## 1. TypeScript Types

### 1.1 File: `/home/kevinlee/workspace/playground/playground-web-client/src/lib/types/chat.ts`

The existing type hierarchy uses a `ChatMessageBase` that includes `user`, `isSystemMessage`, `updatedDate`, `deletedDate`, and `replyTo`. This must be split into a true base for all messages and a user-message-specific interface.

```typescript
import type { Resource } from "@/lib/types/resource";

/** A user reference as returned in chat-related queries */
export interface ChatUser {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
}

/** Base fields shared by ALL chat message types (interface: ChatMessage) */
interface ChatMessageBase {
  id: string;
  createdDate: string;
}

/** Fields shared by user-authored messages (interface: UserChatMessage) */
interface UserChatMessageBase extends ChatMessageBase {
  user: ChatUser;
  updatedDate: string | null;
  deletedDate: string | null;
  replyTo: ChatMessageReplyTo | null;
}

/** A text chat message */
export interface TextChatMessageNode extends UserChatMessageBase {
  __typename: "TextChatMessage";
  content: string | null; // null when deleted
}

/** A media chat message (image or file) */
export interface MediaChatMessageNode extends UserChatMessageBase {
  __typename: "MediaChatMessage";
  resource: Resource;
  caption: string | null;
}

/** Discriminated union for user-authored chat messages */
export type UserChatMessageNode = TextChatMessageNode | MediaChatMessageNode;

/** A system message: member joined */
export interface MemberJoinedChatMessageNode extends ChatMessageBase {
  __typename: "MemberJoinedChatMessage";
  member: ChatUser;
}

/** A system message: member left */
export interface MemberLeftChatMessageNode extends ChatMessageBase {
  __typename: "MemberLeftChatMessage";
  member: ChatUser;
}

/** Discriminated union for system chat messages */
export type SystemChatMessageNode =
  | MemberJoinedChatMessageNode
  | MemberLeftChatMessageNode;

/** Discriminated union for ALL chat message types */
export type ChatMessageNode = UserChatMessageNode | SystemChatMessageNode;

// --- Reply-to types remain unchanged (they only reference UserChatMessage) ---

/** Base fields for reply-to references */
interface ChatMessageReplyToBase {
  id: string;
  user: ChatUser;
}

/** Reply-to reference for a text message */
export interface TextChatMessageReplyTo extends ChatMessageReplyToBase {
  __typename: "TextChatMessage";
  content: string | null;
}

/** Reply-to reference for a media message */
export interface MediaChatMessageReplyTo extends ChatMessageReplyToBase {
  __typename: "MediaChatMessage";
  caption: string | null;
  resource: Resource;
}

/** Discriminated union for reply-to references */
export type ChatMessageReplyTo =
  | TextChatMessageReplyTo
  | MediaChatMessageReplyTo;

// --- Remaining types stay the same ---
// ChatRoomMemberNode, ChatRoomListBase, ChatRoomListNode,
// ChatRoomDetailNode, FriendshipNode, FriendItem, ChatRoomRole
```

**Key decisions:**
- `UserChatMessageNode` is a new exported union type for components that only deal with user messages (e.g., `MessageBubble`, `MessageActionsMenu`). This eliminates the need for runtime `isSystemMessage` checks inside those components.
- `ChatMessageNode` remains the top-level union used by `MessageList`, `ConversationView`, and `Edge<ChatMessageNode>`.
- Reply-to types are unchanged since `replyTo` in the schema points to `UserChatMessage`.

### 1.2 Type guard helpers

Add a new file: `/home/kevinlee/workspace/playground/playground-web-client/src/lib/types/chat-guards.ts`

```typescript
import type {
  ChatMessageNode,
  SystemChatMessageNode,
  UserChatMessageNode,
} from "@/lib/types/chat";

/** Type guard: is this a user-authored message? */
export function isUserChatMessage(
  msg: ChatMessageNode,
): msg is UserChatMessageNode {
  return (
    msg.__typename === "TextChatMessage" ||
    msg.__typename === "MediaChatMessage"
  );
}

/** Type guard: is this a system message? */
export function isSystemChatMessage(
  msg: ChatMessageNode,
): msg is SystemChatMessageNode {
  return (
    msg.__typename === "MemberJoinedChatMessage" ||
    msg.__typename === "MemberLeftChatMessage"
  );
}
```

**Rationale:** Type guards provide clean narrowing that replaces the old `message.isSystemMessage` boolean check. They are centralized so the discriminant values are defined in one place.

---

## 2. GraphQL Fragments

### 2.1 File: `/home/kevinlee/workspace/playground/playground-web-client/src/lib/graphql-fragments.ts`

The `chatMessageInlineFragments` array currently only contains `TextChatMessage` and `MediaChatMessage`. It must be expanded to include system message types, and the shared user-message fields must move into the inline fragments since they no longer exist on the base `ChatMessage` interface.

**Current `chatMessageInlineFragments`:**
```typescript
export const chatMessageInlineFragments = [
  { __typeName: "TextChatMessage", content: true },
  { __typeName: "MediaChatMessage", caption: true, resource: resourceFragment },
];
```

**New -- split into two fragment arrays:**

```typescript
/**
 * Shared fields for UserChatMessage types (user, updatedDate, deletedDate, replyTo).
 * These fields are NOT on the base ChatMessage interface anymore.
 */
const userChatMessageFields = {
  user: chatUserFragment,
  updatedDate: true,
  deletedDate: true,
  replyTo: {
    __typename: true,
    id: true,
    user: chatUserFragment,
    __on: [
      { __typeName: "TextChatMessage", content: true },
      {
        __typeName: "MediaChatMessage",
        caption: true,
        resource: resourceFragment,
      },
    ],
  },
};

/**
 * Inline fragments for all ChatMessage concrete types.
 * Includes both user message types and system message types.
 * Use as: __on: chatMessageInlineFragments
 */
export const chatMessageInlineFragments = [
  {
    __typeName: "TextChatMessage",
    ...userChatMessageFields,
    content: true,
  },
  {
    __typeName: "MediaChatMessage",
    ...userChatMessageFields,
    caption: true,
    resource: resourceFragment,
  },
  {
    __typeName: "MemberJoinedChatMessage",
    member: chatUserFragment,
  },
  {
    __typeName: "MemberLeftChatMessage",
    member: chatUserFragment,
  },
];
```

**Key decision:** The `replyTo` selection is moved inside each user message fragment because `replyTo` no longer exists on the base `ChatMessage` interface. The `userChatMessageFields` object is a local constant (not exported) used to DRY up the two user message fragments.

---

## 3. GraphQL Queries & Mutations

### 3.1 File: `/home/kevinlee/workspace/playground/playground-web-client/src/app/[locale]/chat/actions.ts`

**`chatMessageNodeSelection` -- remove `isSystemMessage`, `user`, `updatedDate`, `deletedDate`, `replyTo` from the base level:**

```typescript
const chatMessageNodeSelection = {
  __typename: true,
  id: true,
  createdDate: true,
  // user, updatedDate, deletedDate, replyTo are now inside __on fragments
  __on: chatMessageInlineFragments,
};
```

The old selection had `isSystemMessage: true`, `user: chatUserFragment`, `updatedDate: true`, `deletedDate: true`, and a top-level `replyTo` block. All of these are removed from the base and are now fetched via the inline fragments defined in section 2.1.

All existing server actions (`sendMessage`, `sendMediaMessage`, `updateMessage`, `deleteMessage`, `loadMessages`, `loadChatRooms`, `findDirectMessageRoom`) use `chatMessageNodeSelection`, so they will automatically pick up the new shape.

The `updateMessage` action has its own inline selection for the response. It queries `updatedDate` at the top level, which is no longer valid. Update it:

```typescript
// Before:
chatMessage: {
  id: true,
  updatedDate: true,
  __on: [{ __typeName: "TextChatMessage", content: true }],
}

// After:
chatMessage: {
  id: true,
  __on: [
    {
      __typeName: "TextChatMessage",
      content: true,
      updatedDate: true,
    },
  ],
}
```

### 3.2 File: `/home/kevinlee/workspace/playground/playground-web-client/src/hooks/use-chat-subscription.ts`

The subscription's `chatMessageNodeSelection` is a duplicate of the one in `actions.ts`. Apply the same changes: remove `isSystemMessage`, move `user`/`updatedDate`/`deletedDate`/`replyTo` into the inline fragments.

**Recommendation:** Extract `chatMessageNodeSelection` into `graphql-fragments.ts` as an exported constant to eliminate the duplication between `actions.ts` and `use-chat-subscription.ts`. Both files would then import it.

```typescript
// In graphql-fragments.ts:
export const chatMessageNodeSelection = {
  __typename: true,
  id: true,
  createdDate: true,
  __on: chatMessageInlineFragments,
};
```

---

## 4. Component Changes

### 4.1 `MessageBubble` -- `/home/kevinlee/workspace/playground/playground-web-client/src/components/chat/message-bubble.tsx`

This component currently receives `ChatMessageNode` and checks `message.isSystemMessage`. Under the new model:

- `MessageBubble` should ONLY receive `UserChatMessageNode`, never system messages. The parent (`MessageList`) is responsible for routing system messages to a different component.
- Remove the `isSystemMessage` check and the system message rendering block.
- Remove the `isDeleted` variable that reads `message.deletedDate` (it remains valid since `UserChatMessageNode` still has `deletedDate`). Actually, `deletedDate` still exists on user messages, so `isDeleted` stays.

**Changes:**
```diff
- import type { ChatMessageNode, ChatMessageReplyTo, ChatRoomRole } from "@/lib/types/chat";
+ import type { UserChatMessageNode, ChatMessageReplyTo, ChatRoomRole } from "@/lib/types/chat";

  interface MessageBubbleProps {
-   message: ChatMessageNode;
+   message: UserChatMessageNode;
    // ... rest unchanged
  }

  // Remove the isSystemMessage check and early return block:
- const isSystemMessage = message.isSystemMessage;
- if (isSystemMessage) {
-   return ( ... );
- }
```

### 4.2 New Component: `SystemMessageBubble` -- `/home/kevinlee/workspace/playground/playground-web-client/src/components/chat/system-message-bubble.tsx`

A new server-friendly (but will be `"use client"` since it lives inside the client component tree of `MessageList`) component for rendering system messages. Uses `TypographyMuted` for text per CLAUDE.md convention.

```tsx
"use client";

import type { SystemChatMessageNode } from "@/lib/types/chat";
import { TypographyMuted } from "@/components/ui/typography";
import { useTranslations } from "next-intl";

interface SystemMessageBubbleProps {
  message: SystemChatMessageNode;
}

export function SystemMessageBubble({ message }: SystemMessageBubbleProps) {
  const t = useTranslations("chat.systemMessage");

  let text: string;
  switch (message.__typename) {
    case "MemberJoinedChatMessage":
      text = t("memberJoined", { name: message.member.displayName });
      break;
    case "MemberLeftChatMessage":
      text = t("memberLeft", { name: message.member.displayName });
      break;
    default: {
      // Exhaustiveness check
      const _exhaustive: never = message;
      text = "";
      void _exhaustive;
    }
  }

  return (
    <div className="flex justify-center py-2">
      <TypographyMuted className="italic text-sm">{text}</TypographyMuted>
    </div>
  );
}
```

### 4.3 `MessageList` -- `/home/kevinlee/workspace/playground/playground-web-client/src/components/chat/message-list.tsx`

The `MessageList` iterates over `Edge<ChatMessageNode>[]` and renders each as a `MessageBubble`. It must now branch based on message type.

**IMPORTANT:** The existing `message.user.id === currentUserId` access (line 195) must be moved INSIDE the user message branch. It cannot remain at the top level of the map callback because system messages do not have a `.user` field. The system message type guard MUST come before any `.user` access to prevent a runtime crash.

```tsx
import { isUserChatMessage } from "@/lib/types/chat-guards";
import { SystemMessageBubble } from "./system-message-bubble";

// In the render loop:
{messageNodes.map((message, index) => {
  // System messages are rendered separately — must check BEFORE accessing .user
  if (!isUserChatMessage(message)) {
    return (
      <SystemMessageBubble key={message.id} message={message} />
    );
  }

  // All .user accesses are safe below this point (narrowed to UserChatMessageNode)
  const isFirstInGroup = groupingInfo[index];
  return (
    <MessageBubble
      key={message.id}
      message={message}
      isOwn={message.user.id === currentUserId}
      showSender={isFirstInGroup}
      isFirstInGroup={isFirstInGroup}
      currentUserRole={currentUserRole}
      isEditing={editingMessageId === message.id}
      onReply={() => onReply(message)}
      onStartEdit={() => onStartEdit(message.id)}
      onSaveEdit={(content) => onSaveEdit(message.id, content)}
      onCancelEdit={onCancelEdit}
      onDelete={() => onDelete(message.id)}
      onScrollToReply={scrollToMessage}
    />
  );
})}
```

**The `onReply` callback type changes:**
```diff
- onReply: (message: ChatMessageNode) => void;
+ onReply: (message: UserChatMessageNode) => void;
```

System messages cannot be replied to, so this is safe. `ConversationView` also stores `replyTo` state which should use `UserChatMessageNode`.

### 4.4 `shouldShowSender` in `chat-utils.ts`

The current signature expects objects with `user` and `isSystemMessage`. Under the new model, system messages don't have a `user` field. The function needs updating:

```typescript
import { isUserChatMessage, isSystemChatMessage } from "@/lib/types/chat-guards";
import type { ChatMessageNode } from "@/lib/types/chat";

/**
 * Determine if sender name/avatar should be shown for a message.
 * System messages always break the grouping.
 */
export function shouldShowSender(
  messages: ChatMessageNode[],
  index: number,
): boolean {
  if (index === 0) return true;
  const current = messages[index];
  const previous = messages[index - 1];

  // System messages always show independently (they break grouping)
  if (isSystemChatMessage(current) || isSystemChatMessage(previous)) return true;

  // Both are user messages at this point
  if (isUserChatMessage(current) && isUserChatMessage(previous)) {
    // Different sender
    if (current.user.id !== previous.user.id) return true;

    // Time gap > 5 minutes breaks the group
    const timeDiff =
      new Date(current.createdDate).getTime() -
      new Date(previous.createdDate).getTime();
    if (timeDiff > 5 * 60 * 1000) return true;
  }

  return false;
}
```

### 4.5 `ConversationView` -- `/home/kevinlee/workspace/playground/playground-web-client/src/components/chat/conversation-view.tsx`

**Changes:**
- `replyTo` state type: `ChatMessageNode | null` --> `UserChatMessageNode | null`
- `onLastMessageUpdate` callback passes `ChatMessageNode`, which remains correct since the last message could theoretically be a system message (e.g., when a member joins, the system message becomes the newest message in the room list preview).
- `handleIncomingMessage`, `handleIncomingUpdate`, `handleIncomingDelete` -- these receive `ChatMessageNode` from events. The update and delete handlers are only relevant for user messages, but the server sends the full `ChatMessageNode` regardless. The code already matches on `id`, so no functional change needed.

```diff
+ import type { UserChatMessageNode } from "@/lib/types/chat";
+ import { isUserChatMessage } from "@/lib/types/chat-guards";

- const [replyTo, setReplyTo] = useState<ChatMessageNode | null>(null);
+ const [replyTo, setReplyTo] = useState<UserChatMessageNode | null>(null);
```

**Optimistic update handlers must add type guards.** Although system messages can never be edited or deleted at runtime, TypeScript cannot prove this. Spreading user-specific fields (`deletedDate`, `content`, `updatedDate`) onto a `ChatMessageNode` union will fail type-checking because system message types don't have those fields.

```typescript
// handleDelete — add isUserChatMessage guard:
setMessages((prev) =>
  prev.map((edge) => {
    if (edge.node.id === messageToDelete && isUserChatMessage(edge.node)) {
      return {
        ...edge,
        node: {
          ...edge.node,
          deletedDate: new Date().toISOString(),
        },
      };
    }
    return edge;
  }),
);

// handleEdit — existing __typename check already narrows correctly:
// edge.node.__typename === "TextChatMessage" narrows to TextChatMessageNode
// which extends UserChatMessageBase, so .content and .updatedDate are safe.
// No additional guard needed here.
```

### 4.6 `ChatRoomListItem` -- `/home/kevinlee/workspace/playground/playground-web-client/src/components/chat/chat-room-list-item.tsx`

The last message preview logic reads `lastMessage.deletedDate`, `lastMessage.content`, etc. Since the last message could now be a system message, the preview logic must handle the new types.

**IMPORTANT:** Both the preview text logic AND the className that checks `lastMessage?.deletedDate` (line 104) must be updated. Accessing `.deletedDate` on a `ChatMessageNode` without narrowing will fail TypeScript compilation because system messages don't have that field.

```typescript
// Preview text logic:
if (lastMessage) {
  lastMessageTime = formatRelativeTime(lastMessage.createdDate, locale, timeLabels);

  if (isUserChatMessage(lastMessage)) {
    if (lastMessage.deletedDate) {
      lastMessagePreview = t("message.deleted");
    } else if (lastMessage.__typename === "TextChatMessage") {
      const content = lastMessage.content;
      if (content) {
        lastMessagePreview =
          content.length > 50 ? content.substring(0, 50) + "..." : content;
      }
    } else if (lastMessage.__typename === "MediaChatMessage") {
      if (lastMessage.resource.__typename === "ImageResource") {
        lastMessagePreview = t("message.imageAttachment");
      } else {
        lastMessagePreview = t("message.fileAttachment");
      }
    }
  } else if (lastMessage.__typename === "MemberJoinedChatMessage") {
    lastMessagePreview = t("systemMessage.memberJoined", {
      name: lastMessage.member.displayName,
    });
  } else if (lastMessage.__typename === "MemberLeftChatMessage") {
    lastMessagePreview = t("systemMessage.memberLeft", {
      name: lastMessage.member.displayName,
    });
  }
}

// The className for the preview text (line ~104) must also be guarded:
className={cn(
  "truncate",
  lastMessage &&
    isUserChatMessage(lastMessage) &&
    lastMessage.deletedDate &&
    "italic",
)}
```

Note: `ChatRoomListItem` uses `useTranslations("chat")`, so system message keys must be nested under `chat.systemMessage`.

### 4.7 `message-preview-utils.ts` -- `/home/kevinlee/workspace/playground/playground-web-client/src/components/chat/message-preview-utils.ts`

Change `getMessagePreviewContent` to accept `UserChatMessageNode` instead of `ChatMessageNode`. This function is only called from `MessageInput` with reply-to messages, which are always user messages. Do NOT add system message handling here — system message previews are handled inline in `ChatRoomListItem` (section 4.6).

```diff
- import type { ChatMessageNode } from "@/lib/types/chat";
+ import type { UserChatMessageNode } from "@/lib/types/chat";

  export function getMessagePreviewContent(
-   message: ChatMessageNode,
+   message: UserChatMessageNode,
    t: (key: string, values?: Record<string, string>) => string,
  ): string | null {
    // ... existing logic for Text/Media messages remains unchanged
  }
```

### 4.8 `MessageInput` -- `/home/kevinlee/workspace/playground/playground-web-client/src/components/chat/message-input.tsx`

The `replyTo` prop is currently typed as `ChatMessageNode | null` and accesses `.user` (line 153: `replyTo.user.displayName`). Since system messages don't have a `.user` field, this will fail TypeScript compilation under the new types. Update the prop type to `UserChatMessageNode | null`.

```diff
- import type { ChatMessageNode } from "@/lib/types/chat";
+ import type { UserChatMessageNode } from "@/lib/types/chat";

  interface MessageInputProps {
    onSendText: (content: string, replyToId?: string) => void;
    onSendMedia: (file: File) => Promise<void>;
-   replyTo: ChatMessageNode | null;
+   replyTo: UserChatMessageNode | null;
    onClearReply: () => void;
    disabled?: boolean;
  }
```

This is safe because `replyTo` is set from `ConversationView.replyTo` state (section 4.5) which is now `UserChatMessageNode | null`, and `onReply` in `MessageList` (section 4.3) only fires for user messages.

### 4.9 `ChatLayout` -- `/home/kevinlee/workspace/playground/playground-web-client/src/components/chat/chat-layout.tsx`

The `lastMessageUpdate` state type uses `ChatMessageNode`. This remains correct. The `handleRoomLastMessageUpdate` callback remains unchanged. No structural changes needed.

However, the `onLastMessageUpdate` prop type in `ConversationView` should stay as `ChatMessageNode` (not `UserChatMessageNode`) since system messages from WebSocket events may update the room's last message.

---

## 5. i18n Keys

### 5.1 File: `/home/kevinlee/workspace/playground/playground-web-client/messages/en.json`

Add system message translations under `chat`:

```json
{
  "chat": {
    "systemMessage": {
      "memberJoined": "{name} joined the chat",
      "memberLeft": "{name} left the chat"
    }
  }
}
```

These keys are used by:
- `SystemMessageBubble` (via `useTranslations("chat.systemMessage")`)
- `ChatRoomListItem` (for last message preview, via `t("systemMessage.memberJoined", ...)`)

---

## 6. Subscription Changes

### 6.1 File: `/home/kevinlee/workspace/playground/playground-web-client/src/hooks/use-chat-subscription.ts`

Same as section 3.2. The duplicated `chatMessageNodeSelection` must be updated to remove `isSystemMessage` and move user-specific fields into inline fragments. Ideally, import the shared `chatMessageNodeSelection` from `graphql-fragments.ts`.

The `chatRoomListNodeSelection` (also duplicated) should likewise be imported from a shared location.

---

## 7. Data Flow Summary

```
GraphQL Server
    |
    v
chatMessageInlineFragments (updated: adds MemberJoined/MemberLeft, moves user fields into __on)
    |
    v
chatMessageNodeSelection (updated: base only has id, createdDate, __typename)
    |
    +---> actions.ts (loadMessages, sendMessage, etc.)
    |       |
    |       v
    |     ChatMessageNode (union of 4 concrete types)
    |       |
    |       v
    |     ConversationView state: Edge<ChatMessageNode>[]
    |       |
    |       v
    |     MessageList
    |       |
    |       +---> isUserChatMessage? --> MessageBubble (UserChatMessageNode)
    |       +---> isSystemChatMessage? --> SystemMessageBubble (SystemChatMessageNode)
    |
    +---> use-chat-subscription.ts (same selection)
            |
            v
          ChatEvent (ChatMessageNode inside event payloads)
            |
            v
          ChatLayout --> dispatches to ConversationView / ChatRoomList
```

---

## 8. File Change Summary

| File | Change Type | Description |
|------|------------|-------------|
| `src/lib/types/chat.ts` | **Modify** | Split `ChatMessageBase` into base + user base. Add `MemberJoinedChatMessageNode`, `MemberLeftChatMessageNode`, `SystemChatMessageNode`, `UserChatMessageNode`. Remove `isSystemMessage`. |
| `src/lib/types/chat-guards.ts` | **New** | Type guard functions `isUserChatMessage`, `isSystemChatMessage` |
| `src/lib/graphql-fragments.ts` | **Modify** | Update `chatMessageInlineFragments` to include system types and move user fields into inline fragments. Export `chatMessageNodeSelection`. |
| `src/app/[locale]/chat/actions.ts` | **Modify** | Update `chatMessageNodeSelection` (or import from fragments). Remove `isSystemMessage`. Fix `updateMessage` inline selection. |
| `src/hooks/use-chat-subscription.ts` | **Modify** | Remove duplicated selections, import from `graphql-fragments.ts`. Update subscription query. |
| `src/components/chat/message-bubble.tsx` | **Modify** | Change prop type to `UserChatMessageNode`. Remove system message rendering block. |
| `src/components/chat/system-message-bubble.tsx` | **New** | Renders `MemberJoinedChatMessage` and `MemberLeftChatMessage`. |
| `src/components/chat/message-list.tsx` | **Modify** | Branch rendering: user messages to `MessageBubble`, system messages to `SystemMessageBubble`. Update `onReply` type. |
| `src/components/chat/conversation-view.tsx` | **Modify** | Change `replyTo` state type to `UserChatMessageNode`. Add `isUserChatMessage` guard to `handleDelete` optimistic update. |
| `src/components/chat/chat-utils.ts` | **Modify** | Update `shouldShowSender` to handle system messages without `user` field. |
| `src/components/chat/chat-room-list-item.tsx` | **Modify** | Handle system messages in last message preview. Guard `.deletedDate` access in className with `isUserChatMessage`. |
| `src/components/chat/message-input.tsx` | **Modify** | Change `replyTo` prop type from `ChatMessageNode` to `UserChatMessageNode`. |
| `src/components/chat/message-preview-utils.ts` | **Modify** | Change `message` param type from `ChatMessageNode` to `UserChatMessageNode`. No system message handling (only called for reply previews). |
| `messages/en.json` | **Modify** | Add `chat.systemMessage.memberJoined` and `chat.systemMessage.memberLeft`. |

---

## 9. Architectural Decisions

### 9.1 Why a separate `SystemMessageBubble` component?

System messages have fundamentally different rendering (no avatar, no actions menu, no reply, centered text, no edit/delete). Mixing this logic into `MessageBubble` via conditional branches would violate the single responsibility principle and make the already-complex component harder to maintain. A separate component also makes the TypeScript types cleaner -- `MessageBubble` receives `UserChatMessageNode` and can access `.user`, `.replyTo`, etc. without narrowing.

### 9.2 Why type guards instead of a discriminant property?

The `__typename` discriminant already exists, but checking `msg.__typename === "TextChatMessage" || msg.__typename === "MediaChatMessage"` everywhere is verbose and error-prone if new user message types are added later. Centralized type guards are a single source of truth.

### 9.3 Why move `chatMessageNodeSelection` to `graphql-fragments.ts`?

The current codebase has the same selection duplicated in `actions.ts` and `use-chat-subscription.ts`. This is a maintenance risk -- the subscription selection could easily drift from the query selection (and in fact, they must be kept in sync for WebSocket events to produce the same shape as query results). Centralizing eliminates this risk.

### 9.4 User fields inside `__on` fragments vs. top-level

The GraphQL schema no longer has `user`, `updatedDate`, `deletedDate`, or `replyTo` on the `ChatMessage` interface. Querying these fields at the top level of a `ChatMessage` selection would result in a GraphQL validation error. They must be queried inside `__on` inline fragments for the concrete types that have them (`TextChatMessage`, `MediaChatMessage`).

---

## 10. Edge Cases

### 10.1 System messages in reply-to

The schema defines `replyTo: UserChatMessage` -- system messages cannot be the target of a reply, and system messages don't have a `replyTo` field. No change needed for reply handling.

### 10.2 System messages and message actions

System messages should not show the actions menu (reply, edit, delete). This is handled naturally by the component split: `SystemMessageBubble` does not render `MessageActionsMenu`.

### 10.3 System messages and "isOwn"

System messages have no `user` field. The `MessageList` currently checks `message.user.id === currentUserId` to determine ownership. **This access MUST be moved inside the user message branch** (after the `isUserChatMessage` guard) to prevent a runtime crash. See section 4.3 for the correct structure.

### 10.4 Optimistic updates for edit/delete on system messages

The `handleEdit` and `handleDelete` functions in `ConversationView` update messages by ID. While system messages cannot be edited or deleted at runtime, **TypeScript cannot prove this statically**. Spreading user-specific fields (`deletedDate`, `content`, `updatedDate`) onto the `ChatMessageNode` union will fail type-checking. `handleDelete` needs an `isUserChatMessage` guard. `handleEdit` already checks `__typename === "TextChatMessage"` which narrows correctly. See section 4.5 for the fix.

### 10.5 Last message in room list is a system message

When a member joins/leaves, the server may send a system message that becomes the newest message in the room. The `ChatRoomListItem` preview logic must handle this case (covered in section 4.6). The `deletedDate` check must be inside a `isUserChatMessage` guard since system messages don't have `deletedDate`.

### 10.6 WebSocket event with system message in `chatMessage` field

`ChatMessageSentEvent.chatMessage` is typed as `ChatMessage` in the schema. When a `MemberJoinedChatMessage` or `MemberLeftChatMessage` is sent, the event payload will contain a system message. The frontend's `handleIncomingMessage` appends it to the message list. The `MessageList` then routes it to `SystemMessageBubble`. This works correctly without any special handling.

---

## 11. No Schema Changes Required

The backend schema fully supports all operations needed for this feature. No schema changes are suggested.

---

## 12. shadcn/ui Components

No new shadcn/ui components are needed. The `SystemMessageBubble` uses only basic Tailwind classes consistent with the existing system message rendering style (centered, muted, italic text).
