# Game Detail Page Redesign

**Date**: 2026-03-15
**Status**: Draft
**Parent**: `.claudedoc/0030-ui-redesign/design.md` (Ghibli Tranquil theme)

## Philosophy

Playground is a casual sports app — pickup games, weekend leagues, friends at the park. The game detail page should feel like flipping through a shared memory, not reading a box score on ESPN.

**Core principle**: People first, stats second, memories throughout.

The page narrative flows: *What happened → Who played → What it looked like → How they played.* Photos of a pickup game matter more than field goal percentages. Seeing your friend's face next to their name matters more than a sortable stats table.

Every element should feel warm, personal, and unmistakably Ghibli — rounded shapes, soft shadows, faces everywhere.

---

## Current State & Problems

The hero scoreboard is well-crafted. Everything below it is functional but undesigned:

1. **Players are bare text** — `<ul>` with `<li>` items showing `displayName`. No avatars, no links, no visual identity
2. **No profile pictures in the data layer** — `PlayerRef` only fetches `{ id, user: { displayName } }`, but the backend supports `profilePicture.thumbnailUrl` (the feed already uses it)
3. **Team cards are generic** — a Card with a title and a flat list. No player count, no avatar group, no team personality
4. **Individual participants are bare rows** — bordered rectangles with a name and a remove button
5. **Box scores lack visual identity** — player names are plain text in a table column
6. **Media is buried at the bottom** — below stats, when it's the most emotionally resonant content for casual players
7. **Action bar is visually noisy** — a row of buttons with no hierarchy between primary and admin actions
8. **No visual connection between sections** — hard breaks between hero, participants, stats, media

---

## Data Layer Changes

### PlayerRef Type Extension

Extend `PlayerRef` to include profile picture and username (for profile links):

```typescript
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

### GraphQL Fragment Changes

Update `participantDetailNodeFragment` to fetch the new fields on both `TeamInstance.players` and `IndividualParticipant.player`:

```
players: {
  id: true,
  user: {
    displayName: true,
    username: true,
    profilePicture: {
      __typename: true,
      __on: [{ __typeName: "ImageResource", thumbnailUrl: true }],
    },
  },
}
```

Same change for `participantNodeFragment` (game cards) so avatars are available on game cards in the future.

Non-breaking change — additional fields on existing queries.

---

## Page Flow (Revised)

```
1. Back navigation
2. Hero scoreboard (refinements)
3. Action bar (simplified, less dominant)
4. Participants (major redesign — the centerpiece of this work)
5. Media gallery (promoted above stats)
6. Box scores (enhanced with avatars, collapsible)
7. [Future] Period breakdown
```

The key reordering: **media moves above box scores.** In a casual app, photos are more interesting than stats tables. Users who care about stats can scroll to them; users who don't (the majority) see the good stuff first.

---

## 1. Hero Scoreboard — Refinements

The hero is already solid. Minor improvements:

- **No structural changes** to score display or sport emoji
- **Description display**: if the game has a description (e.g., "Sunday pickup at the park"), show it as a `TypographyMuted` line between the sport info row and the score block. Truncate to 2 lines with `line-clamp-2`. A `<button>` with `aria-expanded` toggles between truncated and full text (label: "Show more" / "Show less"). On mobile, this prevents the hero from being pushed down by verbose descriptions
- **Live game**: no changes — the breathing dot / terracotta treatment already works

---

## 2. Action Bar — Simplified

**Problem**: Start Game, End Game, Edit, Manage Editors, Delete all sit in one flat row. Most of these are admin-level actions that compete visually with the content.

**Redesign**:

- **Primary action** (Start Game / End Game): stays as a visible button below the hero, styled as the page's main CTA. Forest green, full-width on mobile, auto-width centered on desktop
- **Secondary actions** (Edit, Manage Editors): move into a "more" overflow menu (three-dot icon button, `aria-label={t("game.actions.moreOptions")}`, `min-h-11 min-w-11` touch target). These are used infrequently and shouldn't compete with the page content
- **Destructive action** (Delete Game): inside the overflow menu, visually separated with a divider, destructive styling

This reduces the action bar from 3-5 visible buttons to 1 primary button + 1 icon menu. The page breathes.

**Non-owner/editor view**: the action bar renders nothing — no empty space.

---

## 3. Participants — Major Redesign

This is the heart of the redesign. Two modes: team-based and individual.

### 3a. Team-Based Games (Basketball, Football)

**Desktop layout**: Two teams side-by-side in a two-column grid (`grid-cols-2` at `md+`). The side-by-side layout creates an implicit "versus" without needing to spell it out.

**Mobile layout**: Teams stack vertically.

**3+ teams**: use `grid-cols-2` on desktop with the third team wrapping to the next row. Single-team games render full-width (no grid).

#### Team Container Card

Each team gets a redesigned container:

- **Top section**: Team name (Quicksand 700) on the left. Player count as a muted badge (e.g., "4 players")
- **Left accent border**: 3px solid border cycling through a fixed palette by participant index: `border-primary` (forest green), `border-accent` (terracotta), `border-[oklch(0.60_0.12_230)]` (sky blue), `border-[oklch(0.65_0.12_85)]` (gold). These last two use Tailwind arbitrary values since they're only needed here — no new CSS custom properties required. This gives each team a distinct identity without requiring team logos
- **Card styling**: `bg-card` background, `rounded-2xl`, `shadow-card`. Hover on desktop: `motion-safe:shadow-card-hover` with `motion-safe:-translate-y-0.5`, transition targeting `transform, box-shadow` specifically. The team card hover is purely decorative feedback — it does not navigate anywhere. Only the player name links inside are clickable
- **Join/Leave button**: subtle outline button in the card header, right-aligned. Only visible when the user is eligible to join/leave
- **Team management** (owner/editor only): three-dot overflow menu in the card header with Remove Team (destructive, with divider) and Rename Team. Uses `aria-label={t("game.participants.teamOptions")}`, `min-h-11 min-w-11` touch target

#### Player Rows (inside team container)

Replace the `<ul>` list with styled player rows:

- **Layout**: vertical stack with `divide-y divide-border` between rows for clean separation
- **Each row**: horizontal layout — Avatar (size `default`) + display name (Quicksand 600). The name is a `Link` to `/user/[username]` styled with `text-foreground hover:text-primary` transition (subtle color shift signals clickability without an underline)
- **Avatar**: `AvatarImage` with `thumbnailUrl` (`loading="lazy"`), `AvatarFallback` with initials. Initials derived from displayName: first character of the first and last words, uppercased. Single-word names use the first two characters
- **Clickability affordance**: the player name uses `text-foreground` with `hover:text-primary active:text-primary` transitions on desktop. On mobile, a small chevron-right icon (`size-3.5`, `text-muted-foreground`) at the row's right edge signals tappability. Chevron is visible by default and hidden with `@media (hover: hover) { display: none }` — the inverse of the remove button pattern. This ensures touch users always have a static visual cue
- **No card/border on each row**: the `divide-y` separator and hover state provide structure without visual noise. No shadows or rounded corners on individual rows
- **Current user highlight**: if the player is the logged-in user, show a subtle `bg-secondary` background fill (no borders) and a small "You" badge (muted, pill-shaped, `aria-label={t("game.participants.currentUser")}`) to the right of their name
- **Remove button** (owner/editor only): on desktop (`@media (hover: hover)`), appears on row hover/focus. On touch devices (no hover), always visible. Ghost variant, `min-h-11 min-w-11` touch target, `aria-label={t("game.participants.removePlayer")}`. Positioned at the right edge of the row
- **Focus-visible**: player name links show `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` for keyboard navigation. Remove buttons get the same treatment
- **Keyboard navigation**: users can Tab through player links and remove buttons sequentially within each team card

#### Empty Team State

When a team has no players: warm empty state inside the card — muted message (translation key `game.participants.noPlayersYet`, e.g., "This team is waiting for players") with a "Join Team" CTA if the user is eligible. Center-aligned, generous padding.

### 3b. Individual Games (Tennis Singles, etc.)

**Desktop layout**: When exactly 2 participants, side-by-side in `grid-cols-2`. Otherwise, vertical stack.

#### Participant Cards

Each participant gets a card (not just a bordered row):

- **Layout**: Avatar (size `lg`) + display name (Quicksand 600)
- **Card styling**: `bg-card`, `rounded-xl`, `shadow-card`, `p-4`
- **Hover**: `motion-safe:shadow-card-hover` with `motion-safe:-translate-y-0.5`, targeting `transform, box-shadow`
- **Clickability**: the player name is a `Link` to `/user/[username]` with the card overlay pattern — CSS `::after` pseudo-element on the name link with `absolute inset-0` makes the full card clickable, while action buttons use `relative z-10` to sit above the overlay. This avoids nested `<a>` inside `<a>` or `<button>` inside `<a>`
- **Join/Leave**: button in the section header, not per-card
- **Remove** (owner/editor only): ghost `X` button per-card, always visible (cards are large enough that the button doesn't crowd). `min-h-11 min-w-11` touch target, `aria-label`
- **Focus-visible**: `focus-visible:ring-2 focus-visible:ring-ring` on the name link

### 3c. Section Header

The "Participants" section header gets a small redesign:

- Title on the left (`TypographyH4`, Quicksand 700)
- "Add Team" button on the right (for team games, outline variant, disabled while an add-team operation is pending)
- Below the header, the team grid begins immediately — no extra card wrapper around the entire section. The teams themselves are the cards. Remove the current outer `Card` wrapper that nests team cards inside another card

---

## 4. Media Gallery — Promoted

**Position change**: moves above box scores in the page flow.

**Visual changes**:

- **Section header**: "Photos & Videos" (`TypographyH4`) with media count badge
- **Grid**: keep current responsive grid (2 cols mobile, 3 cols tablet, 4 cols desktop)
- **Thumbnails**: `rounded-xl` (currently `rounded-lg`), `motion-safe:shadow-card-hover` on hover
- **Video indicator**: forest green play button overlay on video thumbnails (per design doc, verify if already implemented)
- **Upload area**: when user can upload, show a `<button>` styled as a dashed-border card in the grid as the last item (camera icon + translation key for "Add photo", `aria-label={t("game.media.uploadPhoto")}`). Clicking opens the file picker (multi-select enabled). Uploading files appear as skeleton placeholders in the grid, same as current behavior. The upload card remains at the end of the grid during uploads
- **Empty state**: when no media exists and user can upload, show the upload card alone with muted text (translation key `game.media.emptyUploadPrompt`). When user can't upload and no media, hide the section entirely (no empty state for non-participants)

---

## 5. Box Scores — Enhanced

**Position**: below media (demoted from current position, appropriate for casual emphasis).

### Collapsible Per Team

Wrap each team's box score table in a collapsible section using the shadcn Collapsible component (provides built-in `aria-expanded`, `aria-controls`, keyboard Enter/Space activation):

- **Default state**: collapsed for viewers and for scheduled/in-progress games. **Expanded by default** when `viewerGameRole != null` and `gameStatus === COMPLETE` — this is the moment when stat entry is most relevant, and collapsing it would hide the primary post-game workflow for owners
- **Trigger**: `<button>` with team name + chevron icon (rotates on expand). Shows a summary when collapsed: player count or total score
- **Expanded**: reveals the full stats table
- **Mobile**: consider a sticky first column (`sticky left-0 bg-card`) on the stats table so player names remain visible during horizontal scroll. The avatar addition widens the player column, making this more important

### Avatar in Player Column

- First column of the box score table: Avatar (size `sm`) + player name
- Avatar images use `loading="lazy"` since the section may be collapsed/below fold
- This creates visual consistency with the participant section — the same faces appear in both places

### Leading Stat Highlight

Per the original design doc: the leading value in each stat column gets `text-primary` (forest green) **and** `font-semibold` (secondary non-color indicator for WCAG 1.4.1 compliance). This makes it instantly scannable who led each category, including for users with color vision deficiency.

### No Box Scores Available

When the game has no box score data (common in casual games): hide the section entirely. No empty state — its absence isn't notable for casual play.

---

## 6. Desktop Layout Refinements

### Two-Column Teams

On `md+` screens, the two team cards sit side-by-side:

```
┌─────────────────┐  ┌─────────────────┐
│ ▎ Team A         │  │ ▎ Team B         │
│   4 players      │  │   3 players      │
│                  │  │                  │
│  ○ Kevin Lee   › │  │  ○ Alex Chen   › │
│  ○ Sofia Park  › │  │  ○ Jordan Kim  › │
│  ○ Marcus Wu   › │  │  ○ Sam Rivera  › │
│  ○ Ava Patel   › │  │                  │
│                  │  │  [Join Team]     │
│  [Leave Team]    │  │                  │
└─────────────────┘  └─────────────────┘
```

The gap between columns provides the "versus" divide. No explicit "VS" text or icon needed — the layout implies it. The `▎` represents the colored left accent border. The `›` represents the mobile chevron affordance.

### Max Width

Keep `max-w-4xl` for the page container. The two-column team layout works within this width without feeling cramped.

---

## 7. Spacing & Section Rhythm

Consistent vertical spacing between page sections:

- **Between hero and action bar**: `mt-4` (tight — they're related)
- **Between action bar and participants**: `mt-8`
- **Between participants and media**: `mt-8`
- **Between media and box scores**: `mt-8`
- **Section headings**: `TypographyH4` with `mb-4` below

No decorative dividers between sections. The spacing and card backgrounds provide sufficient visual separation.

All hover animations (`-translate-y`, shadow transitions) wrapped in `motion-safe:` to respect `prefers-reduced-motion`. Users with reduced motion see instant state changes with no transform.

---

## 8. Loading Skeleton Updates

Update `loading.tsx` to match the new layout:

- Hero skeleton: keep as-is
- Participants skeleton: `md:grid-cols-2` grid with two card skeletons, each containing 3-4 avatar-circle + text-line row skeletons inside. Matches final layout to prevent CLS on content load
- Media skeleton: grid of `rounded-xl` rectangle skeletons matching the responsive column count
- Box scores skeleton: single collapsed-state skeleton (team name bar + chevron) when viewer is an owner of a completed game. Otherwise omitted

---

## Accessibility Summary

Consolidated accessibility requirements across all sections:

| Concern | Approach |
|---------|----------|
| Touch targets | All interactive elements (buttons, icon buttons, overflow menus) use `min-h-11 min-w-11` (44px) |
| Icon-only buttons | All have explicit `aria-label` via translation keys |
| Hover-only interactions | Remove buttons use `@media (hover: hover)` for hide-on-default behavior. On touch devices, always visible |
| Focus-visible | All links and buttons show `focus-visible:ring-2 focus-visible:ring-ring` |
| Reduced motion | All transforms and transitions wrapped in `motion-safe:`. Instant state changes for reduced-motion users |
| Color-only meaning | Leading stats use `font-semibold` as secondary indicator alongside `text-primary`. Team accent borders are decorative — team names provide the semantic differentiation |
| Keyboard navigation | Player rows are tabbable links. Collapsible sections use `<button>` with `aria-expanded`. Overflow menus are accessible via standard dropdown pattern |
| Screen reader | "You" badge has `aria-label`. Upload card has `aria-label`. Description expand/collapse button has `aria-expanded` |
| Image loading | Avatar images use `loading="lazy"` to avoid unnecessary network requests below fold |

---

## Future / TODO

These are explicitly out of scope but noted for future work:

- **Period/quarter breakdown**: row of rounded pills with per-period scores, positioned between hero and participants. Requires verifying backend exposes per-period data in the participant metadata. Tracked separately
- **Game card avatars**: using the extended `PlayerRef` with profile pictures on the game card (feed and browse views) — separate PR
- **Inline stat badges on player cards**: showing a key stat (e.g., "18 pts") on the player's mini-card in the participant section. Deferred — adds complexity and the box score already covers this
- **Media woven into narrative**: promoting 1-2 hero images above participants. Deferred — requires deciding which media to promote (most recent? most liked? first uploaded?)
- **Long player lists**: if a team has 10+ players, consider a "show more" collapse at ~8 players. Not needed for the typical 3-5 player casual game

---

## Scope Summary

| Section | Change Level | Description |
|---------|-------------|-------------|
| Data layer | New fields | Add `username`, `profilePicture` to `PlayerRef` + GraphQL fragments |
| Hero | Minor | Add game description display with `line-clamp-2` |
| Action bar | Moderate | Primary CTA + overflow menu for secondary/destructive actions |
| Participants (teams) | **Major** | Side-by-side team cards, player rows with avatars, team overflow menu |
| Participants (individual) | **Major** | Avatar cards with card overlay link pattern |
| Media gallery | Moderate | Promote above stats, inline upload card, rounded thumbnails |
| Box scores | Moderate | Collapsible (smart default), avatars in player column, leading stat highlight with semibold |
| Loading skeleton | Minor | Match new two-column layout |
| Spacing | Minor | Consistent section rhythm, `motion-safe:` on all animations |
