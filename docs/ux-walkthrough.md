# UX Walkthrough

## Unauthenticated Experience

### Landing Page (`/`)

A new visitor arrives at the public home page. They see:

1. **Hero section** — tagline and description introducing Playground
2. **Discover feed** — a list of public games, sorted by start date (newest first). Visitors can filter by sport type, game status, and location. If a location is provided, results sort by distance instead.
3. **Navbar** — logo, search bar (desktop) or search icon (mobile), and a "Sign In" button
4. **Footer** — links to Getting Started, About, Contact, and FAQ

There is no tab bar for unauthenticated users.

### Browsing Without an Account

Visitors can freely access:

| Page | What they see |
|------|---------------|
| `/` | Discover feed with public games |
| `/search` | Search for users by name. Results show basic profile info but no follow actions |
| `/user/[username]` | Public user profiles (display name, bio, player stats, game history). Private profiles show a lock icon and "This profile is private" message |
| `/game/[id]` | Game detail for **public** games only. Shows sport type, location, participants, scores, and media. No viewer-specific context (no role, no invitation status). Private games redirect to home |
| `/resource/get-started` | Onboarding guide: Sign Up, Find People, Create Game, Track Scores, Share Memories |
| `/resource/about` | About page |
| `/resource/contact` | Contact page |
| `/resource/frequently-asked-questions` | FAQ page |

Visitors **cannot**: create games, join games, send messages, follow users, receive notifications, or access settings.

### Signing In

1. Visitor clicks "Sign In" in the navbar
2. Redirected to Keycloak OAuth (PKCE flow) for sign-up or sign-in
3. On success, redirected back to the page they were on
4. Session stored as an encrypted JWE cookie

---

## Authenticated Experience

After signing in, the experience changes significantly.

### Navigation

**Navbar** gains:
- "Create Game" button (desktop only)
- Notification bell with unread count and real-time updates via WebSocket
- User avatar dropdown menu with: View Profile, Settings, Sign Out

**Tab bar** appears (hidden for unauthenticated users):
- **Mobile**: fixed bottom bar with 4 icons (Home, Games, Messages, Profile). Hides on scroll down, reappears on scroll up
- **Desktop**: horizontal tab strip below the navbar

### Home — Activity Feed (`/`)

The home page switches from the public discover feed to a personalized activity feed showing games from people the user follows or participates in.

- Header with "Create Game" button
- Feed of game cards from followed users
- Empty state with CTAs: "Browse Games" and "Find People"

### Games (`/games`)

Two tabs:

**My Games** (default):
- All games the user is involved in
- Filter sidebar: sport type, game status (Scheduled / In Progress / Complete), date range
- Sub-filters in sort bar: Playing, Invited, Managing, All
- Sort by start date, participant count, etc.

**Discover**:
- Same discover feed as the public home page, but with authenticated context
- Game cards show the user's role, invitation status, and which friends are playing
- Location-based discovery with distance presets

### Create Game (`/game`)

Form to create a new game:
- Pick a sport (Baseball, Basketball, Football, Tennis, Pickleball)
- Set format (e.g., 5v5, 3v3, Singles, Doubles, Flag, American)
- Set date/time, location, visibility (Public/Private), description
- Redirects to the new game's detail page on success

### Game Detail (`/game/[id]`)

Authenticated users see additional context compared to visitors:
- Their role in the game (organizer, player, spectator)
- Pending invitations they can accept/decline
- Which of their followed users are playing
- Full participant list (up to 50)
- Media gallery (photos/videos) with upload capability
- Sport-specific box score statistics (only loaded for authenticated users):

| Sport | Stats |
|-------|-------|
| Basketball | Points, assists, rebounds, steals, blocks, FG%, 3P%, FT% |
| Football | Offensive (passing/rushing/receiving), Defensive (tackles/sacks/INTs), Special Teams |
| Tennis | Aces, serve %, break points, return points, winners, unforced errors |
| Pickleball | Aces, faults, dinks, drives, drops, lobs, volleys, overheads |
| Baseball | Batting, pitching, fielding stats |

Game organizers can manage the game (start, end, finalize results, manage editors, transfer ownership).

### User Profile (`/user/[username]`)

**Own profile**:
- Profile header (display name, bio, profile picture, follower/following counts)
- Editable player stats (age, height, weight) via inline editor
- Recent game history (last 5 games, paginated)

**Other user's profile**:
- Same layout but read-only
- Follow/unfollow button, or pending follow request indicator
- Private profiles show a locked notice unless the viewer follows them

### Chat (`/chat`)

- List of chat rooms (conversations with followed people)
- Select a room to view the conversation
- Real-time messages via WebSocket subscription
- Deep-linkable via `?room=<id>` query param

### Search (`/search`)

Same search page as unauthenticated, but results include follow status and follow/unfollow actions.

### Notifications

- Bell icon in navbar with unread count badge
- Popover shows notification list (follow requests, game updates, etc.)
- Real-time updates via WebSocket subscription
- Mark as read on open

### Settings (`/settings`)

Sidebar navigation with five sections:

| Section | Route | Purpose |
|---------|-------|---------|
| Display | `/settings/display` | Theme, language, appearance |
| Games | `/settings/games` | Game preferences, favorite sports |
| Notifications | `/settings/notifications` | Notification frequency and channels |
| Privacy | `/settings/privacy` | Profile visibility, messaging permissions |
| Blocked Users | `/settings/blocked` | Manage blocked/muted users |

Default route (`/settings`) redirects to Display.

### Signing Out

1. User opens avatar dropdown, clicks "Sign Out"
2. App fetches the Keycloak logout URL
3. Browser redirects to Keycloak logout endpoint
4. Session cookie cleared, user returned to the public home page

---

## Sports Supported

| Sport | Formats | Participation |
|-------|---------|---------------|
| Baseball | — | Team (max 25 per team, 2 teams) |
| Basketball | 5v5, 3v3 | Team |
| Football | Flag, American | Team |
| Tennis | Singles, Doubles | Individual |
| Pickleball | Singles, Doubles | Individual |

---

## Page Inventory

| Route | Auth Required | Purpose |
|-------|:---:|---------|
| `/` | No | Public: discover feed with hero. Authenticated: activity feed |
| `/search` | No | Search users by name |
| `/user/[username]` | No | User profile (public or private with follow gate) |
| `/game/[id]` | No* | Game detail (*private games redirect unauthenticated users) |
| `/resource/get-started` | No | Getting started guide |
| `/resource/about` | No | About page |
| `/resource/contact` | No | Contact page |
| `/resource/frequently-asked-questions` | No | FAQ page |
| `/game` | Yes | Create a new game |
| `/games` | Yes | My Games + Discover tabs |
| `/chat` | Yes | Direct messaging |
| `/settings/display` | Yes | Display preferences |
| `/settings/games` | Yes | Game preferences |
| `/settings/notifications` | Yes | Notification preferences |
| `/settings/privacy` | Yes | Privacy controls |
| `/settings/blocked` | Yes | Blocked users management |

---

## MVP Gaps

### Critical (blocks adoption)

| # | Gap | Impact | Notes |
|---|-----|--------|-------|
| 1 | **No onboarding after sign-up** | First-time user lands on an empty activity feed with zero games and zero follows. Dead end — no reason to come back. | Need a guided flow: set up profile picture/bio, find people to follow, create or discover a first game. The `/resource/get-started` page exists as static content but isn't wired into the post-signup experience. |
| 2 | **No push/email notifications** | Notifications only work while the app is open. Game invitations, upcoming games, and follow requests are invisible unless the user is on the site. | At minimum: email for game invitations and upcoming game reminders. Web push (service worker) for real-time alerts when the tab is closed. |
| 3 | **No game reminders** | A game is scheduled for Saturday but nothing nudges participants the day before or an hour before. Users forget and don't show up. | Configurable reminders (e.g., 24h and 1h before start) via email or push. Organizer should see RSVP/confirmation status. |

### High Value (significantly limits retention)

| # | Gap | Impact | Notes |
|---|-----|--------|-------|
| 4 | **No recurring games** | Recreational players play weekly. Every game is a one-off — users must manually recreate the same game each week. | Support "repeats every [week/2 weeks/month]" on game creation. Auto-create next occurrence when the current one ends. Carry over participants. |
| 5 | **No aggregate stats / career view** | Per-game box scores exist but there's no career totals, averages, or trends on the user profile. This is the long-term hook that keeps users logging stats. | Profile should show career stats per sport: games played, averages, highs. Stretch: compare with friends, leaderboards. |
| 6 | **No RSVP / attendance confirmation** | Users can join a game, but there's no "going / maybe / not going" status. Organizer can't tell how many people will actually show up. | Add RSVP status to game participants. Show count on game card (e.g., "8 going, 2 maybe"). |
| 7 | **No social sharing** | Can't share a game result or invite link outside the app. This is the primary organic growth vector for a social sports app. | Share game as a link (public games already have URLs). Generate shareable image/card for completed game results. Deep-link invitations for non-users. |

### Nice to Have

| # | Gap | Impact | Notes |
|---|-----|--------|-------|
| 8 | **No geolocation auto-detect** | Discover feed supports location filtering, but users must manually provide coordinates. Adds friction to "games near me." | Use browser Geolocation API to auto-populate location on discover feed. Fall back to manual entry. |
| 9 | **No i18n beyond English** | Translation infrastructure (`next-intl`) is in place but only `en.json` exists. | Not blocking for English-speaking markets, but limits international reach. |

### Backend-Supported but Not Yet in Frontend

These features have GraphQL schema support but no frontend implementation:

| # | Feature | Schema Evidence | Notes |
|---|---------|-----------------|-------|
| 11 | **Livestreaming** | `addGameMediaLink` supports livestream type | Backend supports attaching livestreams to games. No dedicated livestream UI (start/stop/embed) exists. |
| 12 | **Game result finalization** | `resultsFinalized` field queried on game detail | Backend has `finalizeGameResults`/`unfinalizeGameResults` mutations. The field is read but it's unclear if organizer-facing lock/unlock buttons are exposed. |
| 13 | **Stat entry mode** | `StatEntryMode` enum: `OPEN` vs `SELF_REPORT` | Controls whether anyone or only participants can enter stats. May not be exposed in the create/update game forms. |
