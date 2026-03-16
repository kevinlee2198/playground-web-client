# Game Detail Page Redesign — Implementation Plan

**Date**: 2026-03-15
**Design**: `.claudedoc/0057-game-detail-page-improvements/design.md`

---

## Implementation Order

Steps are ordered by dependency: data layer first, then components bottom-up (leaf components before containers), then page assembly.

---

## Step 1: Data Layer — PlayerRef & GraphQL Fragments

**Files to modify:**
- `src/lib/types/game.ts` — Extend `PlayerRef`
- `src/lib/graphql-fragments.ts` — Update fragments

### 1a. Extend `PlayerRef` type

```typescript
// src/lib/types/game.ts
export interface PlayerRef {
  id: number;
  user: {
    displayName: string;
    username: string;
    profilePicture: {
      __typename: "ImageResource";
      thumbnailUrl: string | null;
    } | null;
  };
}
```

### 1b. Update GraphQL fragments

In `participantNodeFragment`, `participantDetailNodeFragment`, **and the box score query** (`game-box-scores.tsx`), update the `players` (team) and `player` (individual) fields:

```typescript
// Add to the user object in all three locations
user: {
  displayName: true,
  username: true,
  profilePicture: {
    __typename: true,
    __on: [{ __typeName: "ImageResource", thumbnailUrl: true }],
  },
},
```

The box score query in `game-box-scores.tsx` fetches its own `player` field separately from the participant fragments. It currently only has `{ id, user: { displayName } }` — it must be updated to match the new `PlayerRef` shape, otherwise `PlayerAvatar` will have no profile picture data and avatars will always show fallback initials.

Also update the `BasketballBoxScoreNode` type (or equivalent) to use the full `PlayerRef` type.

**Verification**: `npm run build` — type errors will surface any downstream components that need updates for the new shape. Fix those before proceeding.

---

## Step 2: Player Avatar Helper

**Files to create:**
- `src/components/game/player-avatar.tsx`

A shared component used in team player rows, individual participant cards, and box score tables.

```typescript
// Props
interface PlayerAvatarProps {
  player: PlayerRef;
  size?: "sm" | "default" | "lg";
}
```

- Uses `Avatar`, `AvatarImage`, `AvatarFallback` from `@/components/ui/avatar`
- `AvatarImage`: `src={player.user.profilePicture?.thumbnailUrl}`, `alt=""` (decorative — the display name is always rendered as adjacent text, so the image is redundant for screen readers). When `loading` prop is not specified, defaults to eager (appropriate for above-fold participant avatars). Pass `loading="lazy"` explicitly only from box score tables where avatars are below fold / inside collapsed sections
- `AvatarFallback`: initials derived from `displayName` — first char of first word + first char of last word, uppercased. Single-word names: first two chars
- Extract initials logic into a plain function `getInitials(displayName: string): string` within the same file (not a separate util — only used here). Handle edge cases: trim whitespace, return empty string for empty input, return first char uppercased for single-char names. Use `displayName.trim().split(/\s+/)` to handle irregular whitespace
- Accept an optional `loading?: "lazy" | "eager"` prop, defaulting to `"eager"`

**Not a client component** — no interactivity. Can render on server.

---

## Step 3: Hero — Game Description Display

**Files to modify:**
- `src/components/game/game-detail-hero.tsx`

### Changes

Add a description block between the sport info row and the score block:

- Only render when `game.description` is truthy
- `TypographyMuted` with `line-clamp-2` by default
- A `<button>` toggles between clamped and full text
  - `aria-expanded` attribute
  - Label: `t("game.hero.showMore")` / `t("game.hero.showLess")`
  - This requires client-side state. **The hero must remain a server component** — it uses `getTranslations()` and `getFormatter()` from `next-intl/server` which only work in server components. Extract a small `GameDescription` client component that receives `description: string` and renders the truncation toggle. Do not make the entire hero a client component

**Translation keys to add** (`messages/en.json`):
- `game.hero.showMore`: `"Show more"`
- `game.hero.showLess`: `"Show less"`

---

## Step 4: Action Bar — Simplified

**Files to modify:**
- `src/components/game/game-detail-actions.tsx`

### Current state
Renders 3-5 buttons in a row: Start/End Game, Edit, Manage Editors, Delete.

### Changes

1. **Primary CTA** (Start Game / End Game):
   - Full-width on mobile, auto-width centered on desktop
   - Forest green (`bg-primary`)
   - Keep existing logic for which button to show based on `gameStatus`

2. **Overflow menu** (three-dot button):
   - `DropdownMenu` from shadcn/ui
   - Trigger: icon button with `MoreHorizontal` icon, `aria-label={t("game.actions.moreOptions")}`, `min-h-11 min-w-11`
   - Items: Edit Game, Manage Editors
   - Separator
   - Delete Game (destructive styling)

3. **Layout**: flex row with primary CTA and overflow button. When viewer has no role, render nothing (no empty container)

**Translation keys to add:**
- `game.actions.moreOptions`: `"More options"`

**Existing dialogs** (`UpdateGameForm`, `ManageEditorsDialog`, `DeleteGameDialog`) remain unchanged — they're triggered from the overflow menu items instead of standalone buttons.

---

## Step 5: Participants — Team Card Redesign

**Files to modify:**
- `src/components/game/team-card.tsx` — Major rewrite
- `src/components/game/game-participants.tsx` — Layout changes

### 5a. Team Card Container

Replace current Card-based layout:

- **Outer**: `bg-card rounded-2xl shadow-card` with left accent border (`border-l-[3px]`)
- **Border colors cycle** by participant index:
  - 0: `border-primary` (forest green)
  - 1: `border-accent` (terracotta)
  - 2: `border-[oklch(0.60_0.12_230)]` (sky blue)
  - 3: `border-[oklch(0.65_0.12_85)]` (gold)
  - Use `participantIndex % 4` to cycle
- **Hover**: `motion-safe:hover:shadow-card-hover motion-safe:hover:-translate-y-0.5 transition-[transform,box-shadow]`
- **Header**: Team name (Quicksand 700) left, player count badge (`TypographyMuted`, e.g., "4 players") right
  - Join/Leave button: outline variant, right-aligned in header (visible when eligible)
  - Team overflow menu (owner/editor): three-dot button with Remove Team (destructive, with separator). `aria-label={t("game.participants.teamOptions")}`, `min-h-11 min-w-11`
  - **Rename Team**: deferred — requires a new dialog, form, and server action (`updateTeamParticipant` name mutation). Out of scope for this PR. Do not include in the overflow menu until implemented

### 5b. Player Rows Inside Team Card

- **Layout**: vertical stack with `divide-y divide-border`
- **Each row**: `PlayerAvatar` (size `default`) + display name as `Link` to `/user/${player.user.username}`
  - Link styling: `text-foreground hover:text-primary active:text-primary transition-colors`
  - `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm`
- **Mobile chevron**: `ChevronRight` icon (`size-3.5`, `text-muted-foreground`) at row right edge. Hidden with `@media (hover: hover) { display: none }` — use a CSS class or Tailwind arbitrary variant
- **Current user highlight**: if `player.id === viewerPlayerId`, apply `bg-secondary` background to the row + "You" pill badge (`TypographyMuted`, small pill, `aria-label={t("game.participants.currentUser")}`)
- **Remove button** (owner/editor): ghost variant, `X` icon, `min-h-11 min-w-11`, `aria-label={t("game.participants.removePlayer")}`. Use `@media (hover: hover)` to control visibility — on hover-capable devices, hidden by default and shown on row hover/focus-within. On touch devices (no hover media), always visible. Do **not** use `opacity-0/100` — invisible-but-focusable elements confuse keyboard navigation. Use display-based hiding (`hidden`/`block` or a CSS class) so the button is removed from tab order when hidden

### 5c. Empty Team State

When `team.players.length === 0`:
- Muted centered text: `t("game.participants.noPlayersYet")`
- "Join Team" CTA if eligible
- Generous padding (`py-8`)

### 5d. GameParticipants Layout Changes

- **Remove outer Card wrapper** — teams are the cards themselves
- **Section header**: `TypographyH4` "Participants" left, "Add Team" button right (for team games)
- **Grid**: `grid md:grid-cols-2 gap-4` for 2+ teams. Single team: full-width
- **3+ teams**: `grid-cols-2` on desktop, third team wraps

**Translation keys to add:**
- `game.participants.teamOptions`: `"Team options"`
- `game.participants.noPlayersYet`: `"This team is waiting for players"`
- `game.participants.currentUser`: `"You"`
- `game.participants.removePlayer`: `"Remove player"`
- `game.participants.playerCount`: `"{count} players"` (or `"{count} player"` for singular — use ICU plurals if next-intl supports it, otherwise conditional)

**Props additions**: `TeamCard` needs `participantIndex: number` for border color and `viewerPlayerId: number | null` for "You" highlight. Thread these from `GameParticipants`.

**i18n fix**: The existing team card has hardcoded English strings in alert dialog descriptions (e.g., "Are you sure you want to remove {team.name}?"). Replace with translation keys during the rewrite:
- `game.participants.removeTeamConfirm`: `"Are you sure you want to remove {teamName}? This action cannot be undone."`

---

## Step 6: Participants — Individual Redesign

**Files to modify:**
- `src/components/game/individual-participant-list.tsx`

### Changes

- **2 participants**: `grid md:grid-cols-2 gap-4` (side-by-side on desktop)
- **Otherwise**: vertical stack

**Individual participant card**:
- `bg-card rounded-xl shadow-card p-4`
- `PlayerAvatar` (size `lg`) + display name (Quicksand 600)
- Display name is a `Link` to `/user/${participant.player.user.username}`
- **Card overlay pattern**: the name `Link` uses `::after` pseudo-element with `absolute inset-0` for full-card clickability. Action buttons use `relative z-10`
- **Hover**: `motion-safe:hover:shadow-card-hover motion-safe:hover:-translate-y-0.5 transition-[transform,box-shadow]`
- **Remove button** (owner/editor): ghost `X` button, always visible, `min-h-11 min-w-11`, `aria-label`, `relative z-10`
- **Focus-visible**: `focus-visible:ring-2 focus-visible:ring-ring` on the name link. Additionally, apply `focus-within:ring-2 focus-within:ring-ring rounded-xl` on the card container so the focus ring outlines the card boundary when the internal overlay link receives focus (since the entire card is visually clickable via `::after`)

---

## Step 7: Media Gallery — Promoted & Enhanced

**Files to modify:**
- `src/app/[locale]/game/[id]/page.tsx` — Reorder: media before box scores
- `src/components/game/game-media-gallery.tsx` — Visual tweaks

### 7a. Page reorder

In `page.tsx`, move `GameMediaGallery` rendering above `GameBoxScores`.

### 7b. Visual changes

- **Section header**: `TypographyH4` "Photos & Videos" with media count badge
- **Thumbnails**: change `rounded-lg` to `rounded-xl`
- **Hover**: add `motion-safe:hover:shadow-card-hover` to thumbnails
- **Upload card**: style as dashed-border card (`border-2 border-dashed border-muted-foreground/25 rounded-xl`) with camera icon + `t("game.media.uploadPhoto")` label, `aria-label={t("game.media.uploadPhoto")}`
  - Rendered as last item in the grid
  - Clicking opens file picker (multi-select)
  - Add `aria-label={t("game.media.uploadPhoto")}` to the hidden `<input type="file">` element as well (screen readers can still encounter it)
- **Empty state**: when no media and user can upload, show upload card alone with `t("game.media.emptyUploadPrompt")`. When user can't upload and no media, hide section entirely

**Translation keys to add:**
- `game.media.uploadPhoto`: `"Add photo"`
- `game.media.emptyUploadPrompt`: `"Capture the moment — add your first photo"`

---

## Step 8: Box Scores — Collapsible with Avatars

**Files to modify:**
- `src/components/game/game-box-scores.tsx` — Collapsible wrapper, avatar integration
- Basketball box score table component — Avatar in player column, leading stat highlight

### 8a. Collapsible per team

Wrap each team's box score in `Collapsible`:
- **Default collapsed** unless `viewerGameRole != null && gameStatus === "COMPLETE"`
- **Trigger**: `<CollapsibleTrigger>` button with team name + `ChevronDown` icon (rotates on expand via CSS `data-[state=open]:rotate-180`)
- **Collapsed summary**: player count or total score

### 8b. Avatar in player column

- First column: `PlayerAvatar` (size `sm`, `loading="lazy"`) + player name
- `loading="lazy"` is appropriate here — box scores are below fold and often collapsed

### 8c. Leading stat highlight

- Per stat column, the maximum value gets `text-primary font-semibold`
- Secondary non-color indicator (semibold) for WCAG 1.4.1 compliance
- Apply `tabular-nums` (Tailwind: `tabular-nums`) to all stat table cells so numbers align vertically in columns

### 8d. Mobile sticky first column

- Player name column: `sticky left-0 bg-card z-10` for horizontal scroll on mobile

**Props additions**: `GameBoxScores` needs `viewerGameRole` and `gameStatus` for smart default expand behavior. Thread from `page.tsx`.

### 8e. Suspense boundary

Wrap `GameBoxScores` in `<Suspense>` with a skeleton fallback in `page.tsx`. The box score component is an async server component that makes its own GraphQL query — without Suspense, it blocks the entire page render. Since box scores are now below fold and collapsible, they're a prime candidate for streaming.

### 8f. Content-visibility optimization

Apply `content-visibility: auto` with `contain-intrinsic-size: 0 200px` on the box score section wrapper. Since the section is below fold and often collapsed, this lets the browser skip rendering until it scrolls into view.

---

## Step 9: Loading Skeleton Updates

**Files to modify:**
- `src/app/[locale]/game/[id]/loading.tsx`

### Changes

Match new layout:
- Hero skeleton: keep as-is
- **Participants skeleton**: `md:grid-cols-2` grid with two card-shaped skeletons, each containing 3-4 rows of circle + text-line skeletons
- **Media skeleton**: grid of `rounded-xl` rectangle skeletons, responsive columns (2/3/4)
- **Box scores skeleton**: show a single collapsed-state skeleton (team name bar + chevron) when the Suspense boundary is pending. This prevents layout shift when box scores stream in, especially for owners of completed games where box scores default to expanded

---

## Step 10: Spacing & Section Rhythm

**Files to modify:**
- `src/app/[locale]/game/[id]/page.tsx`

Apply consistent spacing:
- Hero → Action bar: `mt-4`
- Action bar → Participants: `mt-8`
- Participants → Media: `mt-8`
- Media → Box scores: `mt-8`
- Section headings: `TypographyH4` with `mb-4`

Remove any decorative dividers between sections.

---

## Step 11: Translation Keys (Batch)

**Files to modify:**
- `messages/en.json`

All new keys consolidated (some may already exist — check before adding):

```json
{
  "game": {
    "hero": {
      "showMore": "Show more",
      "showLess": "Show less"
    },
    "actions": {
      "moreOptions": "More options"
    },
    "participants": {
      "teamOptions": "Team options",
      "noPlayersYet": "This team is waiting for players",
      "currentUser": "You",
      "removePlayer": "Remove player",
      "playerCount": "{count, plural, one {# player} other {# players}}",
      "removeTeamConfirm": "Are you sure you want to remove {teamName}? This action cannot be undone."
    },
    "media": {
      "uploadPhoto": "Add photo",
      "emptyUploadPrompt": "Capture the moment — add your first photo"
    }
  }
}
```

Note: Merge into existing `game` key structure. Don't overwrite existing keys.

---

## Verification Checklist

After each step:
1. `npm run build` — no type errors
2. `npm run lint` — no lint violations

After all steps:
1. `npm run build` — clean build
2. `npm run lint` — clean lint
3. `npm test` — existing tests pass
4. Manual verification:
   - Team game with 2 teams: side-by-side layout on desktop
   - Individual game with 2 players: side-by-side on desktop
   - Avatars render with fallback initials when no profile picture
   - Overflow menu works for action bar
   - Box scores collapse/expand correctly
   - Media gallery appears above box scores
   - Description truncation toggle works
   - Keyboard navigation: Tab through player links, focus-visible rings
   - Mobile: chevrons visible, remove buttons visible, responsive grid stacks

---

## Files Changed Summary

| File | Change |
|------|--------|
| `src/lib/types/game.ts` | Extend `PlayerRef` |
| `src/lib/graphql-fragments.ts` | Add `username`, `profilePicture` to participant fragments |
| `src/components/game/player-avatar.tsx` | **New** — shared avatar component |
| `src/components/game/game-detail-hero.tsx` | Add description display |
| `src/components/game/game-detail-actions.tsx` | Overflow menu redesign |
| `src/components/game/team-card.tsx` | Major rewrite — styled cards, player rows, avatars |
| `src/components/game/game-participants.tsx` | Remove outer card, grid layout, pass new props |
| `src/components/game/individual-participant-list.tsx` | Card-based layout with avatars |
| `src/components/game/game-media-gallery.tsx` | Visual tweaks, upload card, section reorder |
| `src/components/game/game-box-scores.tsx` | Collapsible, avatars, leading stat highlight, update box score query + types |
| `src/app/[locale]/game/[id]/page.tsx` | Reorder sections, spacing, pass new props |
| `src/app/[locale]/game/[id]/loading.tsx` | Match new layout |
| `messages/en.json` | New translation keys |
