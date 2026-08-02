# QA Verification: Chat Revamp (shadcn chat primitives)

Branch: `0102-chat-shadcn-revamp`. Contract: `.claudedoc/chat-shadcn-revamp/requirements.md` (final).
Design: `.claudedoc/chat-shadcn-revamp/design.md`. Full diff: `git diff ce6443c...HEAD` (39 files,
+3950/-531), commits `0ea32cb`, `52add80`, `ea39cca`, `e33b7c4`, `b82784c`.

Method: every item below was checked against the actual implementation (not the design doc's word),
file:line cited. Status legend: **VERIFIED** (code demonstrably implements it), **PARTIAL**
(implemented with a caveat, noted), **NOT-IMPLEMENTED**, **MANUAL** (requires a human/second browser,
confirmed the manual checklist covers it).

---

## 1. Feature-Parity Inventory

### 1.1 Layout and navigation

| Item | Status | Evidence |
| --- | --- | --- |
| Two-pane desktop / single-pane mobile | VERIFIED | `chat-layout.tsx:254-304` (unchanged, no diff vs. pre-revamp) |
| Empty right pane prompt | VERIFIED | `chat-layout.tsx:294-303`, `chat.noConversation` string |
| Open room reflected in URL | VERIFIED | `chat-layout.tsx:93-100` (`router.replace(...?room=...)`) |

### 1.2 Room list

| Item | Status | Evidence |
| --- | --- | --- |
| "New Chat" entry point | VERIFIED | `chat-room-list.tsx:180-183,209-212` |
| Row: avatar/name/preview/relative time | VERIFIED | `chat-room-list-item.tsx:86-131` |
| Last-message preview for every kind (text/image/file/deleted/system) | VERIFIED | `chat-room-list-item.tsx:52-84` |
| Session-local unread dot, clears on open | VERIFIED (unchanged) | `chat-layout.tsx:79,128,149,212-217`; no diff to this logic |
| Reorder to top on activity | VERIFIED (unchanged) | `chat-room-list.tsx:99-121` (`roomListEvent` upsert prepends) |
| Infinite scroll (older rooms) | VERIFIED (unchanged) | `chat-room-list.tsx:136-173` |
| Empty state + path to find people | VERIFIED | `chat-room-list.tsx:176-204`, links to `/search` |

### 1.3 Conversation header

| Item | Status | Evidence |
| --- | --- | --- |
| Room/person display name | VERIFIED | `conversation-header.tsx:40-45` |
| Members button opens panel | VERIFIED | `conversation-header.tsx:48-56` |
| Back affordance (mobile) | VERIFIED | `conversation-header.tsx:29-38` (`md:hidden`) |

### 1.4 Message thread

| Item | Status | Evidence |
| --- | --- | --- |
| Chronological, paginated backward, auto-scroll on open/new-at-bottom | VERIFIED | `message-list.tsx:81-85` (`MessageScrollerProvider autoScroll defaultScrollPosition="end"`); primitive's "following-bottom" mode confirmed in `node_modules/@shadcn/react/dist/message-scroller/index.js` |
| Jump-to-latest when scrolled up; no force-scroll | VERIFIED | `message-list.tsx:123-127` (`MessageScrollerButton`); primitive tracks scroll intent (`userScrollIntent`) |
| Load older on scroll-to-top, no visual jump | VERIFIED | `message-list.tsx:169-210` (edge-triggered + short-thread fallback); Playwright: `tests/pages/chat.spec.ts:197-314` asserts `Math.abs(after-before) <= 100` across a same-day prepend |
| Sender grouping (avatar/name/time once per run, hover time on continuation) | VERIFIED | `chat-thread-utils.ts:46-66` (`buildThreadItems`/`shouldShowSender`); `message-bubble.tsx:106-125,261-265` |
| Own vs. others visually distinguished | VERIFIED | `message-bubble.tsx:127-130` (`Bubble variant="default"|"muted"`, `align`) |
| Text w/ line breaks | VERIFIED | `message-bubble.tsx:168-170` (`whitespace-pre-wrap`) |
| Image thumbnail → opens full image | VERIFIED | `message-bubble.tsx:179-195` (`<a target=_blank>` + `<img>`) |
| Video inline player w/ controls | VERIFIED | `message-bubble.tsx:196-204` (`<video controls>`) |
| File chip (name/size/download), receive-only | VERIFIED | `message-bubble.tsx:205-234` (`Attachment`/`AttachmentTrigger`/`AttachmentActions`); composer still can't send generic files (`chat-attachment-menu.tsx` accepts only `chatMedia`) |
| Media caption displays with media | VERIFIED | `message-bubble.tsx:236-240` |
| Reply quote: shows author+snippet, tap jumps+highlights | VERIFIED | `message-bubble.tsx:132-144`, `message-list.tsx:212-226` (`scrollToMessage` + `flashHighlight`) |
| Quoted snippet flips to deleted placeholder (loaded/live) | VERIFIED | `message-preview-utils.ts:32-49` (deleted-first check using `replyTo.deletedDate` + live `deletedMessageIds`); fragment change `graphql-fragments.ts` (+`deletedDate` on `replyTo`) |
| Jump-to-original "not loaded" notice, never silent no-op | VERIFIED | `message-list.tsx:212-226` (`toast.add(t("notices.originalNotAvailable"))` when `scrollToMessage` returns `false`) |
| Edited indicator | VERIFIED | `message-bubble.tsx:171-175` (`(edited)` on `updatedDate`) |
| Deleted placeholder, muted/italic | VERIFIED | `message-bubble.tsx:131,146-147` |
| System notices centered, non-bubble | VERIFIED | `system-message-bubble.tsx` (`Marker`, `justify-center`, no `Bubble`) |

### 1.5 Message actions

| Item | Status | Evidence |
| --- | --- | --- |
| Reply (any message), Edit (own text only), Delete (own, or Owner/Admin any) | VERIFIED | `message-actions-menu.tsx:57-68`, `message-bubble.tsx:76,250` |
| Delete confirmation | VERIFIED (unchanged) | `delete-message-dialog.tsx` (no diff — pre-existing `AlertDialog`), wired via `conversation-view.tsx:503-506,450-481` |
| Inline edit, Enter=submit / Escape=cancel | VERIFIED | `message-bubble.tsx:95-102,148-165` |
| **Baseline (self-triggered) inline-edit / delete flows have no automated test and no dedicated manual-checklist line** | **GAP (see §6, medium)** | see Gaps |

### 1.6 Message input (composer)

| Item | Status | Evidence |
| --- | --- | --- |
| Placeholder, Enter sends / Shift+Enter newline | VERIFIED | `message-input.tsx:108-114,196` |
| Attachment entry (photo/video, existing limits) | VERIFIED (unchanged) | `chat-attachment-menu.tsx` (`getAcceptAttribute("chatMedia")`, `validateFile`) |
| Busy/loading state while sending | VERIFIED | `message-input.tsx:52,75-105,208-212` (`isSending`, `Loader2`) |
| Coexistence: reply + attachment + caption all visible at once; attach no longer clears reply | VERIFIED | `message-input.tsx:116-149,162-184` (field always rendered; `handleFileSelected` never calls `onClearReply`) |
| Dismissible reply preview above composer | VERIFIED | `message-input.tsx:163-172`, `reply-preview.tsx:60-77` |
| Attachment staging preview (thumbnail/video icon, name/size, remove) | VERIFIED | `chat-attachment-preview.tsx` |
| File validation before send, clear inline error | VERIFIED | `message-input.tsx:120-133`, `chat-attachment-preview.tsx:55-59` |
| DM send-disabled → banner replaces composer | VERIFIED | `conversation-view.tsx:556-565` |

### 1.7 Members panel

| Item | Status | Evidence |
| --- | --- | --- |
| Roster: name, role badge (group), joined date, "(You)" | VERIFIED | `member-list-panel.tsx:268-301` — `t("you")` now localized (was hardcoded `" (You)"`) |
| Name uses `displayName`; joined date app-locale via `useFormatter` | VERIFIED (this was the pre-existing gap the requirements called out — now fixed) | `member-list-panel.tsx:268(diff),296-300` (was `getFullName` + `toLocaleDateString()`; now `member.user.displayName` + `format.dateTime(..., {dateStyle:"medium"})`) |
| Add via mutual-follow picker (group only) | VERIFIED (unchanged) | `member-list-panel.tsx:252-261,358-390` |
| Remove, role rules | VERIFIED (unchanged) | `member-list-panel.tsx:48-52,304-346` |
| Promote/demote (Owner only) | VERIFIED (unchanged) | `member-list-panel.tsx:306-325` |
| Transfer ownership + confirmation | VERIFIED (unchanged) | `member-list-panel.tsx:189-212,403-419` |
| Leave chat (non-owner) + confirmation; owner told to transfer first | VERIFIED (unchanged) | `member-list-panel.tsx:214-230,238-248,421-437` |
| DM panel hides group-management controls | VERIFIED (unchanged) | `member-list-panel.tsx:238,252,281,304` (`!isDirectMessage` guards) |

### 1.8 Create / DM flow

| Item | Status | Evidence |
| --- | --- | --- |
| New-chat picker over mutual follows | VERIFIED (unchanged, no diff) | `create-chat-room-dialog.tsx`, `mutual-follow-selector.tsx` |
| 1 person → idempotent DM; 2+ → group, name required | VERIFIED (unchanged) | `actions.ts` `createDirectMessage`/`createGroupChat`, unit-tested in `__tests__/[locale]/chat/actions.test.ts:379-540` |
| Mutual-follow requirement enforced w/ clear message | VERIFIED (unchanged) | `mutualFollowRequired` string, error surfacing in dialog |

### 1.9 Real-time behavior

| Item | Status | Evidence |
| --- | --- | --- |
| Live message/edit/delete, membership updates | MANUAL (WebSocket, not harness-coverable) | checklist "Real-time (two participants)" §1-3,8 |
| Unread + reorder live | MANUAL | checklist item 7 |
| Reconnect reconciles, doesn't unmount composer/force-scroll | VERIFIED (code) + MANUAL (behavioral) | `conversation-view.tsx:268-321` (`reconcileMessages`/`hasReconnectGap`, no `isLoading` touch); unit-tested pure logic in `chat-thread-utils.test.ts:224-298`; live behavior in checklist "Reconnect" §1-3 |
| Editor closes + notice on remote edit/delete of the message being edited | VERIFIED (code) + MANUAL | `conversation-view.tsx:46-57,111-115,148-182,304-314` (`didUserMessageChange`/`abandonEdit`/`maybeAbandonEditAfterReconcile`); checklist item 4 |
| No double-post of own message | VERIFIED (code) + MANUAL | dedup-by-id in `handleSendText`/`handleSendMedia`/`handleIncomingMessage` (`conversation-view.tsx:117-146,340-417`); checklist item 6 |
| Removal from room reflected immediately | VERIFIED (unchanged code) + MANUAL | `chat-layout.tsx:162-179` |

### 1.10 Error handling

| Item | Status | Evidence |
| --- | --- | --- |
| Clear, non-blocking failure notices; app doesn't crash | VERIFIED | `conversation-view.tsx` toasts throughout; `handleLoadOlder`/`triggerLoadOlder` toast + re-arm (`message-list.tsx:176-192`) |
| Failed send never appears as sent | VERIFIED | `message-input.tsx:89-95` (state kept on `catch`, nothing appended) |
| Mutual-follow lost at send time → banner, attempted content restated | VERIFIED | `conversation-view.tsx:323-338` (`handleSendError` → `sendDisabledRecover`/`sendDisabledMedia`), strings in `en.json` |

---

## 2. New Capabilities

### 2.1 Day separators

| Item | Status | Evidence |
| --- | --- | --- |
| Grouped by calendar day, slim centered separator | VERIFIED | `day-separator.tsx`, `Marker variant="separator"` |
| Label: Today / Yesterday / locale-aware absolute date (+year if different) | VERIFIED | `chat-thread-utils.ts:78-89` (`classifyDayLabel`), `day-separator.tsx:26-37`; unit-tested `chat-thread-utils.test.ts:85-129` |
| Separator above first message of each new day, incl. top of loaded history; correct after prepend | VERIFIED | `chat-thread-utils.ts:46-66` (`buildThreadItems`, re-run via `useMemo` on full array); unit-tested `chat-thread-utils.test.ts:202-221`; Playwright same-day-prepend spec `chat.spec.ts:197-314` |
| Day boundary always breaks sender-grouping run (even <5min, same sender) | VERIFIED | `chat-thread-utils.ts:54-55` (`isGroupStart = isDayStart \|\| shouldShowSender`); unit-tested `chat-thread-utils.test.ts:160-173` (midnight-spanning run) |
| System notices sit within their day, no own separator | VERIFIED | `chat-thread-utils.test.ts:188-200` |
| Purely presentational, not selectable/actionable | VERIFIED | `day-separator.tsx:41` (`aria-hidden="true"`, no click handler) |
| Computed in viewer's local timezone | VERIFIED | `chat-thread-utils.ts:26-37` (`localDayKey` uses local `Date` getters); cross-tz fixture in `chat-thread-utils.test.ts:78-82,175-186` |
| Relative labels need not update live across midnight | VERIFIED (by design) | `day-separator.tsx:24` (`useNow()`, no interval) |
| Playwright coverage | VERIFIED | `chat.spec.ts:64-157` (day-boundary render + label assertions + send-still-works) |

### 2.2 Caption on media send

| Item | Status | Evidence |
| --- | --- | --- |
| Type caption alongside staged media (text field always visible) | VERIFIED | `message-input.tsx:192-198` (old `{!attachedFile && <Textarea/>}` guard removed) |
| Coexistence model exactly as decided (reply/attachment/caption independent) | VERIFIED | `message-input.tsx` §2.3-2.4 logic; see §1.6 above |
| Send delivers media+caption as one message; renders with media | VERIFIED | `conversation-view.tsx:365-417` (`sendMediaMessage(roomId, resourceId, caption, replyToId)`); `actions.ts:405-459`; Playwright `chat.spec.ts:159-195` |
| Caption optional (empty behaves like media alone) | VERIFIED | `message-input.tsx:77` (`trimmed \|\| undefined`) |
| Enter sends media+caption; Shift+Enter newline in caption | VERIFIED | `message-input.tsx:108-114` (same handler regardless of `hasFile`) |
| Removing attachment retains caption as ordinary text | VERIFIED | `message-input.tsx:151-159` (`content` untouched) |
| Caption shares 5,000-char limit, trimmed before send, over-limit disables Send + inline error | VERIFIED | `constants.ts:224` (`CHAT_MESSAGE_MAX_LENGTH`), `message-input.tsx:54-61,205-211`, `actions.ts:35-40` (server-side `sendMediaMessageSchema`, defense-in-depth); unit-tested `__tests__/[locale]/chat/actions.test.ts:736-746` |

---

## 3. Accessibility & Interaction Standards

| Item | Status | Evidence |
| --- | --- | --- |
| Every action keyboard-reachable (reply/edit/delete/jump-to-original/jump-to-latest/members/back) | VERIFIED | `message-actions-menu.tsx:35-51` (opacity-hidden via CSS only, still in tab order + `group-focus-within/message`); `reply-preview.tsx:48-57` (real `<button>`); `MessageScrollerButton` gets real button semantics (`inert`/`tabIndex` toggling) per compiled primitive source |
| Incoming messages announced unobtrusively; day separators not announced as content | VERIFIED | Primitive: `Content` → `role="log" aria-relevant="additions"` (implicit polite live region), confirmed in `node_modules/@shadcn/react/dist/message-scroller/index.js`; `day-separator.tsx:41` `aria-hidden` |
| `aria-busy` suppresses log announcements during older-history prepends | VERIFIED | `message-list.tsx:88-91` (`aria-busy={isLoadingOlder \|\| undefined}` on `MessageScrollerContent`) |
| Reduced motion: reduced not removed, `behavior:"auto"` for all JS scrolls | VERIFIED | `use-prefers-reduced-motion.ts`; applied at `message-list.tsx:125,217`; CSS-only motion uses `motion-safe:`/`motion-reduce:` (`message-bubble.tsx:262`, `message-actions-menu.tsx:44`, `message-input.tsx:198`, `message-list.tsx:56`) |
| Staging attachment doesn't force mobile keyboard; focus only from explicit action | VERIFIED | `message-input.tsx:143-146` (comment + no `.focus()` call) |
| Paste always works in composer/caption | VERIFIED (by omission — no paste-blocking handler on the controlled `Textarea`) but **not explicitly covered by the manual checklist** | `message-input.tsx:181-188`; see Gaps §6 |
| Locale-aware dates/times, no hardcoded shapes, stable across hydration | VERIFIED | `chat-utils.ts` (`Intl.DateTimeFormat`), `day-separator.tsx` (`useFormatter`), `member-list-panel.tsx` (`useFormatter().dateTime`); thread/members render only after client-side fetch (no SSR of message content), avoiding hydration mismatch by construction |
| 44×44 touch targets (attach, per-message actions, back/members) | VERIFIED | `chat-attachment-menu.tsx:33` (`w-11`, h-60px), `message-actions-menu.tsx:44` (`size-11` mobile), `conversation-header.tsx:33,51` (`size-11`), `reply-preview.tsx:65-68` (`size-11`), `chat-attachment-preview.tsx:64` (`size-11`) |

---

## 4. Copy Conventions

| Item | Status | Evidence |
| --- | --- | --- |
| All user-facing text localized; reuse unchanged wording | VERIFIED | `messages/en.json` diff; `member-list-panel.tsx` "(You)" hardcoded string replaced with `t("you")` |
| 3 unlocalized loading strings fixed (conversation/load-older/room-list) | VERIFIED | Confirmed via diff: `conversation-view.tsx` `"Loading..."→t("loading.conversation")`; `message-list.tsx` `"Loading..."→t("loading.messages")`; `chat-room-list.tsx` `"Loading..."→t("loading.rooms")` |
| Loading strings end in "…" not "..." | VERIFIED | `en.json`: `loading.conversation/messages/rooms`, `media.uploading` all use `…`. (Pre-existing, unrelated `message.placeholder: "Type a message..."` still uses literal dots — not a loading string, not touched by this PR, out of scope) |
| New strings for Today/day-labels/caption-limit/original-not-available | VERIFIED | `en.json`: `thread.today`, `message.captionTooLong`/`messageTooLong`, `notices.originalNotAvailable` |
| Title Case buttons/headings; numerals for counts | VERIFIED | "New Chat", "Jump to Latest", "Add Member", etc.; `selectedCount` uses `#` (numerals) |
| Error copy states what happened + what user can do | VERIFIED | `errors.loadOlder`, `errors.sendDisabledRecover` |
| Orphaned `chat.newMessages` key removed | VERIFIED | grep confirms zero references anywhere in `src`/`messages`/`tests` |

---

## 5. Mobile Expectations

| Item | Status | Evidence |
| --- | --- | --- |
| Single-pane nav + back affordance | VERIFIED (unchanged) | `chat-layout.tsx` mobile view toggling |
| 44×44 touch targets (send/attach/actions/members/back) | VERIFIED | see §3 |
| Composer visible above on-screen keyboard | MANUAL | checklist "Accessibility & mobile" |
| Day separators/grouping/jump-to-latest same on mobile | VERIFIED (shared code path, no mobile branch) | `message-list.tsx`/`chat-thread-utils.ts` render unconditionally of viewport |
| No tab-bar overlap regression | MANUAL (layout unchanged) | checklist "Accessibility & mobile" |

---

## 6. Validation Expectations — gaps found (severity-ranked)

1. **MEDIUM — Baseline (self-triggered) inline-edit and delete+confirmation flows have no
   automated coverage and no dedicated manual-checklist line item.** The pre-revamp Playwright
   suite (`ce6443c:tests/pages/chat.spec.ts`) never covered these either, so this is not a new
   regression in test coverage, but the requirements' "Manual pass across" list explicitly names
   "inline edit; delete + confirmation" as required manual verification, and `message-bubble.tsx`'s
   edit form and the delete-dialog wiring sit inside the anatomy that was substantially rewritten
   (`Message`/`Bubble`/`BubbleContent`). The manual checklist only touches edit/delete in two other
   contexts — remote-triggered abandon (`manual-checklist.md:16-17`) and keyboard-reachability
   (`manual-checklist.md:71`) — never "I edit my own message and save/cancel it" or "I delete my own
   message and confirm." Recommend adding one checklist line for each before merge.

2. **LOW — Design's non-blocking CSS recommendation (§9) was only half-executed.**
   `globals.css` adds `@utility scrollbar-thin`, `scrollbar-gutter-stable`,
   `scrollbar-thumb-transparent`, `scrollbar-track-transparent` (used by
   `message-scroller.tsx:45`), but `scroll-fade-b` (same line) and `scroll-fade-x`
   (`attachment.tsx:189`) remain referenced, undefined Tailwind utility classes — Tailwind
   generates no CSS for them, so the fade-mask affordance at the scroll edges is silently absent.
   Purely cosmetic (native scrollbars, no fade mask), and the design doc explicitly allowed
   "accept cosmetic degradation" as a valid choice — but the split (some utilities added, others
   not) isn't called out anywhere, so it reads as an oversight rather than a decision.

3. **LOW — Manual checklist omits a few requirements-listed items:** (a) "Pasting into the
   composer and caption field always works" (Accessibility & Interaction Standards) has no
   checklist line — low risk since the `Textarea` has no paste-blocking handler, but untested
   either way; (b) the DM members panel's "no group-management controls" distinction isn't its
   own checklist bullet (only implied); (c) sending a *video* specifically (vs. the
   Playwright-covered image) isn't called out, though the composer code path is generic to any
   accepted `File`.

4. **INFO — Test organization deviates from the design's test plan (§11.2) without a
   functional gap.** The two new capability specs were added as additional `test(...)` blocks
   inside the existing `tests/pages/chat.spec.ts` rather than as the two separate files
   (`chat-day-separator.spec.ts`, `chat-caption.spec.ts`) the design named. Coverage is present
   and equivalent; this is purely organizational.

5. **INFO — Playwright was not executed in this QA pass.** Per this verification's explicit
   scope (build/lint/`npm test -- --run` only), `npx playwright test` was not run. Static review
   confirms `tests/pages/chat.spec.ts` exercises: day-separator rendering + labels + send-still-
   works, captioned-media send-and-render, and the same-day prepend no-scroll-jump assertion
   (tolerance ≤100px) — matching the Validation Expectations. Recommend running
   `npx playwright test --project=chromium tests/pages/chat.spec.ts` before merge if CI hasn't
   already gone green on this branch.

---

## 7. Automated Green-State Verification

### Build
**PASS.** `npm run build` — compiled successfully, TypeScript check clean, all routes generated
(including `/[locale]/chat`). Output: `/tmp/build-output.txt`.

### Lint
**PASS.** `npm run lint` — 0 errors. 1 pre-existing warning (`__tests__/components/playground/navbar.test.tsx:38`, unrelated to this PR — an unused eslint-disable directive). Output: `/tmp/lint-output.txt`.

### Unit tests
**PASS.** `npm test -- --run` — 52 files, 751 tests, all green, including the new
`__tests__/components/chat/chat-thread-utils.test.ts` (21 tests: `localDayKey`, `classifyDayLabel`
incl. cross-tz/local-midnight fixtures, `buildThreadItems` incl. midnight-spanning run and
prepend-simulation, `reconcileMessages`, `hasReconnectGap`) and
`__tests__/[locale]/chat/actions.test.ts` (server-action coverage incl. `sendMediaMessage`
caption/replyToId argument shaping and the 5,000-char validation boundary). Timezone pinned via
`vitest.config.mts` `test.env.TZ = "America/New_York"`. Output: `/tmp/vitest-output.txt`.

### Playwright
Not executed in this pass (see gap §6.5). Spec content statically reviewed and matches the
Validation Expectations (two new-capability specs + the explicit prepend/no-jump assertion).

---

## 8. Overall Verdict

**Ready for code review**, with the one medium-severity gap (§6.1) recommended to be closed
(add two explicit manual-checklist lines for baseline inline-edit and delete+confirmation) before
or during review, and the low/info items are worth a quick look but do not block. Build, lint, and
the full unit-test suite are green; the feature-parity inventory and both new capabilities
(day separators, media captions) are implemented and demonstrably match the requirements at the
code level; the two WebSocket-dependent behaviors correctly remain MANUAL with checklist coverage
for every item the requirements explicitly enumerate for that path.

---

## Addendum (post-QA resolution, same branch)

- **Gap 1 (MEDIUM)** — resolved: the manual checklist gained a dedicated
  "Message actions (baseline, self-triggered)" section covering inline edit
  (save via Enter/button, cancel via Escape/button), delete + confirmation
  (own, Owner/Admin on others, Member denied), paste into composer/caption,
  and a video-specific send. (No automated coverage existed for these before
  the revamp either — this is routed to the manual pass per the requirements.)
- **Gap 2 (LOW)** — false positive: `scroll-fade-*` utilities are supplied by
  the pre-existing `@import "shadcn/tailwind.css"` in globals.css, not defined
  inline. Verified present in the production CSS bundle
  (`.next/static/chunks/*.css` contains emitted rules for `scroll-fade-b`,
  `scrollbar-thin`, and `shimmer`).
- **Gap 3 (LOW)** — resolved: paste, DM members-panel no-group-controls, and
  video send added to the checklist (see Gap 1 items and Cross-cutting).
- **Gap 5 (INFO)** — satisfied: the full Playwright suite ran green in this
  session (115 passed / 1 skipped), and the chat spec re-ran green (7/7) after
  the post-review fixes in commit 56a092e.
- Note: a parallel code review (7 findings, 1 critical) was fixed in commit
  56a092e after this QA snapshot; line references in the tables above may be
  slightly offset.
