# Playground UI Redesign — Ghibli Tranquil

**Date**: 2026-03-08
**Status**: Approved
**Direction**: Studio Ghibli-inspired — warm, tranquil, nature-toned

## Design Philosophy

Playground is a sports app that mixes Strava, Veo, and general sports tracking. Users keep track of scores, share events, and store/livestream games.

The redesign adopts a Studio Ghibli-inspired aesthetic: warm cream backgrounds, rounded typography, nature-derived colors, gentle interactions. This is deliberately unexpected for a sports app, which is what makes it memorable. Most sports apps go dark and aggressive — Playground goes warm and inviting.

**Core principle**: Sports are about the people you play with and the joy of the game. The UI should reflect that warmth.

**Intensity handling**: Gentle by default, with subtle energy for live moments. Like a Ghibli film — the art style never breaks during intense scenes, but the colors deepen and the movement intensifies. A candle flickering brighter, not a siren going off.

---

## 1. Design Tokens

### Typography

| Role | Font | Weight | Notes |
|------|------|--------|-------|
| Display / Headings | Quicksand | 600–700 | Rounded, warm, distinctive |
| Body | Nunito | 400–600 | Rounded but readable at small sizes |
| Scores & Stats | Quicksand | 700 | Rounded warmth even in data. Tabular nums via `font-feature-settings` for alignment |

No monospace for scores — keeps the Ghibli softness. Tabular numerals handle column alignment.

### Color Palette

All colors should be defined in OKLCH for the actual CSS variables.

| Role | Hex Approx | Usage |
|------|------------|-------|
| Background (cream) | `#faf3e6` | Page background |
| Card / Surface | `#fffdf8` | Card backgrounds |
| Deep cream | `#f5ecda` | Recessed areas, score blocks, alternating rows |
| Text Primary | `#3d3426` | Warm charcoal, headings and body |
| Text Secondary | `#7a7060` | Supporting text |
| Text Muted | `#a89e8e` | Captions, metadata |
| Accent Forest | `#5a8a6e` | Primary action color, winning scores, CTAs |
| Accent Terracotta | `#c4785a` | Warm secondary, live indicators |
| Accent Sky | `#6a9ab5` | Cool secondary |
| Accent Gold | `#c9a84c` | Highlights |
| Border | `#e0d8ca` | Card and input borders |
| Shadow | `rgba(61,52,38,0.06)` | Default card shadow |
| Shadow Hover | `rgba(61,52,38,0.1)` | Hover state shadow |

### Sport-Specific Accents

Each sport has a soft background tint and a text color. These are used for accent strips, sport emoji pills, and stat highlights.

| Sport | Background | Text | Emoji |
|-------|-----------|------|-------|
| Basketball | `#f5e0d8` (blush) | Terracotta | 🏀 |
| Tennis | `#e8edd4` (moss) | Forest | 🎾 |
| Football | `#dce8ef` (sky) | Sky | 🏈 |

Sport emoji icons are used inside small rounded pills with the sport-specific soft background. They provide instant recognition and add personality.

### Shape Language

- **Cards**: `border-radius: 18–24px`
- **Buttons / Inputs**: `border-radius: 12–14px`
- **Pills / Badges**: `border-radius: 20px+`
- **Shadows**: Warm-tinted, soft — never cool gray
- **Hover**: `translateY(-2px)` + shadow deepen, `250ms ease` — gentle lift

---

## 2. Navigation & Information Architecture

### Desktop

- **Top navbar**: Logo + wordmark (left), search bar (center), notification bell + avatar (right)
- **Tab bar below navbar**: Feed | Games | Messages | Profile — direct access, no dropdowns

### Mobile

- Tab bar moves to bottom (standard mobile pattern)
- Navbar simplifies to logo + avatar

### Key Changes

- No marketing links (Products/Pricing/Analytics) in the app nav — those belong on a separate landing page or footer
- "New Game" button: prominent CTA, forest green, always accessible (navbar on desktop, or floating action in Games tab)
- Settings: accessible from avatar dropdown or profile page, not top-level nav

### Route Structure

```
/                     → Feed (authenticated) or Landing (guest)
/games                → Browse & filter games
/games/new            → Create game
/game/[id]            → Game detail
/user/[username]      → Unified profile (own or others)
/messages             → Chat
/settings/*           → Account settings
```

The `/player` route is eliminated. Player profile creation/editing happens inline on the unified profile page.

---

## 3. Game Cards & Feed

The game card is the most repeated element. It appears in feeds, game listings, profile history, and search results.

### Card Anatomy (top to bottom)

1. **Friend context bar** — Stacked avatars + "Sofia, Alex, and 2 others played". Omitted if no friends involved. Only shown in the feed view, not in games browse.

2. **Sport accent strip** — 3px gradient bar at top edge using sport-specific color. Instant sport recognition.

3. **Sport emoji pill** — Small rounded pill with emoji on sport-specific soft background (e.g., 🏀 on `#f5e0d8`). Sits alongside any subtype info.

4. **Score block** — Visual centerpiece on recessed cream background:
   - Team/player names left and right, Quicksand 700
   - Large scores centered, winning side in forest green
   - Center pill: "Final", "Q3 4:22", or "Upcoming"
   - Live games: breathing terracotta dot on status pill, faint warm border glow

5. **Meta row** — Location, date/time, media count. Nunito 400, muted.

### Deliberately Omitted

- No likes/comments/shares on cards — social interaction happens inside game detail
- No verbose sport labels — accent strip + emoji pill handle identification

### Feed vs. Games Browse

- **Feed**: Shows friend context bar, prioritized by recency and friend involvement
- **Games browse**: Omits friend context, denser list with filter sidebar

### Upcoming Games

Same card but score block shows date/time prominently instead of scores. Soft terracotta "Upcoming" pill. No recessed cream background — stays flat to signal nothing has happened yet.

---

## 4. Game Detail Page

Everything flows vertically — no tabs. The page is a narrative: score → breakdown → who played → how they played → what it looked like → what people said.

### Page Flow

1. **Back navigation** — Simple "← Back" link

2. **Hero scoreboard** — Largest visual element:
   - Sport emoji + subtype pill top center
   - Team/player names flanking center status
   - Large Quicksand 700 scores, winner in forest green
   - Center status pill
   - Venue + date as quiet metadata below
   - Soft gradient background (moss-to-sky, low opacity)
   - Live: cream deepens, terracotta breathing dot, subtle warm text-shadow on scores

3. **Period/quarter breakdown** — Row of rounded pills with per-period scores. For tennis: sets.

4. **Participants** — Team cards with player lists, join/leave actions

5. **Box scores** — Stats table in rounded card:
   - Cream alternating rows
   - Quicksand with tabular nums
   - Leading stats per column highlighted in forest green (color shift only, not bold)

6. **Media gallery** — Rounded thumbnails in grid:
   - Video thumbnails get forest green play button
   - Livestream: rises to top of page above scoreboard when active

7. **Activity/social** — Comments/reactions from friends at the bottom

### Edit Affordances

Owner/editor sees inline pencil icons next to each section. No separate edit mode.

---

## 5. Unified User Profile

Replaces both `/player` and `/user/[username]`. One page, two contexts (own vs. others).

### Page Flow

1. **Profile header** — Centered:
   - Large rounded avatar with soft warm shadow
   - Display name (Quicksand 700) + @username (muted)
   - Biography (Nunito 400)
   - Own profile: "Edit Profile" outline button
   - Others: "Add Friend" / "Message" / "Block" actions

2. **Player stats summary** — Horizontal row of small rounded stat cards:
   - Games played, wins, sport breakdown
   - Numbers in Quicksand 700, labels in Nunito muted
   - Sport-specific accent colors
   - No player profile yet: warm CTA card to create one

3. **Game history** — Vertical list of game cards:
   - Filtered to this user's games
   - Sport filter pills (🏀 All / 🏀 / 🎾 / 🏈)
   - Most recent first

4. **Highlights / Media** — Grid of thumbnails from their games. Absent if empty (no empty state).

### Key UX Decisions

- No tabs — everything scrolls vertically
- Edit is inline — fields become editable in-place, no page navigation
- Player creation is a warm CTA in the stats section
- Physical stats (height/weight/age) shown on own profile, not prominent on others'

---

## 6. Live Game Treatment

**Principle**: A warm room where a candle flickers brighter — the room doesn't change, the light just shifts.

### In Feed / Game Cards

- Terracotta breathing dot (~2s gentle pulse) on status pill
- Card border shifts to faint terracotta tint (`#c4785a20`)
- Everything else identical — no red banners, no flashing

### On Game Detail Page

- Hero cream deepens from `#faf3e6` → `#f5ecda`
- Scores get very subtle warm text-shadow
- Breathing dot on status pill
- Current period pill gets terracotta soft background
- Livestream video rises above scoreboard as the hero

### In Navigation

- Feed tab gets a small terracotta breathing dot if any friend has a live game
- No notification count badges — just the warm pulse

### Deliberately Avoided

- No "LIVE" in all-caps red
- No flashing or rapid animations
- No urgency patterns (countdowns, "X people watching")
- Viewer count exists but presented casually in muted text

### Accessibility

All breathing animations respect `prefers-reduced-motion` — become static dots with warm color, no pulse.
