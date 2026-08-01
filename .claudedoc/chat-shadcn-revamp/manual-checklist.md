# Chat Revamp — Manual Verification Checklist

Covers behaviors the Playwright/MSW harness cannot automate (WebSocket-driven
real-time, multi-participant, reconnect) plus the visual/feel checks a single-PR
full-surface rewrite requires. Run with two browsers signed in as two mutual-follow
users (A and B) sharing a DM and a group room. Check each item in both light and
dark themes; run the mobile section in a phone-width viewport.

## Real-time (two participants)

- [ ] B sends a text message → appears live for A without refresh; A pinned at the
      bottom auto-scrolls; A scrolled up does NOT get yanked and the jump-to-latest
      arrow is available.
- [ ] B edits a message → A sees the new content and the "edited" indicator live.
- [ ] B deletes a message → A sees the deleted placeholder live.
- [ ] B deletes/edits the exact message A is inline-editing → A's editor closes with
      the "editing interrupted" notice; A's stale draft is NOT applied.
- [ ] B deletes a message that A's later message replies to → A's reply quote flips
      to the deleted placeholder.
- [ ] A sends a message → it appears exactly once (no double-post from the echo).
- [ ] Room list: a message arriving in a room A doesn't have open shows the unread
      dot and reorders that room to the top; opening the room clears the dot.
- [ ] Group: B (owner) adds/removes a member while A has the members panel open →
      roster updates live; removing A kicks A out immediately.

## Reconnect

- [ ] With a reply staged, a file attached, and a caption typed: kill the network
      (devtools offline) until the socket drops, then restore. On reconnect the
      composer keeps the reply + attachment + caption; the thread does not remount
      or flash a full-pane loading state.
- [ ] While offline, B sends 2–3 messages → on reconnect they appear merged into
      the thread in order; A's scroll position is preserved if A was reading history.
- [ ] While offline, B sends >25 messages → on reconnect the thread performs the
      honest reset (fresh newest page, scrolled to bottom) rather than showing a
      silent gap.

## Composer state machine

- [ ] Reply + attachment + caption all visible at once; dismissing the reply keeps
      the attachment/caption; removing the attachment keeps the typed text as a
      normal message draft and keeps the reply.
- [ ] Enter with attachment staged sends media + caption (+ reply target if set);
      Shift+Enter inserts a newline.
- [ ] Send in flight: attach menu, remove-attachment, and textarea are disabled;
      nothing can be re-staged or cleared mid-send.
- [ ] Upload failure: attachment is retained for retry; error toast shown.
- [ ] Caption > 5000 chars with media staged: Send disabled + caption-specific
      inline error. Text > 5000 without media: Send disabled + message-specific
      error.
- [ ] DM where mutual follow was just lost: send fails, composer flips to the
      banner, and the error restates the attempted text so nothing is silently lost.

## Thread rendering & scrolling

- [ ] Open a long room: lands at the newest message; scrolling to the top loads
      older history with ZERO visual jump — including when the loaded page is the
      same calendar day as the current top (the prepend-restore case).
- [ ] Load-older failure (kill network, scroll to top): error toast; restoring the
      network and scrolling again retries (no dead-end).
- [ ] Day separators: correct Today/Yesterday/absolute labels in the viewer's local
      timezone; a sender run spanning midnight regroups after the separator (avatar
      + name shown again).
- [ ] Reply quote tap: jumps + highlights when loaded; shows the "original not
      available" notice when the original isn't loaded (deep history).
- [ ] Received file message renders as a file chip with name/size/download; images
      open full-size; videos play inline; captions render with media.

## Accessibility & mobile

- [ ] Keyboard-only pass: reply/edit/delete via the actions menu, jump-to-latest,
      members, back — all reachable and operable without a mouse.
- [ ] Screen reader (VoiceOver/NVDA spot-check): incoming messages announced
      politely; loading older history does NOT announce 25 old messages; day
      separators are not read as content.
- [ ] OS reduced-motion enabled: jump-to-latest and reply-jump scroll instantly
      (no smooth animation); highlight flash is subdued/absent.
- [ ] Mobile viewport: single-pane nav with back; composer + send visible above the
      on-screen keyboard; staging an attachment does not force the keyboard open;
      all touch targets (send, attach, actions, members, back) comfortably tappable
      (≥44px); tab bar does not overlap the conversation.

## Cross-cutting

- [ ] Both themes: own-vs-others bubbles clearly distinguished; contrast holds.
- [ ] Members panel: add/remove/promote/demote/transfer/leave flows intact; joined
      dates render in the app locale; names use display names.
- [ ] Create DM (idempotent — reopens existing) and create group (2+ members,
      name required) flows intact.
