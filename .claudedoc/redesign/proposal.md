# Playground Redesign Proposal

## The Problem

The current Playground site looks like a developer prototype — default shadcn/ui styling, Inter font, achromatic gray palette, placeholder navbar links ("Products", "Pricing"), and a component showcase as the landing page. There is no brand identity, no emotional hook, and nothing that communicates "this is where you and your friends play."

The core product is powerful: multi-sport game creation, real-time scoring, livestreaming, media galleries, chat, box scores, friend activity feeds. But the current design wraps all of that in generic SaaS scaffolding. It needs a visual identity as kinetic and social as the product itself.

---

## Design Direction: "Court Culture"

**Concept**: Playground should feel like the energy of showing up to a court with your crew — alive, competitive, communal, a little raw. Not a corporate dashboard. Not a fitness tracker. A *place* where games happen.

Think of it as the intersection of:
- **Strava's social feed** (seeing what your friends are up to)
- **A sports broadcast overlay** (live scores, stats, clean data presentation)
- **A group chat vibe** (casual, fast, familiar)

**Tone**: Confident. Energetic. Social-first. The design should make someone *want* to organize a game.

---

## 1. Brand Identity

### Color System

Ditch the achromatic gray. Introduce a warm, high-energy palette with sport-contextual accent colors.

**Core palette** (dark-mode-first design — sports look better on dark):

| Token | Role | Value (dark) | Value (light) |
|-------|------|-------------|---------------|
| `--surface` | Main background | Rich charcoal `oklch(0.16 0.01 260)` | Warm off-white `oklch(0.97 0.005 80)` |
| `--surface-elevated` | Cards, panels | `oklch(0.20 0.01 260)` | `oklch(1 0 0)` |
| `--brand` | Primary action | Electric amber `oklch(0.82 0.17 75)` | Deepened amber `oklch(0.65 0.19 55)` |
| `--brand-muted` | Subtle brand | `oklch(0.82 0.17 75 / 15%)` | `oklch(0.65 0.19 55 / 10%)` |
| `--live` | Live indicator | Pulse red `oklch(0.65 0.25 25)` | Same |
| `--win` | Victory/positive | `oklch(0.72 0.19 155)` | Same |
| `--text-primary` | Headings | `oklch(0.97 0 0)` | `oklch(0.15 0 0)` |
| `--text-secondary` | Body/muted | `oklch(0.65 0 0)` | `oklch(0.45 0 0)` |

**Sport accent colors** — each sport gets a distinctive tint that subtly shifts the UI when viewing sport-specific content:

| Sport | Accent | Usage |
|-------|--------|-------|
| Basketball | `oklch(0.72 0.18 45)` (burnt orange) | Game cards, headers, score highlights |
| Football | `oklch(0.60 0.16 145)` (field green) | Game cards, headers, score highlights |
| Tennis | `oklch(0.80 0.16 105)` (court lime) | Game cards, headers, score highlights |
| Running/Track | `oklch(0.70 0.20 25)` (track red) | Future |
| Swimming | `oklch(0.70 0.14 230)` (pool blue) | Future |
| Baseball | `oklch(0.65 0.12 55)` (dirt tan) | Future |

These accents appear as:
- A subtle gradient wash on game cards
- The color of score numbers
- Sport icon tints
- Tab/filter active states

### Typography

Replace Inter with a pairing that has personality:

- **Display / Headings**: [**DM Sans**](https://fonts.google.com/specimen/DM+Sans) — geometric, slightly condensed, sporty without being aggressive. Weights 700/800 for impact. Alternatively [**Outfit**](https://fonts.google.com/specimen/Outfit) — rounder, friendlier geometric with good weight range.
- **Body / UI**: [**IBM Plex Sans**](https://fonts.google.com/specimen/IBM+Plex+Sans) — humanist, extremely legible at small sizes, has a technical-but-warm quality perfect for stats and data-heavy interfaces.
- **Mono / Stats**: [**JetBrains Mono**](https://fonts.google.com/specimen/JetBrains+Mono) or **IBM Plex Mono** — for scoreboards, box score tables, stat numbers. Tabular figures are critical for aligned number columns.

**Type scale** — bigger, bolder headings with tighter line-heights:

```
Hero:    clamp(3rem, 8vw, 5.5rem) / 0.9 / -0.03em / weight 800
H1:      clamp(2rem, 4vw, 3rem) / 1.0 / -0.02em / weight 700
H2:      1.5rem / 1.15 / -0.01em / weight 700
Body:    1rem / 1.5 / 0 / weight 400
Caption: 0.8125rem / 1.4 / 0.01em / weight 500
Stat:    1.75rem / 1.0 / -0.02em / weight 700 / mono
```

### Logo & Wordmark

The current logo is a generic SVG. Propose a new wordmark:
- "PLAYGROUND" in DM Sans 800, slightly letterspaced (+0.05em)
- A small icon mark: an abstract "court" — a circle (ball) intersecting perpendicular lines (court markings). Simple enough to work at 16px favicon size.
- The icon can use the brand amber color as a fill

---

## 2. Landing Page (Unauthenticated)

The current landing page shows shadcn component examples. Replace with a proper marketing landing page.

### Hero Section

**Layout**: Full-viewport height. Dark background. Large headline left-aligned with a dynamic media element on the right.

```
┌─────────────────────────────────────────────────────────┐
│  PLAYGROUND                                    Sign In  │
│─────────────────────────────────────────────────────────│
│                                                         │
│  YOUR GAMES.              ┌─────────────────────┐       │
│  YOUR CREW.               │                     │       │
│  YOUR STATS.              │  [Auto-playing       │       │
│                           │   video montage of   │       │
│  Organize pickup games,   │   pickup basketball, │       │
│  track live scores, and   │   tennis rallies,    │       │
│  never miss a moment      │   football games]    │       │
│  with your friends.       │                     │       │
│                           └─────────────────────┘       │
│  [Get Started]  [See How It Works]                      │
│                                                         │
│  ──── Scroll ────                                       │
└─────────────────────────────────────────────────────────┘
```

**Animation**: The three headline words ("GAMES", "CREW", "STATS") cycle through with a clip-path reveal animation, each accompanied by a different sport's accent color as a subtle background glow.

### Feature Sections (Scroll-triggered)

Each section uses a staggered entrance animation (elements slide up with `animation-delay`):

**Section 1 — "Organize in Seconds"**
- Show a mockup of the game creation flow
- Emphasize sport selection, date/time, location, team setup
- Floating sport icons drift in parallax

**Section 2 — "Live From the Court"**
- Show a scoreboard UI with a pulsing LIVE indicator
- Mock livestream embed with overlay controls
- Stats update animation (numbers ticking up)

**Section 3 — "Every Stat. Every Game."**
- Show box score table with player stats
- Game history timeline
- Media gallery preview with photo/video grid

**Section 4 — "Your Crew"**
- Activity feed mockup showing friend games
- Chat preview with message bubbles
- Friend profiles with game history

### Social Proof / Sport Grid

A grid of supported sports with icons and names. Sports already available are full-color; future sports are shown in a muted/coming-soon state. This communicates the platform's breadth.

```
🏀 Basketball    🏈 Football    🎾 Tennis
🏃 Running       🏊 Swimming    ⚾ Baseball    (coming soon, muted)
🏐 Volleyball    ⚽ Soccer      🏑 Hockey      (coming soon, muted)
```

### CTA & Footer

A bold CTA section before the footer: "Ready to play?" with a large sign-up button.

The footer should be redesigned to be more compact and replace placeholder links with real content. Remove "Products", "Pricing", "Analytics", "Automation" — these are SaaS artifacts that don't apply. Keep: About, Contact, Privacy Policy, FAQ, Getting Started.

---

## 3. Navigation Redesign

### Current Problems
- Navbar has "Products" dropdown with fake "Analytics" and "Automation" links
- "Pricing" link to a page that doesn't exist
- Navigation items are hard to find
- Search, notifications, and auth are crammed into a small right section

### Proposed Navigation

**Unauthenticated**: Minimal topbar with logo, "How It Works" link, and Sign In / Sign Up buttons.

**Authenticated**: Two-tier navigation system.

**Top bar** (slim, 48px):
```
┌──────────────────────────────────────────────────────────┐
│ [logo] PLAYGROUND     [Search........]   🔔  [Avatar ▾] │
└──────────────────────────────────────────────────────────┘
```

**Bottom tab bar** (mobile) / Side icon rail (desktop):
```
Desktop (left rail, 64px wide):     Mobile (bottom bar, 56px):
┌────┐                              ┌────────────────────────┐
│ 🏠 │  Feed                        │ 🏠   🏟️   💬   👤    │
│ 🏟️ │  Games                       └────────────────────────┘
│ 💬 │  Chat
│ 👤 │  Profile
│ ➕ │  New Game (FAB)
└────┘
```

The "New Game" action should be prominent and always accessible — a floating action button on mobile, a highlighted button in the side rail on desktop.

**Why this structure**:
- The four core pages (Feed, Games, Chat, Profile) are the primary navigation
- Search and notifications stay in the top bar as utility actions
- "About", "Contact", "Privacy" move exclusively to the footer
- Remove all SaaS-style nav items (Products, Pricing)

---

## 4. Feed Page (Authenticated Home)

### Current State
A simple list of game cards in a centered column. Basic but functional.

### Redesign

**Layout**: Keep the single-column feed (proven pattern from Strava/Instagram), but make each card more visually rich.

**Game Feed Card (redesigned)**:

```
┌──────────────────────────────────────────────┐
│  🟠 (sport accent gradient wash)             │
│                                              │
│  [Avatar] [Avatar] [Avatar]                  │
│  Sarah, Kevin, and 3 others played           │
│  basketball                                  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  TEAM A          72 - 68     TEAM B    │  │
│  │  ───────────── FINAL ──────────────    │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  📍 Riverside Park  ·  📅 Feb 24, 7:00 PM   │
│  🏀 5v5  ·  4 quarters                      │
│                                              │
│  [3 photos]  [1 video]  💬 12 reactions      │
│                                              │
└──────────────────────────────────────────────┘
```

**Key improvements**:
- Sport-specific accent color as a subtle top gradient on each card
- Inline scoreboard with proper team names and final score
- Media preview thumbnails at the bottom of the card
- "LIVE" badge with pulsing animation for in-progress games
- Richer friend context line with avatars

**Live Game Card** — when a game is in progress, the card should feel *alive*:
- Pulsing red "LIVE" dot in the corner
- Score updates via WebSocket subscription (already supported in the backend)
- Animated score number transitions
- Optional: livestream thumbnail preview

**Empty state**: Replace the generic empty component with an illustrated state showing a court with dotted lines and text: "No games in your feed yet. Create one or add friends to see their games here."

---

## 5. Games List Page

### Current State
Filters, sort, and a list of game cards. Functional.

### Redesign

**Sport tabs at the top**: Replace the dropdown sport filter with horizontal pill tabs:
```
[ All ]  [ 🏀 Basketball ]  [ 🏈 Football ]  [ 🎾 Tennis ]
```

Each tab uses the sport's accent color when active. This makes sport switching feel fast and visual.

**Game cards in the list**: Same redesigned card as the feed, but without the friend context line (since this is "my games" or filtered games, the context is different).

**Status filter as segmented control**:
```
[ All ]  [ Scheduled ]  [ Live 🔴 ]  [ Complete ]
```

The "Live" segment should glow or pulse when there are active live games.

**Calendar view toggle**: Add a calendar/month view option in addition to the list view. Games appear as colored dots on calendar dates (color = sport type). Tapping a date shows games for that day.

**Map view toggle**: Since games have locations, offer a map view that shows games as pins. Uses the location coordinates already stored. This is particularly useful for the future Veo-like use case where people discover nearby games.

---

## 6. Game Detail Page

This is the richest page in the app. It needs to feel like a sports broadcast UI.

### Header

```
┌──────────────────────────────────────────────────────────┐
│                                                          │
│  🏀 5v5 Basketball · 4 Quarters                          │
│                                                          │
│     TEAM ALPHA           TEAM BRAVO                      │
│        72      FINAL       68                            │
│                                                          │
│  📍 Riverside Park, Portland · Feb 24, 2026 7:00 PM     │
│                                                          │
│  [Edit Game]  [Share]  [Delete]                           │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

The score section should be large and prominent, with team names flanking the score. For live games, the status badge pulses and scores animate when updated.

### Tab Navigation

Below the header, a tab bar for the game's subsections:

```
[ Scoreboard ]  [ Box Scores ]  [ Media ]  [ Livestream ]  [ Teams ]
```

**Scoreboard tab**: The existing sport-specific scoreboards (basketball quarters, tennis sets, football periods) but restyled:
- Use monospace font for numbers
- Sport accent color for winning team's score
- Period/set indicators as a horizontal timeline
- For tennis: show the classic set-by-set grid layout

**Box Scores tab**: The existing basketball box score table, but with better styling:
- Sticky header row
- Alternating row colors
- Highlighted stat leaders (best value in each column gets the brand color)
- Sortable columns (already supported)

**Media tab**: Photo/video gallery redesigned as a masonry grid:
- Images at natural aspect ratios
- Video thumbnails with play button overlay
- Lightbox view on click
- Upload button (already exists)

**Livestream tab**: New section for embedded livestreams:
- YouTube/Twitch embed player
- Chat overlay alongside the stream (could integrate with game chat)
- Stream status indicator
- Start/end stream controls for the game creator

**Teams tab**: Participant management, same functionality but restyled:
- Team cards with player avatars in a row
- Add/remove player actions
- Player name links to their profile

---

## 7. Player & User Profiles

### Player Profile (own)

Keep the form-based approach for editing your own profile, but add a "profile card" preview:

```
┌─────────────────────────────┐
│  [Large Avatar]              │
│  Kevin Lee                   │
│  @kevinlee                   │
│                              │
│  6'1" · 185 lbs · 28 yrs    │
│                              │
│  "Ball is life"              │
│                              │
│  🏀 42 games · 🏈 8 games   │
│  ⭐ 18.5 PPG · 6.2 RPG      │
│                              │
│  [Edit Profile]              │
└─────────────────────────────┘
```

The aggregated stats section (PPG, RPG, etc.) would require a new backend query — an aggregation of box scores across games. This is a compelling feature to show career/season averages.

### User Profile (viewing others)

Similar card layout but with social actions (Add Friend / Message) and their game history feed.

---

## 8. Chat

### Current State
Full-featured chat with rooms, messages, media, members. The layout is functional.

### Redesign

Keep the split-panel layout (room list | conversation) but improve the visual treatment:

- **Room list**: Show last message preview, unread count badge, avatar of the other person (DM) or group icon
- **Message bubbles**: Rounded, with sent messages in brand amber, received messages in surface-elevated gray. Sport-specific emoji reactions would be fun (🏀, 🎾, 🏈 instead of generic emoji)
- **Media messages**: Inline image/video preview with caption below
- **Typing indicators**: Animated dots

The chat should integrate with games — when you create a game, optionally create a group chat for participants. The game detail page could have a quick-chat panel.

---

## 9. Motion & Micro-interactions

**Page transitions**: Subtle fade + slide-up for page content on route changes. Use Next.js `loading.tsx` with skeleton states that match the final layout.

**Score animations**: When scores update (via WebSocket), numbers should "tick" up/down with a spring animation. The changing digit slides out up and the new digit slides in from below.

**Card hover states**: Game cards lift slightly (translateY -2px) with a soft shadow increase. The sport accent gradient intensifies on hover.

**Live pulse**: The LIVE indicator uses a CSS animation:
```css
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.5); }
}
```

**Staggered list entrance**: When game cards load (feed, game list), they fade in with increasing delay (0ms, 50ms, 100ms, ...).

**Skeleton loading**: All loading states should use skeleton shimmer that matches the card layout. Never show a blank white page or a spinner.

---

## 10. Responsive Design

**Mobile-first** with three breakpoints:
- **Mobile** (< 640px): Single column, bottom tab nav, full-width cards
- **Tablet** (640px - 1024px): Slightly wider cards, top nav
- **Desktop** (> 1024px): Side rail nav + top bar, max-width content area

**Mobile-specific**:
- Bottom tab bar for primary navigation (Feed, Games, Chat, Profile)
- Floating action button for "New Game" (bottom-right, above tab bar)
- Swipe-to-navigate between game detail tabs
- Pull-to-refresh on feed

**Desktop-specific**:
- Side icon rail on the left (can expand to show labels on hover)
- Wider scoreboard layouts
- Side-by-side chat layout (room list + conversation)

---

## 11. New Backend Features to Support the Redesign

These are suggestions for backend additions that would significantly enhance the redesign:

### 11a. Player Career Stats (Aggregate Query)
```graphql
type PlayerCareerStats {
  gamesPlayed: Int!
  # Basketball
  pointsPerGame: Float
  reboundsPerGame: Float
  assistsPerGame: Float
  # Per-sport breakdowns
  gamesBySport: [SportGameCount!]!
}

type SportGameCount {
  sportType: SportType!
  count: Int!
}
```
This powers the profile card's stat summary line.

### 11b. Game Reactions / Comments
```graphql
type GameReaction {
  id: ID!
  user: User!
  emoji: String!  # "🏀", "🔥", "💪", etc.
  createdDate: DateTime!
}

type GameComment {
  id: ID!
  user: User!
  content: String!
  createdDate: DateTime!
}
```
This powers the social engagement layer on feed cards.

### 11c. Game Invitations
```graphql
type GameInvitation {
  id: ID!
  game: Game!
  invitedBy: User!
  invitedUser: User!
  status: InvitationStatus! # PENDING, ACCEPTED, DECLINED
  createdDate: DateTime!
}
```
This supports the "invite friends to a game" workflow, which is core to the product vision.

### 11d. Recurring Games
```graphql
input CreateRecurringGameInput {
  # Same as CreateGameInput but with recurrence
  recurrence: RecurrenceInput!
}

input RecurrenceInput {
  frequency: RecurrenceFrequency! # WEEKLY, BIWEEKLY, MONTHLY
  dayOfWeek: DayOfWeek
  endAfterOccurrences: Int
  endDate: DateTime
}
```
Many pickup games happen on a regular schedule ("Tuesday night basketball"). Recurring games would be a killer feature.

### 11e. Highlights / Clips
For the future Veo-like direction:
```graphql
type Highlight {
  id: ID!
  game: Game!
  user: User!
  resource: Resource!
  timestamp: Int!  # seconds into the game
  description: String
  taggedPlayers: [Player!]!
}
```
This enables clipping moments from livestreams and tagging players in specific plays.

---

## 12. Implementation Phases

### Phase 1: Foundation (Design System + Navigation)
- New color system (CSS variables in globals.css)
- Typography swap (DM Sans + IBM Plex Sans via next/font)
- Navigation restructure (remove SaaS nav, add authenticated nav)
- Footer cleanup
- Dark mode as default with proper light mode

### Phase 2: Landing Page
- Hero section with headline animation
- Feature sections with scroll-triggered animations
- Sport grid
- CTA section
- Replace component-example.tsx entirely

### Phase 3: Feed & Game Cards
- Redesigned game card component with sport accent colors
- Live game card variant with pulse animation
- Improved empty states
- Staggered list animations

### Phase 4: Game Detail
- Scoreboard header redesign
- Tab navigation for game subsections
- Scoreboard, box scores, media, and teams tabs restyled
- Livestream tab UI

### Phase 5: Profiles & Chat
- Profile card design
- User profile with game history
- Chat visual refresh (message bubbles, room list)

### Phase 6: Backend Enhancements
- Player career stats query
- Game reactions/comments
- Game invitations system
- Recurring games

---

## 13. Technical Considerations

### Fonts
Use `next/font/google` for DM Sans and IBM Plex Sans. Define as CSS variables and reference in Tailwind config. JetBrains Mono for stats/scores.

### Dark Mode Default
Flip the default theme to dark. Most sports content (photos, videos) looks better on dark backgrounds. Users can toggle to light mode.

### Sport Accent Color System
Implement as a CSS custom property that gets set via a `data-sport` attribute on parent containers:
```css
[data-sport="BASKETBALL"] { --sport-accent: oklch(0.72 0.18 45); }
[data-sport="FOOTBALL"] { --sport-accent: oklch(0.60 0.16 145); }
[data-sport="TENNIS"] { --sport-accent: oklch(0.80 0.16 105); }
```
Components can then reference `var(--sport-accent)` for sport-contextual styling.

### Animation Library
Use CSS animations for simple effects (fade, slide, pulse). For complex choreography (score ticking, staggered reveals), evaluate whether `framer-motion` (now `motion`) is needed or if CSS `@keyframes` + `animation-delay` suffices. Prefer CSS-only where possible to keep bundle size down.

### Skeleton Loading
Create skeleton variants that mirror each card/page layout. Use CSS `background: linear-gradient(...)` with animation for the shimmer effect. Already have skeleton components from shadcn — extend them.

### Image Optimization
Game media, profile pictures, and sport icons should all use `next/image` with proper `sizes` attributes for responsive images. For the landing page hero video, use `<video>` with `preload="metadata"` and lazy loading.

---

## Summary

This redesign transforms Playground from a generic developer prototype into a distinctive sports social platform. The "Court Culture" aesthetic — warm ambers, sport-specific accents, bold typography, dark-mode-first, kinetic motion — creates an identity that's memorable and true to the product's purpose.

The navigation restructure removes SaaS artifacts and focuses on the four things users actually do: check their feed, browse games, chat, and manage their profile. The landing page tells the product story instead of showing component demos.

Every visual choice reinforces the core experience: *organizing and experiencing games with your friends*.
