# Design Addendum: Detailed Specifications

**Date**: 2026-03-09
**Status**: Draft
**Parent**: `design.md` (Ghibli Tranquil theme direction)
**Source**: Design review (`design-review.md`) identified 31 gaps in the original design. This addendum fills them.

This document supplements `design.md` with interaction-level detail. Each section here expands on a topic that the original design either left implicit or omitted. PR implementation plans should reference both documents.

---

## 1. Color Contrast & Accessible Palette

The original palette's muted/secondary text on cream backgrounds risks failing WCAG AA 4.5:1 for normal text.

### Required Adjustments

| Token | Current OKLCH | Adjusted OKLCH | Background | Approx Contrast |
|-------|--------------|----------------|------------|-----------------|
| `--muted-foreground` (light) | `oklch(0.53 0.02 60)` | `oklch(0.45 0.02 60)` | `oklch(0.96 0.018 85)` cream | ~4.6:1 (passes AA) |
| `--muted-foreground` (dark) | `oklch(0.65 0.02 60)` | `oklch(0.70 0.02 60)` | `oklch(0.20 0.02 55)` dark brown | ~4.8:1 (passes AA) |

**Note:** These OKLCH contrast ratios are approximate. Both values must be verified through an actual OKLCH contrast checker before the implementing PR merges. Do not leave either value as "verify" — the PR must include measured contrast ratios.

### Contrast Verification Protocol

Before any PR that introduces new foreground/background pairings, run every combination through APCA or WCAG 2.2 contrast check. At minimum verify:
- Primary text on background, card, and secondary surfaces
- Muted text on background and card surfaces
- Primary-foreground on primary (buttons)
- Sport accent foreground on sport accent background

---

## 2. Dark Mode Philosophy

The original design only discusses light mode. The codebase already ships `.dark` tokens, but they need intentional design, not just lightness inversion.

### Narrative: Ghibli Night Scene

Dark mode should evoke a Ghibli night scene: deep warm browns and indigos, amber lamplight accents, slightly desaturated forest greens. Think the lantern-lit streets in Spirited Away, not a generic dark theme.

### Specific Guidance

- **Background**: Deep warm brown (`oklch(0.20 0.02 55)`), not cool gray or pure black
- **Cards**: Slightly lighter warm brown (`oklch(0.24 0.02 55)`), distinct from background
- **Primary (forest green)**: Lighten to `oklch(0.65 0.10 155)` for sufficient contrast on dark surfaces
- **Terracotta accent**: Lighten to `oklch(0.70 0.14 45)` — the "lantern glow" color
- **Sport accent backgrounds**: Rich, low-key tones (`oklch(0.35 ...)`) — not just dimmed versions of light palette. They should feel like colored lamplight, not faded paper
- **Borders**: Light-on-dark at 10-15% opacity (`oklch(0.93 0.018 85 / 10%)`)
- **Shadows**: In dark mode, shadows are less visible. Rely more on border and background differentiation for elevation. Shadows shift to near-black warm tones at higher opacity

### Testing

Every component PR must be visually verified in both light and dark mode. No PR merges with dark mode as an afterthought.

---

## 3. Shadow Elevation System

The original design specifies only two shadow values (default and hover). A warm, rounded aesthetic needs a layered depth system.

### Four-Level Shadow Scale

| Level | Name | CSS Value | Usage |
|-------|------|-----------|-------|
| 1 | `shadow-card` | `0 1px 3px rgba(61,52,38,0.06), 0 1px 2px rgba(61,52,38,0.04)` | Resting cards |
| 2 | `shadow-card-hover` | `0 4px 12px rgba(61,52,38,0.10), 0 2px 4px rgba(61,52,38,0.06)` | Hovered cards, active elements |
| 3 | `shadow-elevated` | `0 8px 24px rgba(61,52,38,0.12), 0 4px 8px rgba(61,52,38,0.06)` | Popovers, dropdowns, dialogs |
| 4 | `shadow-float` | `0 16px 32px rgba(61,52,38,0.14), 0 6px 12px rgba(61,52,38,0.08)` | Modals, floating action buttons |

All shadows use dual-shadow technique (tight shadow for definition + wide shadow for atmosphere). All shadows use warm `rgba(61,52,38,...)` — never cool gray.

In dark mode, shadows shift to near-black and higher opacity since they are less perceptible against dark surfaces.

---

## 4. Background Texture

Flat cream alone reads as "beige website," not "Ghibli watercolor." A subtle texture sells the theme.

### Specification

Apply a very subtle noise/grain overlay on the page background:
- Method: Pre-rendered 256x256 PNG noise tile (~2KB) applied via `background-image` with `background-repeat: repeat`. Do NOT use inline SVG `feTurbulence` filters — they require GPU compositing on every scroll frame and cause dropped frames on budget Android devices
- Opacity: 2-4% — below the threshold where it interferes with text rendering
- Grain size: Fine (1-2px), not coarse
- Application: On `body` or `--background` layer only, not on cards or elevated surfaces (cards should feel smooth against the textured background)

Test on retina and standard displays, and on a budget Android device (e.g., Moto G Power). The texture should be barely perceptible on retina and slightly more visible on standard — never distracting.

This is a low-priority enhancement that can be added in any PR or as its own micro-PR.

---

## 5. Motion Tokens

The original design specifies a single hover animation. The system needs a coherent motion language.

### Duration Scale

| Token | Value | Usage |
|-------|-------|-------|
| `--duration-fast` | `150ms` | Micro-interactions: button press, toggle, checkbox |
| `--duration-normal` | `250ms` | Hovers, state changes, tab switches |
| `--duration-slow` | `400ms` | Page transitions, skeleton fade-out, card enter |
| `--duration-gentle` | `600ms` | Score update pulse, celebration moments |
| `--duration-breath` | `2000ms` | Live breathing dot cycle |

### Easing Curves

| Token | Value | Usage |
|-------|-------|-------|
| `--ease-default` | `cubic-bezier(0.4, 0, 0.2, 1)` | Standard transitions |
| `--ease-bounce` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful moments (score updates, celebrations) |
| `--ease-gentle` | `cubic-bezier(0.25, 0.1, 0.25, 1)` | The Ghibli "breeze" — tab bar hide/show, card enter |

### Key Animations

| Animation | Trigger | Spec |
|-----------|---------|------|
| Card enter (feed) | Card appears in viewport | Fade up from `translateY(8px)` + opacity 0, `--duration-slow` `--ease-gentle`, stagger 50ms per card |
| Card hover | Mouse enter | `translateY(-2px)` + shadow level 1→2, `--duration-normal` `--ease-default` |
| Score update | Live score changes | Number cross-fade with subtle scale `1.0 → 1.05 → 1.0` over `--duration-gentle` with `--ease-bounce`. Score block background pulses once: deep cream → slightly warmer → deep cream |
| Skeleton → content | Data loaded | Cross-fade (not abrupt replacement), `--duration-slow` |
| Tab switch | Tab navigation | Cross-fade content, `--duration-normal` |
| Tab bar hide/show (mobile) | Scroll direction change | `translateY` with `--duration-normal` `--ease-gentle` |

### Reduced Motion

All animations respect `prefers-reduced-motion: reduce`. Behavior: skip all motion, apply state changes instantly. Breathing dots become static colored dots. Score updates swap numbers without animation.

---

## 6. Responsive Breakpoints

The original design says "desktop" and "mobile" without defining breakpoints or tablet behavior.

### Three Layout Modes

| Mode | Breakpoint | Tab Bar | Feed | Game Cards | Game Browse |
|------|-----------|---------|------|------------|-------------|
| Mode | Breakpoint | Tab Bar | Feed | Game Cards | Game Browse |
|------|-----------|---------|------|------------|-------------|
| Mobile | `<768px` (below `md`) | Fixed bottom | Single column, full-width cards | Full-width | Single column, no filter sidebar |
| Tablet | `768px–1024px` (`md` to `lg`) | Fixed bottom (users hold tablets like phones) | Single column, max-width `2xl` centered | Constrained width | Two-column grid, filter pills above (no sidebar) |
| Desktop | `>1024px` (`lg+`) | Static below navbar | Single column, max-width `2xl` centered | Constrained width | Grid + filter sidebar |

Key decisions:
- Tab bar switches from bottom to top at `lg` (1024px), not `md` (768px) — tablet users hold devices like phones
- Feed is always single-column (social feed pattern — not a grid)
- Game browse shifts to grid at `md`

**IMPORTANT — PR2 plan contradiction:** The PR2 navigation plan (`pr2-navigation-plan.md`) was written before this addendum and uses `md:` (768px) as the breakpoint throughout. The PR2 plan MUST be updated to use `lg:` instead of `md:` for all mobile/desktop layout splits. This affects: TabBar component classes, layout.tsx body padding, navbar search/button visibility, and messages page height calculations. See the PR2 plan update section at the end of this document.

---

## 7. Touch Targets

No touch target sizes are specified in the original design. This is a fundamental mobile requirement.

### Minimums

| Element Type | Minimum Tap Area | Notes |
|-------------|-----------------|-------|
| Icon-only buttons | `44x44px` | Visual icon can be smaller (e.g., 20px), but the tappable region must be 44x44 minimum |
| Text buttons / links | `44px` height | Width determined by text |
| Tab bar items | `44px` height, equal-width grid | Already covered by grid layout |
| Sport filter pills | `36px` height, `44px` min-width, `8px 16px` padding | |
| Inline edit pencil icons | `44x44px` tap area | The icon itself is small but the button wrapping it must meet minimum |
| Notification items | `44px` min-height | |

Implementation: use Tailwind's `min-h-11` (44px) and padding to ensure targets meet minimums even when visual elements are smaller.

---

## 8. Bottom Tab Bar — Full Specification

The original design says "standard mobile pattern" which glosses over many decisions.

### Behavior

| Behavior | Specification |
|----------|--------------|
| Position (mobile) | `fixed bottom-0 inset-x-0` with `pb-[env(safe-area-inset-bottom)]` |
| Position (desktop/tablet) | Static below navbar, normal document flow |
| Hide on scroll | Hide on scroll-down, reveal on scroll-up. Transition: `translateY(100%)` over `--duration-normal` with `--ease-gentle`. Use `will-change: transform` for GPU acceleration |
| Keyboard interaction | Tab bar hides when virtual keyboard is open (use `visualViewport` API to detect). Prevents tab bar from floating above the keyboard on chat/messages page |
| Active state (mobile) | Filled icon variant + `text-primary` color + icon size `20px` |
| Active state (desktop) | Text in `text-primary` + 2px bottom border in primary color |
| Tap active tab | Scroll to top of page (Instagram pattern). Use `window.scrollTo({ top: 0, behavior: 'smooth' })` |
| Auth gating | Render `null` when not authenticated |
| Feedback on tap | Brief scale animation (`scale(0.95)` → `scale(1)` over `--duration-fast`) on tab press for tactile feel. Do NOT use `navigator.vibrate()` — it is unsupported on iOS Safari and unreliable on the web. Visual feedback is cross-platform |

### Breakpoint Switch

Tab bar switches from bottom-fixed to top-static at `lg` (1024px), not `md`. See Responsive Breakpoints section.

---

## 9. Game Card Visual States

The original design does not differentiate completed, live, and upcoming cards enough for quick scanning.

### Three Card Moods

**Completed** (default):
- Standard card as described in `design.md`
- Recessed deep cream score block
- "Final" status pill in muted style
- No special border treatment

**Live**:
- Faint terracotta border tint (`border-color: oklch(0.60 0.12 45 / 12%)`)
- Thin terracotta gradient at bottom edge of card (mirroring the sport accent strip at top — warm "glow from within")
- Breathing terracotta dot on status pill (~2s gentle pulse)
- Score block background subtly warmer than the standard deep cream

**Upcoming**:
- Lighter card surface — slightly whiter than standard (`#ffffff` or `oklch(1.0 0 0)` with very faint dashed border)
- No recessed score block — stays flat to signal "nothing has happened yet"
- Date/time prominently displayed where scores would be
- Soft terracotta "Upcoming" pill
- The visual lightness + dashed border makes these instantly distinguishable from completed cards at scroll speed

---

## 10. Engagement Signal on Game Cards

The original design deliberately omits all social signals on cards. This addendum adds a minimal discovery signal.

### Rationale

Social signals on feed cards are not vanity metrics — they are navigation heuristics. "12 comments" tells users "something interesting happened in this game." Without any signal, all completed games look equally inert.

### Backend Prerequisite

**This feature requires a backend API change.** Neither `GameNode` nor `FeedGameNode` currently have a `commentCount` field. The backend GraphQL schema must add a `commentCount: Int` field to the game type, and the feed query must request it. Until this backend work is complete, this feature cannot be implemented.

### Specification (once backend supports it)

Add a single understated engagement indicator in the meta row:
- Small speech bubble icon (`MessageCircle` from Lucide, `size-3.5`) + comment count
- Rendered in `text-muted-foreground`, same style as location and date
- Only shown if comment count > 0
- No likes, no shares — just comments as a discovery signal

---

## 11. Contextual Back Navigation

The game detail page currently hardcodes "Back" to `/games`. This loses context.

### Specification

Use `router.back()` with a fallback:
1. If `document.referrer` is from the same origin, use `router.back()`
2. Otherwise, fall back to `/games`

Stretch goal (for a later PR): pass a `returnTo` search param and render context-aware labels ("Back to Feed", "Back to Sofia's Profile"). This requires updating all links that navigate to game detail to include the param.

---

## 12. Profile Page — Progressive Disclosure

The original design says "no tabs, everything scrolls vertically." This fails for active users with 200+ games.

### Specification

Keep the vertical flow but introduce progressive disclosure:

1. **Stats summary** — Always visible (as designed)
2. **Recent games** — Show 5 most recent game cards. Below them, a "View all N games" button that either:
   - Expands inline (loads more with infinite scroll), or
   - Navigates to `/games?user=[username]` (filtered games browse)
3. **Media highlights** — Show a 2x3 grid of most recent thumbnails. Below, "View all media" button.

This is not tabs. It is summary-first vertical flow with expandable sections. It respects the design philosophy while staying usable at scale.

---

## 13. Empty States

The original design either hides empty sections or ignores them. Empty states are brand-defining moments for new users.

### Required Empty States

| Surface | Empty State |
|---------|-------------|
| **Feed** | Placeholder icon + headline: "Your friends' games will appear here." Two CTAs: "Create a game" (primary) and "Find friends" (secondary outline) |
| **Profile stats** | Warm card with placeholder icon. "Create a player profile to start tracking your stats." Single CTA: "Create player profile" |
| **Profile game history** | "No games yet. Your story starts with the first whistle." CTA: "Create a game" |
| **Profile media** | 2x3 grid of placeholder thumbnails with subtle dashed border and camera icon. Hints that media can be added without text |
| **Games browse (no results)** | "No games match your filters." CTA: "Clear filters" |
| **Search no results** | "No results for '[query]'." Suggestions: "Try a different search" or "Browse games" |
| **Notifications empty** | "All caught up." No CTA needed |
| **Messages empty** | "No conversations yet." CTA: "Find friends to message" |

### Style

- Headlines in Quicksand 600, body in Nunito 400 muted
- CTAs use standard button styles (primary for main action, outline for secondary)
- Center-aligned, generous vertical padding

### Illustration Strategy

Custom Ghibli-style line-art illustrations are the long-term goal for each empty state, but they require dedicated art direction work and should not block implementation. Ship empty states in two phases:

1. **Phase 1 (ship with feature):** Text + CTAs + a relevant Lucide icon as placeholder (e.g., `Users` for feed, `Gamepad2` for games, `Sprout` for profile stats). Add `{/* TODO: Replace with custom illustration */}` markers in code.
2. **Phase 2 (follow-up task):** Commission or create warm line-art illustrations and swap them in. Illustrations should be simple SVGs, single-color (muted foreground), consistent across all empty states.

---

## 14. Search Experience

The original design mentions "search bar (center)" and nothing else. Search is a primary discovery mechanism.

The current implementation (`navbar-search.tsx`) only searches users via `searchUsers()` and renders results in a `Popover`. This section describes a phased evolution.

### Phase 1: Visual Update + Mobile Overlay (no backend changes)

**Mobile behavior:**
- Tap the search icon in navbar → full-screen overlay slides up
- Text input auto-focused with keyboard open
- "Cancel" text button to dismiss
- Results appear below the input as user types (debounced 300ms)

**Desktop behavior:**
- Search bar in navbar center expands on focus. Results appear in a dropdown popover below the search bar (like GitHub's command palette)

**Results (Phase 1):** People only (existing `searchUsers` API). Avatar + display name + @username. Tap navigates to profile.

**Additional states:**
- **Initial (no query)**: Show recent searches (stored in `localStorage`)
- **Loading**: Skeleton shimmer in result shape
- **No results**: See Empty States section

### Phase 2: Grouped Multi-Type Search (requires backend)

**Backend prerequisite:** Requires new `searchGames` and `searchLocations` GraphQL queries. This phase cannot begin until those APIs exist.

**Results structure (Phase 2):** Grouped by type with section headers:

1. **People** — Avatar + display name + @username. Tap navigates to profile
2. **Games** — Compact game card summary (sport emoji + teams + score + date). Tap navigates to game detail
3. **Locations** — Map pin icon + location name. Tap navigates to games filtered by location

Show max 3 results per section with "View all N results" link per section.

---

## 15. Notification Center

The notification bell popover is already built but needs visual coherence with the redesign.

### Specification

| Element | Style |
|---------|-------|
| Notification count badge | Dark terracotta background (`oklch(0.50 0.12 45)`) with white foreground — must have ≥4.5:1 contrast against both the badge background AND be visually distinct against the navbar. The current `bg-destructive` red is too aggressive for the warm palette, but the replacement must still be noticeable. Verify contrast before shipping. Small rounded pill, Quicksand 700 |
| Unread indicator | Warm 3px left border on unread items (terracotta) |
| Notification item | Avatar (40px rounded) + text (Nunito 400) + relative timestamp (muted). Min-height 44px for touch |
| Hover state | Background shifts to secondary (deep cream) |
| Empty state | "All caught up" centered text, peaceful illustration optional |
| Mark all read | Text button, top-right of popover header |

---

## 16. "New Game" CTA Placement

The original design says "prominent CTA, always accessible" without specifying where in each context.

### `/games/new` Route

**This is a new route that does not currently exist.** The codebase currently uses `<CreateGameDialog />` (a modal) for game creation. Game creation has 6+ fields with cascading logic (sport type → subtype), location autocomplete with live API search, date/time picker, and conditional advanced options. This complexity warrants a dedicated page rather than a modal.

A `/games/new` page should be created as its own PR. Until that route exists, the navbar "New Game" button and the mobile FAB should open the existing `CreateGameDialog` as a stopgap. Once the route is live, update both to navigate to `/games/new`.

### Per-Context Placement

| Context | Desktop | Mobile |
|---------|---------|--------|
| **Feed page** | "New Game" button in navbar (right zone, next to bell) | FAB: bottom-right, above tab bar |
| **Games browse** | "New Game" button in page header alongside filters | FAB: same position |
| **Game detail** | None | None |
| **Profile** | None | None |
| **Messages** | None | None |

### Mobile FAB Specification

- Size: 56px diameter
- Color: Primary (forest green) background, white plus icon
- Shadow: `shadow-float` level
- Position: `fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+1rem)] right-4` — dynamically accounts for tab bar height plus safe area inset on notched devices. Do NOT hardcode `bottom-20` — this overlaps the tab bar on iPhones with a home indicator (where `env(safe-area-inset-bottom)` is 34px)
- Hide on scroll-down, reveal on scroll-up (same behavior as tab bar, coordinated via shared `useScrollDirection` hook — see Scroll Event Architecture section)
- When the tab bar hides on scroll-down, the FAB should also hide. Do NOT keep the FAB visible when the tab bar is hidden — this removes context for where the FAB is positioned relative to

The FAB only appears on Feed and Games pages. It does not appear globally.

---

## 17. Skeleton Loading Screens

Generic gray rectangles do not match the component anatomy. Skeletons should be shape-accurate previews.

### Game Card Skeleton

- 3px accent strip placeholder (gradient shimmer across full width)
- Circle (sport emoji pill shape) + small rectangle (subtype text)
- Two-column score block: two name rectangles flanking a center pill rectangle, two large score rectangles
- Bottom row: icon-sized circle + two small text rectangles (location, date)

### Profile Skeleton

- Large circle centered (avatar)
- Two centered text rectangles below (name, username)
- Horizontal row of 3-4 small rounded rectangles (stat cards)

### Game Detail Hero Skeleton

- Full-width rounded rectangle matching hero scoreboard proportions
- Two large score placeholders flanking a center pill
- Small text rectangle below (venue/date)

### Shimmer Style

Replace `animate-pulse` (opacity pulse) with a warm gradient sweep. See Section 28 (Loading Animations) for the full shimmer specification including OKLCH values and implementation approach.

---

## 18. View Transitions

Page navigations feel like hard cuts. Cross-page transitions would elevate the experience.

### Two Tiers of Transitions

**Tier 1 — Same-document transitions (widely supported):**

| Navigation | Transition |
|-----------|-----------|
| Tab switches | Cross-fade content, `--duration-normal` (250ms) |
| Modal/dialog open/close | Fade + scale, `--duration-normal` |

These use the same-document View Transitions API, supported in Chrome, Safari 18.2+, and Firefox. Implement these first.

**Tier 2 — Cross-document shared-element transitions (Chrome-only as of early 2026):**

| Navigation | Transition | Shared Element |
|-----------|-----------|----------------|
| Feed card → game detail | Card expands/morphs into hero scoreboard | Score block |
| Avatar tap → profile | Avatar expands into profile header avatar | Avatar image |

These require cross-document View Transitions (MPA mode), which is Chrome-only. Safari's View Transitions support is limited to same-document transitions. Next.js support is behind an experimental flag with known issues in the App Router's streaming/Suspense model. Defer Tier 2 until browser support improves.

### Implementation

- Unsupported browsers: instant navigation, no degradation — this is progressive enhancement
- Duration: `--duration-slow` (400ms)
- This is a stretch goal. Implement Tier 1 first as a polish PR. Defer Tier 2 indefinitely.

---

## 19. Optimistic UI Patterns

Several mutations should show immediate feedback before server confirmation.

### Optimistic Mutations

| Action | Optimistic Behavior | Rollback |
|--------|-------------------|----------|
| Score update (live game) | Show new number immediately | Revert to previous score + error toast |
| Game status change (start/end) | Update status pill immediately | Revert status + error toast |
| Join/leave team | Add/remove user from participant list immediately | Revert list + error toast |
| Send message | Message appears in chat immediately | Mark message as "failed" with retry option |
| Accept/reject friend request | Update button state immediately | Revert button + error toast |
| Mark notification read | Dim notification immediately | Revert visual state |

### Error Toast Style

Transient errors (network, timeout) use a warm amber toast — not destructive red. Reserve red for permanent failures (permission denied, invalid data). Toast text in Nunito 400, with a brief description and optional retry action.

---

## 20. Accessibility — Full Specification

The original design only mentions `prefers-reduced-motion` for the breathing dot.

### Skip Navigation

Add a visually hidden skip link as the first focusable element in the layout:
- Text: "Skip to main content"
- Style: `sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-background focus:px-4 focus:py-2 focus:rounded-lg focus:ring-2 focus:ring-ring`
- Target: `#main-content` on the `<main>` element

This is a WCAG 2.1 Level A requirement.

### ARIA Live Regions for Live Scores

Wrap score displays with `aria-live="polite"` and `aria-atomic="true"`. When the score updates, the screen reader announces the full context:
- Game cards: "Lakers 98, Celtics 95, Third quarter"
- Game detail hero: "Lakers 98, Celtics 95, Third quarter, 4 minutes 22 seconds remaining"

The status pill must have an `aria-label` with full text (not abbreviated — "Third quarter, 4:22 remaining" not "Q3 4:22").

### Sport Identification — Non-Color Signals

The accent strip alone relies on color to convey sport type. Ensure:
- The sport emoji pill is always present alongside the accent strip (the pill is the semantic identifier, the strip is decorative)
- The emoji pill has `aria-label="Basketball"` (not relying on emoji screen reader support)
- Consider adding subtle pattern differentiation to the accent strip as a bonus non-color signal (solid for basketball, fine diagonal for tennis, dashed for football) — optional if emoji pill is always present

### Focus Management for Inline Editing

When a user activates inline edit mode (e.g., pencil icon on game detail):
1. **Activating edit**: Focus moves to the first editable field
2. **Saving**: Focus returns to the element that triggered edit mode
3. **Canceling**: Focus returns to the trigger element
4. **Error**: Focus moves to the first field with an error

Implement via `useRef` + `useEffect` that moves focus on edit state change.

### Color-Blind Considerations

- Game state (completed/live/upcoming) must not rely solely on the terracotta/green color distinction. The card mood shapes and structural differences (recessed vs flat, dashed border, breathing dot) provide non-color signals.
- Winning score in forest green must have a secondary indicator (bold weight or a subtle trophy/check icon) for users who cannot distinguish green from surrounding text.

---

## 21. Pull-to-Refresh

The feed and game detail pages need a refresh mechanism on mobile.

### Mobile (Touch)

Track touch events on the scroll container when `scrollTop === 0`:
- Pull down past threshold (60px) to trigger refresh
- Show a small warm loading indicator (not a spinner — a gentle bounce of three forest-green dots, or a leaf that unfurls on brand)
- Release to refresh, indicator animates while data loads
- On completion, new content slides in from top
- **Required:** Add `overscroll-behavior-y: none` on the scroll container to disable the browser's native pull-to-refresh. Without this, users get double refresh behavior.

### Desktop

No pull-to-refresh. Instead:
- Auto-refresh with a toast: "New games available. Tap to refresh." when new content is detected (via WebSocket or polling)
- Visible "Refresh" icon button in the feed header (optional)

### Scroll Event Architecture

Pull-to-refresh, tab bar hide/show, and FAB hide/show all depend on scroll position. These MUST share a single scroll handler to prevent jank and conflicting behavior:

1. Create a `useScrollDirection` hook that provides:
   - `direction: 'up' | 'down' | 'idle'`
   - `scrollTop: number`
   - `isAtTop: boolean`
2. Tab bar and FAB consume `direction` to hide/show
3. Pull-to-refresh only activates when `isAtTop === true` AND the touch gesture is clearly a downward pull (not a scroll-up overshoot)
4. During an active pull gesture, tab bar/FAB hide/show is suppressed — they do not react to scroll events while the user is pulling
5. Throttle the scroll handler with `requestAnimationFrame`

This hook lives in `src/hooks/use-scroll-direction.ts` and is consumed by the TabBar, FAB, and any pull-to-refresh components.

---

## 22. Gesture Interactions

The original design does not mention gestures. These are expected on modern mobile apps.

### Defined Gestures

| Surface | Gesture | Action |
|---------|---------|--------|
| Chat messages | Swipe right | Reply to message (the reply-preview component already exists) |
| Notification items | Swipe left | Mark as read / dismiss |
| Media gallery (game detail) | Swipe left/right | Navigate between media items |
| Game cards in feed | Tap only | No swipe actions — cards navigate to detail on tap. Swipe gestures on cards conflict with vertical scroll |

### iOS Browser Gesture Conflicts

On iOS Safari, swipe-right from the left edge is the browser's "back" navigation gesture. Swipe gestures in the app MUST avoid conflicting:

- **Chat message swipe-to-reply**: Only activate on touch targets clearly within the message bubble. Ignore touches that start within 30px of the left screen edge (iOS reserves this zone). Require a minimum horizontal distance of 40px before activating.
- **Alternative approach**: If swipe-to-reply proves unreliable, use long-press to reveal a reply button instead.

### Progressive Enhancement

Gestures are progressive enhancement. All actions must also be accessible via tap/button for users who cannot perform swipe gestures.

---

## 23. Live Score Ticker

When friends have live games, show a horizontal scroll row of compact score chips at the top of the feed.

### Backend Prerequisites

**This feature requires backend API changes that do not currently exist:**
1. A `liveGamesForFriends` GraphQL query that returns only live games from the current user's friends
2. A `gameScoreUpdated` GraphQL subscription for real-time score updates

The existing WebSocket infrastructure (`graphql-ws-client.ts`) supports subscriptions for chat and notifications only. Subscribing to multiple live games through the singleton WS client needs careful multiplexing — the subscription lifecycle must be defined (subscribe on feed mount? only when live games exist from the initial query?).

### Specification (once backend supports it)

- Position: Below the tab bar, above the feed card list
- Visibility: Only when at least one friend has a live game. Hidden otherwise (no empty state needed)
- Chip anatomy: Sport emoji + two team abbreviations/names + live score + breathing terracotta dot
- Chip size: Compact — single line, pill-shaped, `h-9` (36px), horizontal padding `px-3`
- Scroll: Horizontal overflow scroll, no scrollbar visible (CSS `scrollbar-width: none`)
- Tap: Navigates to game detail
- Update: Scores update in real-time via WebSocket

This feature answers "what is happening right now?" instantly without scrolling the feed.

---

## 24. Post-Game Celebration Card

After a game ends, generate a shareable summary card.

### Specification

- Trigger: Game status changes to "completed"
- Who sees it: Game creator and all participants see a "Game Complete" moment — either as a feed card variant or a modal/sheet
- Card content: Final score, player/team names, sport emoji, date, location, MVP stat highlight (if available) — all on a warm Ghibli-styled background
- Visual style: Full-bleed warm gradient (cream to sport accent), Quicksand 700 score, rounded corners, the design's shadow-elevated level
- Actions: "Share" (generates a downloadable image or share-to-social), "View game" (navigates to detail)
- Image generation: Use HTML-to-canvas or server-side rendering to produce a shareable image

This is a growth mechanism (users share cards to social media) and a reward moment. It aligns with the "joy of the game" philosophy.

This is a stretch goal for a later PR.

---

## 25. Game Frequency Visualization (Profile)

> **Backend prerequisite:** Requires a player stats aggregation API that provides game counts by date. Neither `GameNode` nor the player stats types currently expose this data. This feature is blocked on backend work — see "Future features" in the priority summary.

On the profile page, show a game frequency indicator in the stats summary section.

### Specification (once backend supports it)

- Style: Small heat map grid (like GitHub's contribution graph) using warm Ghibli colors
  - No games: cream (background color)
  - 1 game: light moss
  - 2-3 games: medium forest
  - 4+ games: deep forest
- Size: Compact — shows last 12 weeks, fits in a stat card
- Alternative (simpler): "Games this month: 8" stat with a small sparkline line chart in forest green

This creates an implicit consistency goal without gamification pressure. The warm color scale keeps it on-brand.

---

## 26. Personal Context on Own Game Cards

> **Backend prerequisite:** Requires a player historical stats API that provides game rankings, streaks, and frequency data. None of these fields exist on `GameNode` or `FeedGameNode`. This feature is blocked on backend work — see "Future features" in the priority summary.

When displaying a game card for the current user's own games, add a personal context line.

### Specification (once backend supports it)

- Position: Below the meta row, rendered in muted text with forest green accent for records
- Examples:
  - "Your highest-scoring basketball game"
  - "3rd game this week"
  - "First win in 4 games"
- Data source: Derived from player stats
- Visibility: Only on the user's own games in the feed view. Not shown in games browse or other profiles.

This is inspired by Strava's personal context on activity cards. It adds meaning to each game beyond the raw score.

---

## 27. Offline & Degraded State Behavior

Users check live scores on mobile, often with poor connectivity at sports venues.

### Live Game Connection Loss

When the WebSocket connection drops during a live game:
- Show a subtle amber banner at the top of the game detail page: "Connection lost. Scores may be delayed. Reconnecting..."
- Banner style: Warm amber background (`--accent-gold`), Nunito 400 text, not alarming red
- Auto-reconnect with exponential backoff
- When reconnected, banner dismisses and scores catch up

### Feed Network Failure

- If the feed fetch fails, show the last successfully loaded feed from memory/cache with a toast: "Showing cached results. Pull to refresh."
- If no cache exists, show the empty state with a "Retry" button

### General

- All loading states should have a timeout. If data hasn't loaded after 10 seconds, show a "Taking longer than expected. Retry?" message instead of an infinite spinner.

This is a stretch goal for a later PR. The connection loss banner for live games is the highest priority item.

---

## 28. Loading Animations

The codebase uses generic `Loader2` spinner and `animate-pulse` skeletons. These should match the brand.

### Skeleton Shimmer

Replace `animate-pulse` (opacity pulse) with a warm gradient sweep:
- Gradient: `oklch(0.93 0.022 80)` → `oklch(0.99 0.006 85)` → `oklch(0.93 0.022 80)` (deep cream → card white → deep cream)
- Animation: `translateX(-100%)` → `translateX(100%)` over 1.5s linear infinite
- Application: All `Skeleton` components

**Implementation note:** This is NOT a simple class swap. The current `Skeleton` component is a single `<div>` with `animate-pulse`. The shimmer effect requires structural changes:

1. Add `overflow-hidden relative` to the outer skeleton `<div>`
2. Add an inner `<span>` with `absolute inset-0` that carries the gradient animation
3. Define a `@keyframes shimmer` in `globals.css` that animates `translateX(-100%)` to `translateX(100%)`
4. The inner span uses `background: linear-gradient(90deg, transparent, oklch(0.99 0.006 85 / 40%), transparent)` with the keyframe animation

This should be done as a single isolated PR with visual testing of every existing skeleton usage (skeletons inside flex containers, grids, etc.) to ensure the DOM change does not break layouts.

### Spinner

- Keep `Loader2` icon but style in `text-primary` (forest green) on cream
- Use `ease-in-out` rotation instead of `linear` for a gentler feel
- For inline load-more (infinite scroll), use three gently bouncing dots in forest green instead of a spinner

### Branded Loading (Stretch Goal)

For full-page loading states, consider a custom SVG animation — a leaf that gently sways or unfurls. Keep it simple (single SVG path animation, <5KB). This is optional polish.

---

## 29. Font Loading Strategy

Two Google Font families with multiple weights means potentially 8+ font files.

### Specification

- `next/font/google` handles optimization automatically (subsetting, preloading, self-hosting)
- Ensure `display: 'swap'` is set (Next.js default) to prevent FOIT
- Set `adjustFontFallback: true` to minimize layout shift with fallback fonts
- Subset to Latin only (already done)
- Preload the bold weight of Quicksand (700) since it is used for scores — the most visually distinctive element
- Add `font-synthesis: none` on elements using custom fonts (via `.font-sans`, `.font-heading` classes), NOT globally on `body`. Applying it globally breaks fallback font rendering during the swap window — headings in the fallback font would render as regular weight, causing a more jarring visual shift when custom fonts load

This is low priority — Next.js handles most of it. Document for completeness.

---

## Summary: Implementation Priority

### Must-have (address in the next relevant PR)

1. Color contrast fix for muted-foreground (light AND dark mode — both values specified)
2. Skip navigation link (WCAG Level A)
3. Touch target minimums (44px)
4. ARIA live regions for live scores
5. Game card visual state differentiation (completed/live/upcoming)
6. Empty states for major views (Phase 1: text + Lucide icons, no custom illustrations)
7. Tab bar full behavior spec (hide on scroll, keyboard, safe areas)
8. Search experience Phase 1 (visual update + mobile overlay, users only — no backend changes)
9. Pull-to-refresh for mobile feed (with scroll event architecture)
10. Dark mode design philosophy applied to tokens
11. Update PR2 plan breakpoints from `md` to `lg` (see PR2 Plan Updates appendix)

### Should-have (dedicated PRs or bundled with related work)

12. Shadow elevation system (4 levels)
13. Motion token system
14. Score change animation
15. Contextual back navigation
16. Profile progressive disclosure
17. Notification center visual update (terracotta badge with verified contrast)
18. `/games/new` dedicated route page (replaces current CreateGameDialog modal for game creation)
19. New Game FAB placement (uses CreateGameDialog as stopgap until `/games/new` exists)
20. Shape-accurate skeleton screens
21. Skeleton shimmer effect (requires DOM restructuring — isolated PR)
22. Responsive breakpoint strategy (tab bar at `lg`)
23. Focus management for inline editing
24. Optimistic UI patterns

### Stretch goals (later PRs, after core is solid)

25. Background texture/grain (PNG tile, not SVG)
26. View transitions — Tier 1 only (same-document cross-fades)
27. Branded loading animations
28. Gesture interactions (with iOS edge-exclusion zones)
29. Offline/degraded state behavior (connection loss banner priority)
30. Font loading optimizations
31. Empty state custom illustrations (Phase 2, requires art direction)

### Future features (requires backend API changes)

These cannot be implemented until the backend GraphQL schema is updated. They are design-ready but blocked on backend work:

32. Engagement signal on game cards (requires `commentCount` field on `GameNode`/`FeedGameNode`)
33. Live score ticker (requires `liveGamesForFriends` query + `gameScoreUpdated` subscription)
34. Search Phase 2 — grouped results (requires `searchGames` and `searchLocations` queries)
35. Post-game celebration card (requires game completion event/webhook)
36. Game frequency heat map on profiles (requires player stats aggregation API)
37. Personal context on own game cards (requires player historical stats API)

---

## Appendix: PR2 Plan Updates

The PR2 navigation plan (`pr2-navigation-plan.md`) was written before this addendum and uses `md:` (768px) as the mobile/desktop breakpoint. This addendum specifies `lg:` (1024px). The following changes must be applied to the PR2 plan before implementation:

### TabBar component (`tab-bar.tsx`)

All `md:` prefixes related to the mobile/desktop layout split must become `lg:`:
```
md:static → lg:static
md:border-b → lg:border-b
md:border-t-0 → lg:border-t-0
md:pb-0 → lg:pb-0
md:mx-auto → lg:mx-auto
md:flex → lg:flex
md:max-w-7xl → lg:max-w-7xl
md:items-center → lg:items-center
md:gap-1 → lg:gap-1
md:px-6 → lg:px-6
md:inline-flex → lg:inline-flex
md:flex-row → lg:flex-row
md:gap-0 → lg:gap-0
md:px-4 → lg:px-4
md:py-2.5 → lg:py-2.5
md:text-sm → lg:text-sm
md:font-medium → lg:font-medium
md:border-b-2 → lg:border-b-2
md:-mb-px → lg:-mb-px
md:border-primary → lg:border-primary
md:text-primary → lg:text-primary
md:border-transparent → lg:border-transparent
md:text-muted-foreground → lg:text-muted-foreground
md:hover:text-foreground → lg:hover:text-foreground
md:hover:border-border → lg:hover:border-border
md:hidden → lg:hidden (for icons)
```

### Layout (`layout.tsx`)
```
pb-16 md:pb-0 → pb-16 lg:pb-0
```

### Navbar (`navbar.tsx`)
```
hidden md:block (search) → hidden lg:block
hidden md:inline-flex (New Game) → hidden lg:inline-flex
```

Also: the New Game button should use `<CreateGameDialog />` as a stopgap instead of `<Link href="/games/new" />`, since that route does not exist yet.

### Messages page height
```
h-[calc(100vh-8rem)] md:h-[calc(100vh-6.5rem)] → h-[calc(100vh-8rem)] lg:h-[calc(100vh-6.5rem)]
```
