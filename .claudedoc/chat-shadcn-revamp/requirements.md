# Chat Revamp — Requirements

## Overview

The chat experience is being visually and structurally rebuilt on the project's
new chat design system. This is a full front-of-house refresh: the conversation
view, the message input, the room list, the members panel, and the create/direct-message
dialogs all adopt the new look. Two new user-facing capabilities ship alongside the
refresh: day separators in the message thread and the ability to add a caption when
sending a photo or video.

This is a single-PR effort. Every behavior that exists today must survive unless it is
explicitly listed as changed below, and the two new capabilities must be present.

## Goals

- Give chat a cohesive, modern look consistent with the rest of the redesigned app.
- Preserve the complete existing feature set — nothing users rely on today disappears.
- Add day separators so long threads are easier to scan by date.
- Let people caption media at the moment they send it (today they cannot).

## Non-Goals (explicitly out of scope this iteration)

- Message reactions (emoji on a message).
- Link previews or auto-linkification of URLs in message text.
- Typing / "is typing…" indicators.
- Any change to who can chat with whom, how rooms are created, roles, or permissions.
- Read receipts or per-message read state beyond the existing session-local unread dot.
- Generic file upload from the composer (only images and videos can be sent today; that
  limit is kept — see the composer inventory).
- Profile-picture avatars in chat. Chat avatars remain initials-only, as today; real
  profile pictures would require new fields on chat data and are a future iteration.
- Backend/API changes. Both new capabilities are achievable client-side: the existing
  send-media operation already accepts an optional caption and reply target, and day
  separators derive from existing timestamps.

## Users and Access

- Chat is available only to authenticated users. Unauthenticated visitors are redirected
  away, exactly as today.
- Direct messages remain gated on a mutual-follow relationship. If two people no longer
  follow each other, the conversation stays visible but sending is disabled with the
  existing explanatory banner.
- Group chats remain invite-only via the members panel; roles (Owner / Admin / Member)
  govern who can add, remove, promote, demote, transfer ownership, and delete others'
  messages.

## Feature-Parity Inventory (must all survive the revamp)

### Layout and navigation

- Two-pane layout on desktop: room list on the left, active conversation on the right.
- Empty right pane shows a "select or start a conversation" prompt when no room is open.
- The open room is reflected in the URL so a conversation can be linked to / refreshed
  into directly.

### Room list

- "New Chat" entry point at the top of the list.
- Each room row shows: an avatar (initials), the room/person display name, a preview of
  the last message, and a relative timestamp.
- Last-message preview handles every message kind: text (truncated), image ("[Image]"),
  file ("[File]"), a deleted message (shown in the deleted style), and system notes
  (e.g. "X joined the chat").
- Unread dot: reflects activity received during the current session while the room was
  not open. It is session-local (not persisted across reloads, not server-backed read
  state); opening the room clears it for the session. This matches today's behavior.
- Rooms reorder to the top when they receive new activity.
- Infinite scroll to load older rooms as the user scrolls.
- Empty state when the user has no conversations, including a path to find people to
  message.

### Conversation header

- Shows the room / other-person display name.
- Members button opens the members panel.
- Back affordance to return to the room list on mobile.

### Message thread

- Chronological thread (oldest at top, newest at bottom), paginated backward to load
  older history. Auto-scrolls to the newest message on open and when a new message
  arrives while the user is at the bottom.
- When the user has scrolled up, a "jump to latest" affordance appears instead of yanking
  them down; new activity does not force-scroll them.
- Loads older messages as the user scrolls toward the top, preserving their scroll position
  when older history is prepended (no visual jump).
- Messages from the same sender in an unbroken run are grouped: the sender's identity
  (avatar + name + time) shows once at the start of the run; subsequent messages are
  visually attached, with their timestamp revealed on hover/focus.
- Own messages and others' messages are visually distinguished and aligned per the new
  design (see Visual Direction).
- Message content types, all preserved:
  - Text, with line breaks respected.
  - Image — shown inline as a thumbnail that opens the full image.
  - Video — inline player with controls.
  - File — received file messages render as a file chip showing name and size with a
    download affordance. (Files cannot be *sent* from the composer — see Non-Goals —
    but must continue to render when received.)
  - Media captions — when a media message has a caption, it displays with the media.
- Replies: a message can quote the message it replies to, showing the original author and a
  content snippet; tapping the quote jumps to the original in the thread and briefly
  highlights it.
  - The quoted snippet is a point-in-time copy. When the client knows the quoted message
    was deleted (via a live event or loaded data), the snippet shows the deleted
    placeholder; an unknowing stale snippet is acceptable.
  - If the quoted original is not currently loaded in the thread, tapping the quote gives
    clear feedback (a brief "original not available" notice) — never a silent no-op.
    Auto-loading history until the original is found is not required this iteration.
- Edited messages show an "edited" indicator.
- Deleted messages show a "this message was deleted" placeholder in a muted/italic style,
  in place of their original content.
- System messages (member joined / member left) render as centered, non-bubble notices.

### Message actions

- Per-message action affordance (revealed on hover/focus) offering:
  - Reply — available on any message.
  - Edit — only on the user's own text messages.
  - Delete — on the user's own messages, and on any message for Owners/Admins.
- Delete asks for confirmation before removing.
- Inline edit: editing happens in place with save/cancel; keyboard shortcuts (submit on
  Enter, cancel on Escape) are preserved. Only text messages are editable.

### Message input (composer)

- Text composer with a placeholder; sends on Enter, inserts a newline on Shift+Enter.
- Attachment entry point to pick a photo or video (today's accepted types and size limits
  are kept).
- Send affordance, with a busy/loading state while a message or upload is in flight.
- Composer coexistence (changed from today, per the caption capability): the reply
  preview, the attachment preview, and the text/caption field can all be visible at
  once. Attaching media no longer clears an active reply. See New Capabilities §2 for
  the full state model.
- Reply composition: when replying, a dismissible preview of the quoted message sits above
  the composer.
- Attachment staging: a chosen file shows a pre-send preview (image thumbnail or a video
  representation) with its name and size and a remove control.
- File validation before send: unsupported types and oversized files are rejected with a
  clear inline error, using the existing size/type limits.
- When sending is disabled for a DM (mutual-follow lost), the composer is replaced by the
  existing explanatory banner.

### Members panel

- Roster of members with name, role badge (in group chats), and joined date; the current
  user is marked as "(You)".
- Member names use the same display-name convention as the rest of chat; the joined date
  uses app-locale-aware formatting (today it uses a different name helper and the browser
  locale — align both during the revamp).
- Add members via the mutual-follow picker (group chats only).
- Remove a member, subject to role rules.
- Promote to Admin / demote to Member (Owner only).
- Transfer ownership (Owner → Admin), with confirmation; the previous owner becomes a
  regular member.
- Leave chat (non-owners), with confirmation; owners are told to transfer ownership first.
- Direct-message rooms show the panel without the group-management controls.

### Create / direct-message flow

- New-chat picker over mutual follows.
- Selecting exactly one person creates (or reopens) a direct message; the flow is idempotent
  so it never creates duplicate DMs.
- Selecting two or more people creates a group and requires a group name.
- Mutual-follow requirement is enforced with a clear message when it isn't met.

### Real-time behavior

- Live updates via the existing subscription: incoming messages, edits, and deletions appear
  without refresh; membership changes update the roster live.
- Rooms surface unread state and reorder on new activity in real time.
- On reconnect after a dropped connection, the room list and the open thread re-sync.
  Re-syncing must not unmount or clear the composer (typed text, staged attachment,
  caption, reply-in-progress all survive), must not force-scroll a user who was reading
  older history, and reconciles new messages into the existing thread rather than
  replacing the whole pane with a loading state.
- If a message the viewer is currently inline-editing is deleted or updated by a
  real-time event, the inline editor closes and the viewer sees a non-blocking notice;
  the stale edit is abandoned, never silently applied.
- The user's own just-sent message and its echoed real-time event never double-post.
- Being removed from a room, or another member joining/leaving, is reflected immediately.

### Error handling (preserve today's behavior, with two strengthenings)

- Failures to load a room, load messages, send, edit, delete, create a room, or manage members
  surface a clear, non-blocking notification; the app does not crash or lose the user's place.
- A message that fails to send does not appear as sent.
- Loss of the mutual-follow relationship discovered at send time flips the conversation into
  the send-disabled state with its banner — but the just-attempted content must not be
  silently destroyed: at minimum the attempted text is restated in the visible error so the
  user can recover it.

## New Capabilities

### 1. Day separators in the thread

- The message thread groups messages by calendar day. A slim, centered separator marks the
  boundary between days.
- The separator label is human-friendly and localized: "Today", "Yesterday", and an absolute
  date for older days — locale-aware month + day (e.g. "March 3"), including the year when
  it differs from the current year (e.g. "March 3, 2025").
- A separator appears above the first message of each new day, including at the very top of
  the loaded history. As older history is loaded above, separators continue to render
  correctly for the newly revealed days.
- A day boundary always breaks a sender-grouping run: the first message after any day
  separator renders as the start of a new group (avatar + name + time shown), even when
  the same sender wrote the message immediately before the separator.
- System notices (joined/left) sit within their day like any other message and do not get
  their own separators.
- Separators are purely presentational — they are derived from existing message timestamps,
  add no new data, and are not themselves selectable or actionable.
- Day boundaries are computed in the viewer's local timezone: "Today" means the viewer's
  today. Two viewers in different timezones may see the same message under different
  day labels, and that is correct.
- Relative labels ("Today"/"Yesterday") need not update live if the thread stays open
  across midnight; refreshing on the next interaction or load is acceptable.

### 2. Caption when sending media

- When a user stages a photo or video to send, they can also type a caption in the same
  composer before sending — the text field and the attachment preview coexist (today,
  staging a file hides the text field, so captions are impossible on send).
- Composer state model (decided): reply preview, attachment preview, and caption/text
  field may all be present simultaneously. Attaching media while composing a reply keeps
  the reply; sending delivers media + caption + reply target as one message. Dismissing
  the reply preview removes only the reply; removing the attachment removes only the
  attachment.
- Sending delivers the media and its caption together as a single message; the caption then
  displays beneath/with the media in the thread, exactly as captioned media already renders.
- The caption is optional — sending with an empty caption behaves like sending media alone.
- Pressing Enter with a staged attachment sends the media (with whatever caption is present);
  Shift+Enter still inserts a newline in the caption.
- Removing a staged attachment retains any typed caption as ordinary composer text.
- The caption shares the text-message length limit (5,000 characters) and is trimmed of
  incidental whitespace before sending. While media is staged, an over-limit caption
  disables Send and shows an inline error (new localized string).

## Visual Direction

Adopt the new chat design system's look wholesale rather than re-skinning the current styling.
Own vs. others' messages, bubble surfaces, avatars, grouping, attachments/file chips, and system
notices should all follow the new system's default anatomy and styling. Where the new system's
defaults differ from today's incidental styling (spacing, corner treatment, timestamp placement,
hover affordances), prefer the new system's defaults. Chat avatars remain initials-only (see
Non-Goals). The two constants that must not regress are (a) a clear visual distinction between
the user's own messages and others', and (b) legibility and contrast in both light and dark
themes. All new or moved user-facing text needs localized strings; reuse existing chat strings
where the wording is unchanged.

## Accessibility & Interaction Standards

- Every message action (reply, edit, delete, jump-to-original, jump-to-latest, members,
  back) is reachable and operable by keyboard, not only on hover.
- Incoming messages are announced to screen readers unobtrusively (without stealing focus
  or interrupting); day separators and other decorative elements are not announced as
  content.
- Motion (auto-scroll easing, the reply-highlight flash, separator/affordance transitions)
  respects the user's reduced-motion preference: reduced or disabled, never removed
  functionality.
- Staging an attachment must not force the on-screen keyboard open on mobile; focus moves
  to the caption field only from an explicit user action.
- Pasting into the composer and caption field always works.
- Dates, times, and relative labels use locale-aware formatting throughout — no hardcoded
  date shapes — and render identically on first load and after hydration.

## Copy Conventions

- All user-facing text is localized; reuse existing chat strings where wording is unchanged.
  Three currently-unlocalized loading strings must be localized during the revamp (the
  conversation pane, the thread's load-older indicator, and the room list) — and new
  strings are needed for "Today" and the day-separator labels, the caption over-limit
  error, and the "original not available" reply-jump notice.
- Loading states end with the ellipsis character ("Loading…", "Sending…") — "…", never "...".
- Buttons and headings use Title Case; counts use numerals.
- Error copy states what happened and what the user can do next, not just the problem.

## Mobile Expectations

- Preserve the current single-pane mobile model: the room list and the open conversation are
  separate full-width views, with a back affordance returning from a conversation to the list.
- All interactive controls (send, attach, per-message actions, members, back) present a
  touch target of at least 44×44px. (Today's attach button is narrower — fix during the
  revamp.)
- With the on-screen keyboard open, the composer and its send control remain visible above
  the keyboard, and staged-attachment + caption entry can be used without the thread being
  fully obscured.
- Day separators, message grouping, and the jump-to-latest affordance behave the same on mobile
  as on desktop.
- No regression to the existing page framing (the conversation area must not be overlapped by
  app chrome such as the mobile tab bar).

## Validation Expectations (single-PR rollout)

Because this is a single PR touching the entire chat surface, validation must cover the full
feature-parity inventory, not just the visual change:

- Unit tests are required for the pure derivation logic: day-separator placement (including
  midnight boundaries and sender runs spanning midnight), day-label selection
  (Today / Yesterday / absolute date / year-qualified date), and message grouping.
- Automated end-to-end: the existing Playwright chat coverage must pass. Assume the revamp
  breaks essentially all chat selectors — plan for a full selector rewrite, not a patch.
  Add coverage for the two new capabilities (a day separator appears at a day boundary; a
  captioned media message can be sent and the caption renders).
- Known harness limitation, acknowledged: WebSocket-driven behaviors (incoming messages,
  live edit/delete, membership changes, unread/reorder, reconnect) are not covered by the
  Playwright/MSW fetch-intercept harness. These are validated manually against a written
  checklist covering: receive/edit/delete from a second participant, the editor-close-on-
  remote-change rule, reconnect with an in-progress draft, unread + reordering, member
  add/remove while the room is open, and no double-posting of own messages.
- Manual pass across: sending/receiving text and each media type, captions on send (with and
  without a reply), replies and jump-to-original (including a not-loaded original), inline
  edit, delete + confirmation, grouping and day separators (including a midnight-spanning
  run), the full members panel (add/remove/promote/demote/transfer/leave), DM
  vs. group differences, the send-disabled DM banner with attempted-content
  recovery, and the create-DM / create-group flows.
- Both light and dark themes, and both desktop two-pane and mobile single-pane layouts.
- Confirm no scroll jumps when older history loads.
