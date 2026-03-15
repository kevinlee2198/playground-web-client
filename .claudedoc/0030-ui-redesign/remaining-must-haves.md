# UI Redesign — Remaining Must-Have & Should-Have Items

**Date**: 2026-03-15
**Source**: `design-addendum.md` priority summary, cross-referenced with current codebase state
**Review**: `remaining-must-haves-review.md` — adversarial review applied 2026-03-15

Mark each item **[DONE]** after it has been completed and merged/committed.

---

## Already Complete

These items from the addendum are already shipped in PRs 1–4 and PR #55:

- [DONE] Color contrast fix for `--muted-foreground` (light `0.45`, dark `0.70`) — PR1
- [DONE] Skip navigation link (WCAG Level A) — PR2
- [DONE] Touch target minimums (44px) — PR2/PR3/PR4
- [DONE] ARIA live regions for live scores (`aria-live="polite"`, `aria-atomic`) — PR3/PR4
- [DONE] Game card visual state differentiation (completed/live/upcoming) — PR3
- [DONE] Tab bar full behavior spec (hide on scroll, keyboard, safe areas) — PR2
- [DONE] Dark mode design philosophy applied to tokens — PR1
- [DONE] Update PR2 plan breakpoints from `md` to `lg` — PR2
- [DONE] Shadow elevation system (4 levels: `shadow-card`, `shadow-card-hover`, `shadow-elevated`, `shadow-float`) — PR1/PR3
- [DONE] Motion token system (5 durations + 3 easing curves in `globals.css`) — PR1/PR3
- [DONE] New Game FAB placement (Feed + Games pages, CreateGameDialog stopgap, scroll-hide) — PR2
- [DONE] Skeleton shimmer effect (inner-span DOM, `@keyframes shimmer`, warm gradient sweep) — PR3. Note: 4 `animate-pulse` stragglers remain in `user/[username]/page.tsx` (GameHistorySkeleton) and `auth-button.tsx` — migrate these to `Skeleton` component.

---

## Small Items (direct commits to main)

### 1. Status pill `aria-label` with full text
- [DONE] Add `aria-label` to status pills in `game-card.tsx` and `game-detail-hero.tsx`
- Per addendum Section 20: "Third quarter, 4:22 remaining" not "Q3 4:22"
- Files: `src/components/game/game-card.tsx`, `src/components/game/game-detail-hero.tsx`

### 2. Migrate remaining `animate-pulse` to `Skeleton` component
- [DONE] Replace raw `animate-pulse` divs in `user/[username]/page.tsx` (GameHistorySkeleton) and `auth-button.tsx`
- Files: `src/app/[locale]/user/[username]/page.tsx`, `src/components/auth/auth-button.tsx`

---

## Branch: Empty States (must-have #6)

Per addendum Section 13. Phase 1: text + Lucide icons + CTAs, no custom illustrations.

Note: most of these are **updates to existing partial empty states**, not greenfield. Check existing implementations before modifying.

### 3. Feed empty state
- [DONE] Update existing empty state: add `Users` icon, update copy to "Your friends' games will appear here.", add two CTAs: "Create a game" (primary), "Find friends" (secondary outline)
- File: `src/app/[locale]/page.tsx` (lines ~60-66)

### 4. Games browse empty state (no filter results)
- [DONE] Update existing empty state: "No games match your filters." + "Clear filters" CTA
- File: `src/app/[locale]/games/page.tsx` (lines ~240-246)

### 5. Profile game history empty state
- [DONE] Update existing empty state: "No games yet. Your story starts with the first whistle." + "Create a game" CTA
- File: `src/components/profile/game-history.tsx` (lines ~49-54)

### 6. Notifications empty state
- [DONE] Update existing empty state: "All caught up." copy, swap icon — no CTA needed
- File: `src/components/notification/notification-list.tsx` (lines ~67-78)

### 7. Messages empty state
- [DONE] Update existing empty state: "No conversations yet." + "Find friends to message" CTA
- File: `src/components/chat/chat-room-list.tsx` (lines ~164-180)

### Style rules
- Headlines: `font-display font-semibold` (Quicksand 600)
- Body: `text-muted-foreground` (Nunito 400)
- Center-aligned, generous vertical padding
- Phase 1 icons: `Users` (feed), `Gamepad2` (games), `Sprout` (profile stats), `Search` (search), `Bell` (notifications), `MessageCircle` (messages)
- Add `{/* TODO: Replace with custom illustration */}` markers

---

## Branch: Search Experience Phase 1 (must-have #8)

Per addendum Section 14. Visual update + mobile overlay, users only — no backend changes.

### 8. Mobile search overlay
- [DONE] Tap search icon -> full-screen overlay slides up
- [DONE] Text input auto-focused with keyboard open
- [DONE] "Cancel" text button to dismiss

### 9. Desktop search visual update
- [DONE] Search bar expands on focus
- [DONE] Results in dropdown popover (existing pattern, just restyle)

### 10. Recent searches
- [DONE] Store recent searches in `localStorage`
- [DONE] Show when search is focused with no query

### 11. Search empty & loading states
- [DONE] Skeleton shimmer while loading
- [DONE] No results: "No results for '[query]'." + suggestions ("Try a different search" or "Browse games")
- File: `src/components/search/navbar-search.tsx` or search results component

---

## Branch: Pull-to-Refresh (must-have #9)

Per addendum Section 21. Uses existing `useScrollDirection` hook from PR2.

Note: the `useScrollDirection` hook and `ScrollDirectionProvider` may need modification to support gesture suppression during active pull gestures (addendum Section 21). FAB and tab bar behavior must be tested alongside pull-to-refresh — during an active pull gesture, their hide/show is suppressed.

### 12. Pull-to-refresh component
- [DONE] Track touch events on scroll container when `scrollTop === 0`
- [DONE] Pull down past 60px threshold to trigger refresh
- [DONE] Warm loading indicator (three forest-green bouncing dots or similar)
- [DONE] `overscroll-behavior-y: none` on scroll container

### 13. Feed integration
- [DONE] Wire pull-to-refresh to feed page data refetch

### 14. Desktop alternative
- [DONE] No pull-to-refresh on desktop (coarse pointer check)
- [ ] Optional "Refresh" icon button in feed header (deferred)

---

## Should-Have Items (dedicated PRs, lower priority)

### 15. Contextual back navigation
- [ ] `router.back()` with same-origin fallback on game detail page
- Per addendum Section 11

### 16. Profile progressive disclosure
- [ ] Show 5 most recent games + "View all N games" button
- [ ] 2x3 media grid + "View all media" button
- Per addendum Section 12

### 17. Notification center visual update
- [ ] Terracotta badge (verified contrast), unread left border, hover states
- Per addendum Section 15

### 18. `/games/new` dedicated route
- [ ] Full-page game creation form (replaces CreateGameDialog modal)
- Per addendum Section 16

### 19. Score change animation
- [ ] Number cross-fade with subtle scale `1.0 -> 1.05 -> 1.0` over `--duration-gentle` with `--ease-bounce`
- [ ] Score block background pulse: deep cream -> slightly warmer -> deep cream
- Per addendum Section 5

### 20. Shape-accurate skeleton screens
- [ ] Game card skeleton: accent strip placeholder, sport pill circle, two-column score block, meta row
- [ ] Profile skeleton: large avatar circle, name/username rectangles, stat card row
- [ ] Game detail hero skeleton: full-width hero rectangle, score placeholders, metadata text
- Per addendum Section 17

### 21. Focus management for inline editing
- [ ] Focus moves to first field on edit, returns to trigger on save/cancel
- Per addendum Section 20
- Note: already partially implemented in `GameScoreBlock` and profile editors

### 22. Optimistic UI patterns
- [ ] Score update, join/leave team, send message, friend request, notification read
- Per addendum Section 19
