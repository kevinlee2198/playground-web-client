# UI Redesign — Should-Have Items

**Date**: 2026-03-15
**Source**: `design-addendum.md` priority summary, items remaining after all must-haves completed
**Parent**: `remaining-must-haves.md` (items 15–22)
**Review**: Adversarial review applied 2026-03-15

Mark each item **[DONE]** after it has been completed and merged/committed.

---

## Small Items (direct commits to main)

### 1. Contextual back navigation
- [ ] Replace hardcoded `<Link href="/games">` with `router.back()` + same-origin fallback
- Per addendum Section 11: use `document.referrer` to check same origin, fall back to `/games`
- File: `src/app/[locale]/game/[id]/page.tsx` — the back link (lines ~183-194)
- Note: requires a small client component (e.g., `BackButton`) since the page is a Server Component and `router.back()` needs `useRouter`

### 2. Score change animation
- [ ] Number cross-fade with subtle scale `1.0 -> 1.05 -> 1.0` over `--duration-gentle` with `--ease-bounce`
- [ ] Score block background pulse: deep cream -> slightly warmer -> deep cream
- Per addendum Section 5
- Files: score display components (`simple-score.tsx`, `tennis-score.tsx`), possibly `globals.css` for keyframes
- Note: requires detecting when a score value changes (compare prev vs current). May need a `usePrevious` hook or transition group. Touches 4-5 files

### 3. Shape-accurate skeleton screens
- [DONE] Game card skeleton — already shape-accurate in `game-card-skeleton.tsx` (accent strip, sport pill, score block, meta row)
- [DONE] Game detail hero skeleton — already shape-accurate in `game/[id]/loading.tsx`
- [ ] Profile skeleton: large avatar circle, name/username rectangles, stat card row — needs new `loading.tsx` at profile route level. Note: defer if #5 (progressive disclosure) will restructure the profile page, or do together
- [ ] Games browse loading: replace old Card-based skeleton in `games/loading.tsx` with existing `GameCardSkeleton` component

### 4. Focus management for inline editing
- [DONE] `GameScoreBlock` — already fully compliant (focus to first input on edit, focus return to trigger on save/cancel)
- [ ] `EditableDisplayName` — add focus-return-to-trigger on save/cancel (add a trigger ref, focus it in close handler)
- [ ] `EditableBiography` — same fix needed
- [ ] `PlayerStatsEditor` — same fix needed
- Per addendum Section 20
- Files: `src/components/profile/editable-display-name.tsx`, `src/components/profile/editable-biography.tsx`, `src/components/profile/player-stats-editor.tsx`

---

## Branch-Sized Items

### 5. Profile progressive disclosure
- [ ] Game history: show 5 most recent games + "View all N games" button (expand inline or navigate to `/games?user=[username]`)
- [ ] Media highlights: show 2x3 grid of most recent thumbnails + "View all media" button
- Per addendum Section 12
- Files: profile game history component, profile page layout
- Note: game history currently loads 10 games with a manual "Load more" button. This changes it to show 5 most recent with a "View all N games" button

### 6. Notification center visual update
- [ ] Notification count badge: dark terracotta background (`oklch(0.50 0.12 45)`) with white foreground, ≥4.5:1 contrast (replace current `bg-destructive`)
- [ ] Unread indicator: warm 3px left border (terracotta) on unread items (replace current green dot)
- [ ] Notification item styling: avatar 40px rounded + text + relative timestamp, min-height 44px
- [ ] Hover state: background shifts to secondary (deep cream, replace current `hover:bg-accent/80`)
- [ ] "Mark all read" text button in popover header (new feature — wire to existing `markNotificationsAsRead` action)
- Per addendum Section 15
- Files: `src/components/notification/notification-bell.tsx`, `src/components/notification/notification-list.tsx`, `src/components/notification/notification-item.tsx`

### 7. `/games/new` dedicated route
- [ ] Create full-page game creation form at `/games/new`
- [ ] Update navbar "New Game" button and mobile FAB to navigate to `/games/new` instead of opening dialog
- Per addendum Section 16
- Note: `CreateGameForm` is already extracted as a standalone component (316 lines). The `/games/new` page primarily needs a new page layout file that imports it, plus updating nav links. Simpler than it sounds

### 8. Optimistic UI patterns
- [DONE] Mark notification read — already implemented in `notification-bell.tsx` (lines 104-123) with optimistic update, in-flight deduplication, and rollback. Use this as the pattern for other items
- [ ] Score update (live game): show new number immediately, revert on error
- [ ] Join/leave team: add/remove user from participant list immediately
- [ ] Send message: message appears in chat immediately, mark as "failed" with retry on error
- [ ] Accept/reject friend request: update button state immediately
- Per addendum Section 19
- Note: cross-cutting concern touching many components. Implement per-feature rather than all at once

---

## Recommended Order

1. **#1 Contextual back navigation** — smallest, 1 new client component
2. **#3 Shape-accurate skeletons** — only profile skeleton + games browse loading remain
3. **#4 Focus management** — 3 profile editors need focus-return-to-trigger
4. **#2 Score change animation** — keyframes + change detection, 4-5 files
5. **#6 Notification visual update** — self-contained branch, moderate scope
6. **#5 Profile progressive disclosure** — branch, changes data fetching. Consider doing profile skeleton (#3) as part of this
7. **#7 `/games/new` route** — mostly a new page file importing existing `CreateGameForm`
8. **#8 Optimistic UI** — cross-cutting, tackle per-feature over multiple PRs
