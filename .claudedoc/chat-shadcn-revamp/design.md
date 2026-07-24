# Chat Revamp — Technical Design

Design owner: principal engineer (design agent).
Source of truth for behavior: `.claudedoc/chat-shadcn-revamp/requirements.md` (final, adversarially
reviewed). This document decides **how** it is built; it does not reopen product decisions.

This is a single-PR effort that rewrites the chat front-of-house onto the five installed shadcn chat
primitives, adds day separators and media captions, and hardens real-time behavior. No backend schema
changes: `SendMediaChatMessageInput` already accepts `caption` and `replyToId`; day separators derive
from existing timestamps.

> Revision note: this version incorporates the adversarial review (1 blocker + 7 should-fix + nits).
> The most consequential change is that **day separators are never standalone Content children** — they
> render *inside* the first `MessageScrollerItem` of each day — because the primitive's prepend-restore
> path only fires when the previous first child moves to index > 0. See §1.1, §3, §10.

---

## 0. Key architectural decisions (summary)

1. **The message thread runs on `MessageScroller`** (`src/components/ui/message-scroller.tsx`),
   replacing the hand-rolled `ScrollArea` + `IntersectionObserver` + manual scroll-preservation in
   `message-list.tsx`. Provider config: `autoScroll`, `defaultScrollPosition="end"`,
   `scrollEdgeThreshold={100}`. The primitive's `role=region`/`role=log` and jump-to-latest button come
   for free (see §7).
2. **Message rows use `Message` + `Bubble` anatomy**; **file chips use `Attachment`**; **image/video stay
   bespoke** inside `BubbleContent`; **day separators render as a `Marker` inside the first item of each
   day**; **system notices use a centered `Marker`** (visually distinct from day separators on purpose).
3. **Thread structure (separators + grouping) is derived by pure functions** in a new
   `chat-thread-utils.ts`, unit-tested under a pinned timezone.
4. **The composer is a single coexistence state machine**: reply preview + attachment preview +
   caption/text field are always independently present; one `content` field doubles as text and caption;
   the whole composer disables while a send is in flight.
5. **Real-time is hardened in `conversation-view.tsx`**: reconnect reconciles into the existing thread
   without unmounting the composer or force-scrolling (with an honest reset when a >25-message gap is
   detected); a shared editor-abandon helper fires on remote edit/delete *and* on reconcile; deleted
   originals propagate into reply snippets; jump-to-original surfaces a "not loaded" notice.
6. **DM send-failure recovery**: the attempted text/caption is restated in the error toast before the
   composer is replaced by the banner.
7. **Two client-only contract touches**: `replyTo { deletedDate }` selection (authoritative deleted-reply
   snippets on load) and `sendMediaMessage` passing caption + replyToId.

---

## 1. Component-by-component mapping

Directory: `src/components/chat/`. Legend: **Rewrite** · **Restyle** · **Light** · **New** · **Delete**.

| File | Disposition | Notes |
| --- | --- | --- |
| `message-list.tsx` | **Rewrite** | `MessageScroller`; day separators + grouping via `buildThreadItems`; edge-triggered load-older with an **overlay** loading indicator (no Content sentinel child); jump-to-latest = primitive `MessageScrollerButton`. All existing `ScrollArea`/`IntersectionObserver`/scroll-preservation/`showNewMessageIndicator` code is removed. |
| `message-bubble.tsx` | **Rewrite** | `Message` + `MessageAvatar` + `MessageContent` + `MessageHeader`/`MessageFooter` + `Bubble`/`BubbleContent`. Own vs. others via `Bubble variant` + `align`. |
| `system-message-bubble.tsx` | **Rewrite** | Centered `Marker` (default variant, no flanking lines) — deliberately distinct from day separators. |
| `message-input.tsx` | **Rewrite** | Composer coexistence state machine (§2). |
| `chat-attachment-preview.tsx` | **Rewrite** | `Attachment` primitive anatomy. |
| `reply-preview.tsx` | **Restyle** | Reused as composer reply preview + in-bubble reply quote; typography components; keyboard-reachable jump button; ≥44px dismiss. |
| `chat-attachment-menu.tsx` | **Light** | Fix touch target to ≥44×44 (§7). |
| `message-actions-menu.tsx` | **Light** | Trigger ≥44px touch target on mobile; keep dropdown + labels. |
| `conversation-header.tsx` | **Restyle** | Adopt look; back/members icon buttons ≥44px on mobile. |
| `conversation-view.tsx` | **Rewrite (logic)** | Reconnect reconcile + gap reset, editor-abandon helper, new `onSendMedia` signature, jump-to-original notice, localized loading string (§5, §6). |
| `chat-room-list.tsx` | **Restyle** | Localize the room-list "Loading…"; keep `ScrollArea` + infinite scroll; adopt look. |
| `chat-room-list-item.tsx` | **Restyle** | Preview/unread logic unchanged; adopt look; typography. |
| `member-list-panel.tsx` | **Restyle** | Member name → `displayName`; joined date → `useFormatter().dateTime` (app locale); badge/look. |
| `create-chat-room-dialog.tsx` / `mutual-follow-selector.tsx` | **Light** | Already shadcn; adopt restyle; no flow change. |
| `delete-message-dialog.tsx` / `remove-member-dialog.tsx` | **Light** | Already `AlertDialog`; adopt restyle. |
| `chat-layout.tsx` | **Light** | Two-pane / mobile single-pane unchanged. |
| `message-button.tsx` | **Unchanged** | Profile "Message" CTA. |
| `dm-disabled-banner.tsx` | **Light** | Unchanged behavior (recovery handled by toast, §6). |
| `chat-utils.ts` | **Light** | Keep `formatMessageTime`, `formatRelativeTime`, `getChatRoomDisplayName`, `shouldShowSender` (reused by `buildThreadItems`). |
| `message-preview-utils.ts` | **Light** | `getReplyPreviewContent` gains a deleted-first check (§1.3, §5.3). |
| `chat-thread-utils.ts` | **New** | Pure derivation (§3). |
| `day-separator.tsx` | **New** | Renders a `Marker` with the localized label from `classifyDayLabel` + `useFormatter` (§3.4). |

**Deleted files: none.** `chat.newMessages` i18n key becomes orphaned by the jump-to-latest button and
is removed in the same PR.

### 1.1 New thread render tree (`message-list.tsx`)

Hooks must be called **inside** the provider (hard-won: they throw outside it), so the list is
`Provider > Root > MessageListInner`.

```
<MessageScrollerProvider
  autoScroll
  defaultScrollPosition="end"
  scrollEdgeThreshold={100}                         {/* restores the old 100px near-bottom follow window */}
>
  <MessageScroller className="flex-1">              {/* root is relative + size-full min-h-0 flex-col */}
    <MessageScrollerViewport ref={viewportRef} aria-label={t("thread.ariaLabel")}>
      <MessageScrollerContent
        className="gap-1 py-4"                        {/* override default gap-8 for chat density */}
        aria-busy={isLoadingOlder || undefined}       {/* suppress log announcements during older prepends — §7.1 */}
      >
        <MessageListInner … viewportRef={viewportRef} />   {/* useMessageScrollerScrollable / useMessageScroller live here */}
      </MessageScrollerContent>
    </MessageScrollerViewport>

    {/* Load-older indicator is an ABSOLUTE overlay (sibling of Viewport, inside Root) — NOT a Content child */}
    <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-2"
         aria-hidden="true">
      {isLoadingOlder && <Spinner … /> /* or TypographyMuted t("loading.messages") */}
    </div>

    <MessageScrollerButton
      direction="end"
      behavior={prefersReducedMotion ? "auto" : "smooth"}   {/* JS scroll respects reduced motion — §7.2 */}
      aria-label={t("thread.jumpToLatest")}
    />
  </MessageScroller>
</MessageScrollerProvider>
```

**Why no standalone separator or sentinel children (BLOCKER fix).** The primitive's prepend-restore
runs only when the *previous first child of Content* moves to index > 0
(`q = w ? u.indexOf(w) : -1; if (preserveScrollOnPrependRef.current && q > 0) restore()`). A standalone
day-separator (or a top sentinel) sitting at index 0 stays at index 0 when older **same-day** messages
are prepended (its day is still the first day), so `q === 0`, restore is skipped, and the viewport jumps.
Therefore:

- **No standalone separator children.** `buildThreadItems` flags `isDayStart` on message items; the day
  `Marker` renders *inside* the first `MessageScrollerItem` of the day, above the bubble (§1.2, §3).
- **No top sentinel child.** Load-older is driven purely by the §10.2 edge trigger + §10.3 short-thread
  fallback; the loading indicator is the absolute overlay above.
- **Every Content child is a `MessageScrollerItem` keyed by a stable message id.** After a same-day
  prepend the previous first item (a real message) moves to index > 0 → restore fires → no jump.

`MessageListInner` maps `buildThreadItems(messages)` to items:

```tsx
{threadItems.map((item) => (
  <MessageScrollerItem
    key={item.message.id}
    messageId={item.message.id}
    className={cn(item.isGroupStart && "mt-3")}
  >
    {item.isDayStart && <DaySeparator timestamp={item.dayTimestamp} />}
    {isUserChatMessage(item.message) ? (
      <MessageBubble message={item.message} isGroupStart={item.isGroupStart} … />
    ) : (
      <SystemMessageBubble message={item.message} />
    )}
  </MessageScrollerItem>
))}
```

The day `Marker` for the first day thus lives inside the very first item, and every subsequent day's
Marker inside that day's first item — no index-0 non-item ever exists.

### 1.2 New message row (`message-bubble.tsx`)

```
<Message align={isOwn ? "end" : "start"} id={`message-${id}`}>
  {!isOwn && (isGroupStart
     ? <MessageAvatar><Avatar size="sm"><AvatarFallback>{initials}</AvatarFallback></Avatar></MessageAvatar>
     : <div className="w-8 shrink-0" aria-hidden />)}          {/* continuation spacer keeps alignment */}
  <MessageContent>
    {isGroupStart && (
      <MessageHeader>
        <span className="font-semibold text-foreground">{displayName}</span>
        <span>{formatMessageTime(createdDate, locale, timeLabels)}</span>
      </MessageHeader>
    )}
    <Bubble variant={isOwn ? "default" : "muted"} align={isOwn ? "end" : "start"}>
      <BubbleContent>
        {replyTo && <ReplyQuote … onClick={() => onScrollToReply(replyTo.id)} />}
        {isDeleted ? <deleted placeholder />
          : isEditing && isText ? <inline edit form />
          : isText ? <text + edited indicator />
          : <media (image | video | Attachment file chip) + optional caption />}
      </BubbleContent>
    </Bubble>
    {!isGroupStart && !isDeleted && (
      <MessageFooter className="opacity-0 group-hover/message:opacity-100 group-focus-within/message:opacity-100 motion-safe:transition-opacity">
        {formatMessageTime(createdDate, locale, timeLabels)}
      </MessageFooter>
    )}
  </MessageContent>
  {!isDeleted && !isEditing && <MessageActionsMenu … className="…absolute…" />}
</Message>
```

- **Own vs. others** (must-not-regress): `Bubble variant="default"` (primary) vs. `"muted"`. Both are
  theme-aware → light/dark legibility. `align` drives left/right + header/footer justification.
- **Grouping:** header only on `isGroupStart`; continuation rows reveal a footer time on hover/focus
  (`group/message` provided by `Message`).
- **Media:** image/video bespoke inside `BubbleContent` (Attachment is a chip, not a viewer); received
  **file** chips use `Attachment` (`AttachmentMedia` icon + `AttachmentContent` title/description +
  `AttachmentActions` download). Caption text under the media in the same `BubbleContent`.
- **Deleted / edited / inline-edit:** same semantics as today (italic/muted placeholder; `(edited)`;
  in-place `Textarea` with Enter=submit, Escape=cancel).

### 1.3 Reply quote (`reply-preview.tsx` + `getReplyPreviewContent`)

One component, two contexts: in-bubble quote (a keyboard-reachable `<button>` firing `onScrollToReply`)
and composer reply preview (`<div>` + ≥44px dismiss `<button>`).

**Implementation requirement (review nit — current code is wrong for deleted media replies):**
`getReplyPreviewContent` today returns `[Image]`/`[File]` for a media reply because it checks the
resource type before deletion. The rewrite **must test deletion first**:

```ts
export function getReplyPreviewContent(
  replyTo: ChatMessageReplyTo,
  t: (key: string) => string,
  deletedIds: ReadonlySet<string>,
): string {
  if (replyTo.deletedDate != null || deletedIds.has(replyTo.id)) return t("message.deleted"); // FIRST
  if (replyTo.__typename === "TextChatMessage") return replyTo.content ?? t("message.deleted");
  return replyTo.caption
    ?? (replyTo.resource.__typename === "ImageResource"
        ? t("message.imageAttachment")
        : t("message.fileAttachment"));
}
```

`deletedIds` is derived in §5.3.

---

## 2. Composer state machine (`message-input.tsx`)

Decided coexistence model (requirements §New Capabilities 2): reply preview, attachment preview, and the
caption/text field may all be present simultaneously.

### 2.1 State

```ts
const [content, setContent] = useState("");                  // text AND caption (single field)
const [attachedFile, setAttachedFile] = useState<File | null>(null);
const [attachmentPreviewUrl, setAttachmentPreviewUrl] = useState<string | null>(null);
const [attachmentError, setAttachmentError] = useState<string | null>(null); // invalid type / too large
const [isSending, setIsSending] = useState(false);           // unifies old isSubmitting + isUploadingMedia
// replyTo is a prop from conversation-view; onClearReply clears it there.
```

Derived (server actions still validate authoritatively; use the shared constant):

```ts
import { CHAT_MESSAGE_MAX_LENGTH } from "@/lib/constants"; // = 5000 (new shared constant, §4.4)
const trimmed = content.trim();
const isOverLimit = content.length > CHAT_MESSAGE_MAX_LENGTH; // gate applies to BOTH paths
const hasFile = attachedFile !== null;
const canSend =
  !isSending && !disabled && !isOverLimit &&
  (hasFile ? !attachmentError : trimmed.length > 0);
```

### 2.2 Disabled-during-send contract (review item 2 — stated explicitly)

While `isSending` is true, the **entire composer input surface is disabled**: the attach menu, the
remove-attachment control, and the textarea all receive `disabled` (this matches current behavior —
keep it). In addition:

- `handleFileSelected` and `handleRemoveAttachment` **early-return when `isSending`** (defense in depth
  against a queued event firing mid-send).
- On send **success**, state is cleared with **functional updaters**, and the object URL to revoke is the
  one **captured at send start** (`urlAtSend`), so an in-flight completion can never revoke a
  newly-staged URL nor leak the old one.

### 2.3 Rendering (all sections independent)

```
{replyTo && <ReplyPreview … onDismiss={onClearReply} />}         {/* survives attaching media */}
{attachedFile && <ChatAttachmentPreview … onRemove={handleRemoveAttachment} disabled={isSending} />}
<div className="flex gap-2">
  <ChatAttachmentMenu … disabled={disabled || isSending} />       {/* ≥44px */}
  <Textarea
    value={content}
    onChange={…}
    onKeyDown={handleKeyDown}
    disabled={disabled || isSending}
    placeholder={hasFile ? t("message.captionPlaceholder") : t("message.placeholder")}
  />                                                               {/* ALWAYS rendered now */}
  <Button onClick={handleSend} disabled={!canSend}>{isSending ? spinner : send}</Button>
</div>
{isOverLimit && (
  <TypographyMuted className="text-destructive">
    {hasFile ? t("message.captionTooLong", { limit: CHAT_MESSAGE_MAX_LENGTH })
             : t("message.messageTooLong", { limit: CHAT_MESSAGE_MAX_LENGTH })}   {/* correct copy per path — review item 3 */}
  </TypographyMuted>
)}
```

The old `{!attachedFile && <Textarea/>}` guard is removed — the field is always visible so a caption can
be typed alongside staged media.

### 2.4 Transitions

- **Attach file** (`handleFileSelected`): early-return if `isSending`; `validateFile(file, "chatMedia")`;
  set `attachedFile`; build an image-only preview URL. **Do NOT** call `onClearReply` (removes today's
  "attach clears reply"). **Do NOT** programmatically focus the textarea (mobile: no forced keyboard —
  requirements §A11y). `content` retained.
- **Remove attachment** (`handleRemoveAttachment`): early-return if `isSending`; revoke preview URL;
  clear `attachedFile`/preview/error. **Retain `content`** (caption becomes text). Reply untouched.
- **Dismiss reply**: `onClearReply()` only.
- **Enter / Shift+Enter** (`handleKeyDown`): `Enter` (no shift) → `preventDefault()` + `handleSend()`;
  `Shift+Enter` → default newline. Paste works natively.

### 2.5 Send paths (`handleSend`)

```ts
async function handleSend() {
  if (!canSend) return;
  const urlAtSend = attachmentPreviewUrl;   // capture for safe revoke
  setIsSending(true);
  try {
    if (hasFile) {
      await onSendMedia(attachedFile!, trimmed || undefined, replyTo?.id); // media + caption + replyToId, one message
    } else {
      await onSendText(trimmed, replyTo?.id);
    }
    // success only — functional clears + revoke captured URL:
    if (urlAtSend) URL.revokeObjectURL(urlAtSend);
    setContent(""); setAttachedFile(null); setAttachmentPreviewUrl(null); setAttachmentError(null);
    onClearReply();
  } catch {
    // Failure: KEEP content + attachment + reply for retry (toast surfaced by conversation-view).
    // DM send-disabled: composer will be replaced by the banner; recovery text surfaced by
    // conversation-view's error handler (§6). Nothing to clear here.
  } finally {
    setIsSending(false);
  }
}
```

Behavior change vs. today: a **generic media failure keeps** the staged attachment + caption (today's
`catch` cleared them), mirroring the text path and preserving the user's place.

### 2.6 Prop signature change

```ts
onSendMedia: (file: File, caption?: string, replyToId?: string) => Promise<void>; // CHANGED
```

---

## 3. Day separators + grouping derivation (`chat-thread-utils.ts`)

All placement/grouping logic is pure and clock-independent (label classification takes an explicit
`now`), so the feature is unit-testable under a pinned timezone.

### 3.1 Types

```ts
export type DayKey = string; // "YYYY-MM-DD" in the viewer's local timezone

/** One render row. Day separators are NOT separate items — they render inside the first item of a day. */
export interface MessageThreadItem {
  message: ChatMessageNode;
  isGroupStart: boolean; // avatar + name + time shown (forced true after a day boundary)
  isDayStart: boolean;   // render the day Marker above this item
  dayKey: DayKey;
  dayTimestamp: string;  // === message.createdDate; used only to derive the day label
}
export type ThreadItem = MessageThreadItem;
```

### 3.2 `localDayKey`

```ts
/** Local-timezone calendar-day bucket (uses local getFullYear/getMonth/getDate → viewer tz). */
export function localDayKey(iso: string): DayKey {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
```

Viewer-timezone bucketing satisfies "'Today' means the viewer's today"; different-timezone viewers may
bucket the same message differently, which is correct.

### 3.3 `buildThreadItems`

```ts
/**
 * Pure. `messages` MUST be ascending by createdDate. Emits one item per message; the first message of
 * each local day carries isDayStart=true (its item renders the day Marker). A day boundary always forces
 * isGroupStart=true. System notices participate in grouping (they break runs via shouldShowSender) but
 * never get their own separator.
 */
export function buildThreadItems(messages: ChatMessageNode[]): MessageThreadItem[] {
  const items: MessageThreadItem[] = [];
  let prevDayKey: DayKey | null = null;
  for (let i = 0; i < messages.length; i++) {
    const message = messages[i];
    const dayKey = localDayKey(message.createdDate);
    const isDayStart = dayKey !== prevDayKey;
    const isGroupStart = isDayStart || shouldShowSender(messages, i); // reuse existing rule
    items.push({ message, isGroupStart, isDayStart, dayKey, dayTimestamp: message.createdDate });
    prevDayKey = dayKey;
  }
  return items;
}
```

The day-boundary OR guarantees the midnight-run break: same sender at 23:59 and 00:01 → the second
message is `isDayStart` and `isGroupStart`. `buildThreadItems` is re-run on the full (prepended) array
via `useMemo`, so newly revealed days get their Marker automatically — and because the Marker lives
inside the day's first item, prepend-restore still works (§1.1).

### 3.4 `classifyDayLabel` + `DaySeparator`

```ts
export type DayLabelKind =
  | { kind: "today" }
  | { kind: "yesterday" }
  | { kind: "date"; withYear: boolean };

/** Pure. Classifies `timestamp`'s local day relative to `now`'s local day. */
export function classifyDayLabel(timestamp: string, now: Date): DayLabelKind;
```

`day-separator.tsx` (client) resolves the label via next-intl (`now` captured once via `useNow()`; the
thread is client-rendered only, so no SSR/first-load mismatch):

```tsx
const kind = classifyDayLabel(timestamp, now);
const label =
  kind.kind === "today"     ? t("thread.today")
: kind.kind === "yesterday" ? tTime("yesterday")                                  // reuse existing string
: format.dateTime(new Date(timestamp),
    kind.withYear ? { month: "long", day: "numeric", year: "numeric" }
                  : { month: "long", day: "numeric" });                            // "March 3" / "March 3, 2025"

return (
  <Marker variant="separator" aria-hidden="true" className="my-2">   {/* decorative; not announced */}
    <MarkerContent>{label}</MarkerContent>
  </Marker>
);
```

"Relative labels need not update live across midnight" → `useNow()` without an interval is sufficient.

### 3.5 System notices vs. day separators

- **Day separator** = `Marker variant="separator"` (centered label + flanking hairlines), `aria-hidden`.
- **System notice** = `Marker` default, `className="justify-center"` (centered muted text, **no** lines,
  **announced** as content). Deliberately different so "joined/left" is never mistaken for a date.

---

## 4. Data flow, queries, mutations, types

### 4.1 `sendMediaMessage` — actions.ts (only contract-facing change)

```ts
const sendMediaMessageSchema = z.object({
  chatRoomId: z.string().min(1),
  resourceId: z.string().min(1),
  caption: z.string().max(CHAT_MESSAGE_MAX_LENGTH).optional(), // Zod v4: use { error } not invalid_type_error
  replyToId: z.string().min(1).optional(),
});

export async function sendMediaMessage(
  chatRoomId: string, resourceId: string, caption?: string, replyToId?: string,
): Promise<{ success: boolean; chatMessage?: ChatMessageNode; errorType?: string; message?: string }> {
  const parsed = sendMediaMessageSchema.safeParse({ chatRoomId, resourceId, caption, replyToId });
  if (!parsed.success) return { success: false, errorType: MutationErrorType.VALIDATION_ERROR, message: parsed.error.issues[0].message };
  // authMutate({ sendChatMessage: { __args: { input: { mediaMessage: {
  //   chatRoomId: parsed.data.chatRoomId,
  //   resourceId: parsed.data.resourceId,
  //   ...(parsed.data.caption ? { caption: parsed.data.caption } : {}),
  //   ...(parsed.data.replyToId ? { replyToId: parsed.data.replyToId } : {}),
  // } } }, … } })  — json-to-graphql-query object syntax
}
```

`chatMessageNodeSelection` already returns `caption` + `replyTo`, so the optimistic append renders
correctly. The composer trims the caption (`trimmed || undefined`) so all-whitespace is omitted.

### 4.2 `conversation-view` handler

```ts
const handleSendMedia = async (file: File, caption?: string, replyToId?: string) => {
  const uploadResult = await requestChatMediaUpload(file.name, file.type, file.size, roomId);
  // …request-upload + S3 (skipped when uploadUrl null for LOCAL) …
  const sendResult = await sendMediaMessage(roomId, uploadResult.resourceId, caption, replyToId); // CHANGED
  // …dedup append + onLastMessageUpdate …
};
```

### 4.3 Fragment + type change: authoritative deleted reply snippet

`src/lib/graphql-fragments.ts` — add `deletedDate` to the shared `replyTo` selection (server resolves it
live, so a reply whose original was deleted before load reports the deletion):

```ts
replyTo: {
  __typename: true, id: true, deletedDate: true,   // ADDED
  user: chatUserFragment,
  __on: [
    { __typeName: "TextChatMessage", content: true },
    { __typeName: "MediaChatMessage", caption: true, resource: resourceFragment },
  ],
},
```

`src/lib/types/chat.ts` — `ChatMessageReplyToBase` gains `deletedDate: string | null` (response type:
present, may be null). Client-only selection change; no schema change.

### 4.4 Shared constant

`src/lib/constants.ts` → `export const CHAT_MESSAGE_MAX_LENGTH = 5000;`. Reuse in the composer,
`sendMessageSchema` / `updateMessageSchema` / `sendMediaMessageSchema`, and the too-long strings.

### 4.5 Otherwise unchanged

`loadChatRoom`, `loadMessages` (backward `last`/`before`), `loadChatRooms`, member mutations,
subscription selection unchanged.

---

## 5. Real-time strengthenings (`conversation-view.tsx`)

### 5.1 Reconnect: reconcile, don't remount — with honest gap reset

**Problem today:** the reconnect effect sets `isLoading = true`; the `isLoading` branch returns a
full-pane loading placeholder that **unmounts `MessageInput`** (draft lost) and resets scroll.

**Design.** Reconnect must not touch `isLoading` (which gates only the initial-open placeholder). Add a
pure reconcile plus a **gap check** (review item 5 — the earlier "filled in later" claim was wrong:
`messagesPageInfo.startCursor` points at the *oldest* loaded message, so `before:startCursor` can only
fetch older, never a middle gap):

```ts
/** Pure. Merge the recent window into the existing thread by id; keep older loaded history; sort asc. */
export function reconcileMessages(
  prev: Edge<ChatMessageNode>[], incoming: Edge<ChatMessageNode>[],
): Edge<ChatMessageNode>[] {
  const byId = new Map(prev.map((e) => [e.node.id, e]));
  for (const e of incoming) byId.set(e.node.id, e);
  return [...byId.values()].sort(
    (a, b) => new Date(a.node.createdDate).getTime() - new Date(b.node.createdDate).getTime());
}

/** True when the newest window does NOT overlap the retained tail (>page arrived while offline). */
export function hasReconnectGap(
  prev: Edge<ChatMessageNode>[], incoming: Edge<ChatMessageNode>[],
): boolean {
  if (prev.length === 0 || incoming.length === 0) return false;
  const retainedNewest = Math.max(...prev.map((e) => new Date(e.node.createdDate).getTime()));
  const incomingOldest = Math.min(...incoming.map((e) => new Date(e.node.createdDate).getTime()));
  return incomingOldest > retainedNewest; // strict: no overlap → middle gap exists
}
```

Reconnect effect (keyed by `reconnectCounter`, `roomId`):

```ts
const [messagesData, roomData] = await Promise.all([loadMessages(roomId, 25), loadChatRoom(roomId)]);

if (roomData) {
  setRoom(roomData);
  onRoomLoaded(roomData);                          // re-sync chat-layout activeRoom/members (review nit)
  if (roomData.__typename === "DirectMessageChatRoom") setCanMessage(roomData.canMessage);
}

if (messagesData) {
  const prevById = new Map(messagesRef.current.map((e) => [e.node.id, e.node])); // for editor-abandon compare
  setMessages((prev) => {
    if (hasReconnectGap(prev, messagesData.edges)) {
      // Honest reset: the retained tail is disconnected from the newest window. Drop it and treat the
      // newest 25 as a fresh load; also adopt the fresh pageInfo so load-older resumes correctly.
      setMessagesPageInfo(messagesData.pageInfo);
      return messagesData.edges;
    }
    // No gap: reconcile in place; DO NOT overwrite messagesPageInfo (preserve the older-history cursor).
    return reconcileMessages(prev, messagesData.edges);
  });
  // Editor-abandon on reconcile (§5.2): compare the edited node before/after.
  maybeAbandonEditAfterReconcile(prevById, messagesData.edges);
}
// DO NOT set isLoading — the pane never unmounts the composer.
```

Consequences, stated honestly:
- **No gap (common):** older loaded history retained, cursor preserved, nodes updated in place, tail
  appended. The composer survives (pane never renders the loading placeholder). A user reading older
  history is not force-scrolled (`MessageScroller` follows the bottom only in `following-bottom` mode;
  stable ids keep position). New tail messages surface the jump-to-latest button.
- **Gap (>25 while offline, rare):** we cannot silently stitch a middle hole (it would corrupt grouping
  and day separators across the gap). We drop the retained tail and re-render the newest 25 as a fresh
  load — an **honest scroll reset to the bottom** via `defaultScrollPosition="end"`. Grouping/separators
  recompute cleanly. This is the correct trade-off over showing a broken thread.

Possible future API improvement to avoid the reset entirely: a forward "messages after cursor" / delta
query (see §9).

### 5.2 Editor abandon — shared helper, runs on events AND reconcile (review item 6)

Factor the abandon action + change-detection into one place:

```ts
function didUserMessageChange(prev: ChatMessageNode | undefined, next: ChatMessageNode): boolean {
  if (!prev) return true;                         // gone/replaced → treat as changed
  if (!isUserChatMessage(prev) || !isUserChatMessage(next)) return true;
  return prev.updatedDate !== next.updatedDate || prev.deletedDate !== next.deletedDate;
}
function abandonEdit() {                           // clear + non-blocking notice
  setEditingMessageId(null);
  toast.add({ title: t("notices.editingInterrupted"), type: "info" });
}
/** Reconcile path: close the editor if the edited message's node changed (or vanished). */
function maybeAbandonEditAfterReconcile(prevById: Map<string, ChatMessageNode>, incoming: Edge<ChatMessageNode>[]) {
  if (!editingMessageId) return;
  const next = incoming.find((e) => e.node.id === editingMessageId)?.node;
  if (next && didUserMessageChange(prevById.get(editingMessageId), next)) abandonEdit();
}
```

- **`handleIncomingUpdate` / `handleIncomingDelete`:** the event node *is* the change → if
  `message.id === editingMessageId`, call `abandonEdit()` after patching `messages`.
- **Reconnect path:** `maybeAbandonEditAfterReconcile` compares the edited message's previous node vs.
  the reconciled/fresh node; if changed, `abandonEdit()`. This closes the hole where a message
  edited/deleted by others *while disconnected* would otherwise let a stale edit be saved on reconnect.

The edit `Textarea` value lives in `MessageBubble` local state; forcing `isEditing=false` discards it —
the stale edit is never silently applied. (`messagesRef` mirrors `messages` so the reconnect closure can
read the pre-reconcile nodes without a stale-closure bug.)

### 5.3 Deleted-original propagation into reply snippets

`deletedMessageIds` (drives §1.3's deleted-first check for live in-session deletes of already-loaded
originals):

```ts
const deletedMessageIds = useMemo(
  () => new Set(messages.filter((e) => isUserChatMessage(e.node) && e.node.deletedDate).map((e) => e.node.id)),
  [messages],
);
```

`handleIncomingDelete` already replaces the node with `deletedDate` set → the set recomputes. Combined
with the authoritative `replyTo.deletedDate` (§4.3) this covers both loaded-data and live cases. Also
patch the composer's reply-in-progress: in `handleIncomingDelete`, if `replyTo?.id === message.id`,
`setReplyTo((r) => r && { ...r, deletedDate: new Date().toISOString() })`.

### 5.4 Jump-to-original "not loaded" notice

```ts
const { scrollToMessage } = useMessageScroller();
const onScrollToReply = (id: string) => {
  const ok = scrollToMessage(id, {
    align: "center",
    behavior: prefersReducedMotion ? "auto" : "smooth",   // JS scroll → pass "auto" (CSS classes don't affect scrollTo)
  });
  if (!ok) { toast.add({ title: t("notices.originalNotAvailable"), type: "info" }); return; }
  flashHighlight(id); // getElementById(`message-${id}`); content-visibility:auto items stay in the DOM
};
```

`scrollToMessage` returns `false` when the target isn't loaded → notice, never a silent no-op.
`flashHighlight` toggles the highlight background via a `motion-safe:` transition (this is a **CSS**
transition, so `motion-safe` is valid here); under reduced motion it shows a brief static background.

### 5.5 No double-post

Preserved: send handlers dedup by id before appending; the echoed `ChatMessageSentEvent` dedups on id;
stable `MessageScrollerItem` ids mean a duplicate id never renders.

---

## 6. DM send-failure content recovery

The send handlers know the attempted content; on `MutualFollowRequiredError` the composer unmounts (banner
replaces it), so recovery text is surfaced by `conversation-view`'s error handler:

```ts
function handleSendError(result, attempted: { text?: string }) {
  if (result.errorType === "MutualFollowRequiredError") {
    setCanMessage(false);
    toast.add({
      title: attempted.text
        ? t("errors.sendDisabledRecover", { content: attempted.text })  // restates attempted text/caption
        : t("errors.sendDisabledMedia"),                                 // media with no caption
      type: "error",
    });
    return;
  }
  toast.add({ title: result.message || t("errors.sendMessage"), type: "error" });
}
```

`handleSendText` passes `{ text: content }`; `handleSendMedia` passes `{ text: caption }` (may be
undefined → `sendDisabledMedia`). Satisfies "at minimum the attempted text is restated in the visible
error."

---

## 7. Accessibility & interaction

### 7.1 Free from the primitives (verified in `@shadcn/react` compiled source)

- `MessageScrollerViewport` → `role="region"`, `aria-label` (default "Messages" → override with
  `t("thread.ariaLabel")`), `tabIndex=0` (keyboard scroll region with arrow/Home/End/PageUp-Down).
- `MessageScrollerContent` → `role="log"` + `aria-relevant="additions"` → incoming messages announced
  **politely** (implicit `aria-live=polite`) without stealing focus — the requirement, for free.
- `MessageScrollerButton` → `inert`/`tabIndex=-1` when inactive, focusable when `data-active=true`.

**Suppress announcements during older prepends (review item 8).** `role=log` + `aria-relevant="additions"`
would otherwise announce prepended history as "new". Set `aria-busy` on the Content log while older
history loads: `<MessageScrollerContent aria-busy={isLoadingOlder || undefined}>`. Assistive tech pauses
live output while `aria-busy=true`; because the prepend completes within the busy window and no *new*
additions occur when it flips back to false, older history is not announced. Incoming **tail** messages
(never during `isLoadingOlder`) still announce normally.

### 7.2 What we add

- **Day separators** `aria-hidden="true"` (decorative, not announced as content).
- **All actions keyboard-reachable** (not hover-only): reply/edit/delete via `MessageActionsMenu`
  (focusable trigger + arrow-navigable menu); reply-quote jump is a `<button>`; back/members/attach are
  buttons; jump-to-latest is the primitive button; inline-edit Save/Cancel are buttons. Hover-reveal uses
  `group-focus-within`/`focus:` so keyboard focus reveals them.
- **Reduced motion** (reduced, not removed). Critical correction: **CSS `motion-safe` classes do NOT
  affect JS `scrollTo`.** For every JS-driven scroll, pass `behavior: "auto"` when reduced:
  - jump-to-latest → `<MessageScrollerButton behavior={prefersReducedMotion ? "auto" : "smooth"}>`;
  - `scrollToMessage(...)` → `behavior: prefersReducedMotion ? "auto" : "smooth"` (§5.4);
  - auto-follow on new messages already uses instant scroll.
  Purely-CSS motions (reply-highlight flash, hover/focus opacity) stay gated with `motion-safe:`.
  `prefersReducedMotion` comes from a `matchMedia("(prefers-reduced-motion: reduce)")` hook.
- **44×44 touch targets** (current gaps: Button `icon`=36px, `icon-lg`=40px):
  - **Attach button** (`chat-attachment-menu.tsx`, currently 40px wide) → ≥44px (`size-11`/`min-w-11`).
  - **Per-message action trigger** (`message-actions-menu.tsx`, currently 24px) → ≥44px touch target on
    mobile (expand tap area; keep the visual icon subtle).
  - **Back / members** (`conversation-header.tsx`, 36px) → ≥44px on mobile. Send (60px) OK.
- **Mobile keyboard**: staging an attachment does not auto-focus the caption field (§2.4).
- **Locale-aware, hydration-stable dates**: bubble/room-list via existing `Intl.DateTimeFormat` helpers;
  day-separator labels + member joined date via `useFormatter`.

---

## 8. i18n — new/changed strings (`messages/en.json`, under `chat`)

Loading strings end with "…" (never "..."); Title Case for buttons/headings; numerals for counts.

| Key | Value | Purpose |
| --- | --- | --- |
| `thread.today` | `Today` | Day separator (Yesterday reuses `time.yesterday`). |
| `thread.ariaLabel` | `Messages` | Localizes the scroller viewport `aria-label`. |
| `thread.jumpToLatest` | `Jump to Latest` | Jump-to-latest button label (replaces `newMessages`). |
| `loading.conversation` | `Loading conversation…` | Conversation pane (replaces hardcoded `Loading...`). |
| `loading.messages` | `Loading messages…` | Thread load-older overlay (replaces hardcoded). |
| `loading.rooms` | `Loading conversations…` | Room list (replaces hardcoded). |
| `message.captionPlaceholder` | `Add a caption…` | Textarea placeholder when media is staged. |
| `message.captionTooLong` | `Caption is too long. Keep it under {limit} characters.` | Over-limit, media staged. |
| `message.messageTooLong` | `Message is too long. Keep it under {limit} characters.` | Over-limit, no media. |
| `errors.loadOlder` | `Couldn't load older messages. Scroll up to try again.` | Failed load-older toast (§10.2). |
| `notices.originalNotAvailable` | `That message isn't loaded yet. Scroll up to find it.` | Jump-to-original miss. |
| `notices.editingInterrupted` | `This message changed, so your edit wasn't saved.` | Editor abandon (§5.2). |
| `errors.sendDisabledRecover` | `You can no longer message this person. Your unsent message: "{content}"` | DM send-disabled text/caption recovery. |
| `errors.sendDisabledMedia` | `You can no longer message this person, so your photo or video wasn't sent.` | DM send-disabled, media without caption. |

Reused unchanged: `time.yesterday`, `message.deleted`/`edited`/`imageAttachment`/`fileAttachment`,
`members.joined`, dialog strings. Orphaned: `chat.newMessages` (removed in the same PR).

---

## 9. Alternatives, trade-offs, API feedback

- **`MessageScroller` vs. bespoke scroll code.** Adopting the primitive is the point of the revamp,
  removes ~120 lines of fragile scroll/observer/preserve code, and yields `role=log`/`region` + the
  jump-to-latest button. Trade-off: we honor its prepend-restore contract (separators inside items,
  no index-0 non-item — §1.1) and its scrollable-store timing (§10).
- **`Attachment` for media vs. bespoke image/video.** `Attachment` is a chip; images/videos need a real
  viewer → bespoke in `BubbleContent`. Intentional.
- **Deleted-reply propagation** via `replyTo.deletedDate` (authoritative on load) + an in-session set
  (live deletes of loaded originals). Client-only selection change, no schema change.
- **Reconnect >25-message gap** is reset honestly (§5.1) rather than stitched. **API suggestion
  (non-blocking):** a forward "messages after cursor"/delta query would let reconnect fetch exactly the
  missed messages and avoid the reset.
- **CSS utility prerequisite (verify before implementation):** the primitives reference `scroll-fade-b`,
  `scroll-fade-x`, `scrollbar-thin`, `scrollbar-gutter-stable` (message-scroller.tsx, attachment.tsx),
  which are **not** defined in `src/app/globals.css` (`shimmer` and `contain-content` are fine). Either
  add the `@utility` definitions the shadcn registry expects, or accept cosmetic degradation (native
  scrollbars, no fade masks). Non-blocking; recommend adding them.

---

## 10. Hard-won `MessageScroller` notes (bake in)

1. **Provider config:** `autoScroll` + `defaultScrollPosition="end"` + `scrollEdgeThreshold={100}`
   (primitive default is 8px; 100px restores the old near-bottom follow window).
2. **Load-older is edge-triggered (no sentinel child).** `useMessageScrollerScrollable()` starts as a
   placeholder `{ start:false, end:false }` **before** measurement and updates on a deferred rAF (a stale
   window exists right after a prepend). A level-triggered `if (!start) load()` eagerly fetches every
   mount and double-fires in the stale window. Fire only on the true→false transition, via a prev-ref:

   ```ts
   const { start } = useMessageScrollerScrollable();
   const prevStart = useRef(start);
   useEffect(() => {
     const was = prevStart.current;
     prevStart.current = start;
     if (was && !start && hasOlderMessages && !isLoadingOlder) onLoadOlder();
   }, [start, hasOlderMessages, isLoadingOlder, onLoadOlder]);
   ```

   **On failure** (`handleLoadOlder` catch): toast `t("errors.loadOlder")` **and re-arm** the trigger by
   setting `prevStart.current = true`, so scrolling to the top again re-fires (a scroll-away/scroll-back
   otherwise wouldn't re-fire because the consumed transition left `prevStart=false`). Success path leaves
   `prevStart` as-is.

3. **Short-thread fallback (top edge unreachable → `start` never transitions).** Measure via a ref to the
   **viewport** (not a Content sentinel), in rAF, guarded, and **guarded against a failure busy-loop** by
   only firing when the item count changed:

   ```ts
   const lastFallbackCount = useRef(-1);
   useEffect(() => {
     if (!hasOlderMessages || isLoadingOlder) return;
     if (lastFallbackCount.current === threadItems.length) return; // don't re-fire on a failed attempt
     const raf = requestAnimationFrame(() => {
       const vp = viewportRef.current;
       if (vp && vp.scrollHeight <= vp.clientHeight) {
         lastFallbackCount.current = threadItems.length;
         onLoadOlder();
       }
     });
     return () => cancelAnimationFrame(raf);
   }, [hasOlderMessages, isLoadingOlder, onLoadOlder, threadItems.length, viewportRef]);
   ```

   (`viewportRef` is set via `<MessageScrollerViewport ref={viewportRef}>` — the primitive Viewport merges
   a passed ref; do **not** pass a ref to Root, which overwrites its own internal ref.)

4. **`preserveScrollOnPrepend` (default true) requires the previous first child to move to index > 0.**
   Standalone separators/sentinels at index 0 defeat it (BLOCKER). Every Content child is a
   `MessageScrollerItem` keyed by a stable server message id; separators render inside the day's first
   item (§1.1, §3.3). No optimistic temp ids in conversation-view.

5. **`scrollToMessage(messageId)`** targets `Item` `messageId` values and returns `false` when not loaded
   (drives §5.4). The highlight flash keeps using `getElementById(`message-\${id}`)` — `content-visibility:auto`
   items stay in the DOM.

6. **Root layout:** root is `relative size-full min-h-0`; `className="flex-1"` inside conversation-view's
   flex column is correct. The load-older overlay is an absolute sibling of Viewport inside Root.

7. **Hooks inside the provider only:** `Provider > Root > MessageListInner`.

---

## 11. Test plan

### 11.1 Unit tests (Vitest) — required for pure derivation, timezone pinned

**Pin the timezone** so `localDayKey`/`classifyDayLabel` are deterministic (they use local `Date`
methods). Set `TZ` for the vitest run — add `env: { TZ: "America/New_York" }` under `test` in the vitest
config (or `process.env.TZ = "America/New_York"` in a test-setup file) and document the pinned zone at the
top of the spec. Author fixtures in that zone, including at least one case where the **UTC day and the
local day differ** (e.g. `2025-03-03T04:30:00Z` = `2025-03-02 23:30` local) to prove local-tz bucketing;
avoid DST-transition dates.

New file `__tests__/components/chat/chat-thread-utils.test.ts` (mirrors the src path; follows
`participant-utils.test.ts`). `classifyDayLabel` receives an explicit `now`, never the wall clock.

`buildThreadItems` (returns message items with `isDayStart`/`isGroupStart`):
- Single day: exactly the first item has `isDayStart=true`; grouping matches `shouldShowSender`.
- Two days: the first item of day 2 has `isDayStart=true` and `isGroupStart=true`.
- **Midnight-spanning sender run:** same sender at 23:59 and 00:01 (local), <5 min apart → the second item
  is `isDayStart` and `isGroupStart` (day boundary overrides the 5-min rule).
- Cross-tz case: a message whose UTC and local days differ buckets by local day.
- System notice: breaks the run, sits inside its day, has `isDayStart` only if it is the day's first item;
  never produces a standalone separator.
- Prepend simulation: calling with an older-extended array yields correct `isDayStart` flags for revealed
  days.

`localDayKey`: same local day → equal keys; across local midnight → different keys; cross-tz difference.

`classifyDayLabel(now)`: today / yesterday / older-same-year (`withYear:false`) / previous-year
(`withYear:true`) / local-midnight boundary.

`reconcileMessages` / `hasReconnectGap`:
- reconcile upserts a changed node in place (edit/delete), inserts a new tail in sorted position, retains
  older history, dedups by id.
- `hasReconnectGap` false when the newest window overlaps the retained tail (≤page arrived); true when the
  newest window's oldest is strictly newer than the retained tail's newest (>page arrived).

### 11.2 Playwright — assume a full selector rewrite

- Prefer role/label/text selectors tied to i18n strings and the primitives' `data-slot` attributes
  (`[data-slot="bubble-content"]`, `[data-slot="message"]`, `[data-slot="attachment"]`,
  `[data-slot="marker"]`). Add a few `data-testid`s where ambiguous (`data-testid="day-separator"`;
  message rows keyed by `id="message-<id>"`).
- Keep the four existing specs in `tests/pages/chat.spec.ts` (unauth redirect, layout renders, rooms error,
  empty state), updating selectors.
- MSW factories in `tests/fixtures/mock-data/chat.ts`: (a) a room with messages spanning two calendar days;
  (b) a request-upload response with `uploadUrl: null` (LOCAL skips S3). **The `sendChatMessage` handler
  must branch on `input.mediaMessage` vs. `input.textMessage`** and, for the media branch, **echo back the
  provided `caption`** in the returned `MediaChatMessage` (otherwise the caption spec can't assert render).

Two new specs:
- `tests/pages/chat-day-separator.spec.ts`: open a room via `?room=…` whose messages straddle a day
  boundary; assert `[data-testid="day-separator"]` (and/or the localized "Today"/date text) is visible and
  the first message after the boundary shows its sender header.
- `tests/pages/chat-caption.spec.ts`: open a room; set the hidden file input's files; type a caption; click
  Send; assert the echoed caption renders with the media (LOCAL path).

### 11.3 Manual WebSocket checklist (harness can't cover fetch-intercepted WS)

Receive / edit / delete from a second participant; **editor abandon on remote change**; **reconnect with an
in-progress draft** (text + staged attachment + caption + reply-in-progress all survive; a user reading
older history is not force-scrolled; new messages reconcile — and, separately, verify the honest reset when
>25 messages arrived while offline); unread + reorder; member add/remove while open; no double-post;
deleted-original propagates into a visible reply snippet; jump-to-original not-loaded notice; DM
send-disabled recovery restates the attempted text/caption.

### 11.4 Manual functional pass + scroll-jump assertion

Text + each media type; captions on send (with and without a reply); replies + jump (incl. not-loaded
original); inline edit; delete + confirmation; grouping + day separators (incl. a midnight-spanning run);
full members panel; DM vs. group; create-DM / create-group; light + dark; desktop two-pane + mobile
single-pane.

**Explicit no-jump check (validates the BLOCKER fix):** with the thread scrolled up mid-history, trigger a
**same-day** older-history load and assert **zero `viewport.scrollTop` delta** across the prepend (capture
`scrollTop` before the fetch resolves and after the prepend paints; they must be equal). Repeat for a
cross-day prepend.

---

## 12. Implementation order (suggested)

1. `chat-thread-utils.ts` (+ `reconcileMessages`/`hasReconnectGap`) + unit tests with pinned `TZ`.
2. `src/lib/constants.ts` `CHAT_MESSAGE_MAX_LENGTH`; fragment/type change (§4.3–4.4);
   `actions.ts` `sendMediaMessage` caption/replyToId.
3. `message-list.tsx` on `MessageScroller` (§1.1, §10) with `MessageBubble`, `SystemMessageBubble`,
   `day-separator.tsx`; `getReplyPreviewContent` deleted-first.
4. `message-input.tsx` composer state machine + `chat-attachment-preview.tsx` + `chat-attachment-menu.tsx`.
5. `conversation-view.tsx` reconnect reconcile + gap reset, editor-abandon helper, deleted-reply
   propagation, jump notice, DM recovery, `onSendMedia` signature, `onRoomLoaded` on reconnect.
6. Restyle room list / row / header / members panel; localize the three loading strings.
7. i18n strings; a11y/touch/reduced-motion passes; verify CSS utilities (§9).
8. Playwright selector rewrite + two new specs + mock data (media/text branch); run unit + Playwright
   (chromium), incl. the same-day no-jump assertion.
