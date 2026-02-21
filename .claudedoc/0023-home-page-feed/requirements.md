# Home Page Activity Feed — Requirements

## Overview

Build an authenticated home page that displays a Strava-like activity feed showing games that the current user and their friends participate in. The feed uses the `friendsActivityFeed` GraphQL query and displays rich cards with friend context, scores, and location.

## Scope

- **In scope**: Authenticated home page with activity feed, feed card component, infinite scroll pagination, empty state
- **Out of scope**: Unauthenticated home page (keep current stub), feed filtering, media thumbnails on cards, real-time updates via WebSocket

## Pages

### Home Page (`src/app/[locale]/page.tsx`)

**Authenticated view**:
- Page title: "Activity Feed" (or i18n equivalent) with a "Create Game" CTA button aligned right (same pattern as the games page header)
- Below the header: a single-column feed of activity cards, centered with a max-width container
- Infinite scroll with 10 items loaded initially, auto-loading more on scroll
- Loading state: `loading.tsx` with skeleton cards
- Error state: inline error card with retry link (same pattern as games page)
- Empty state: generic "No activity yet" message using the existing `Empty` component

**Unauthenticated view**: No changes — keep the current stub (`ComponentExample`).

**Auth branching**: The page should check for a session server-side. If authenticated, render the feed. If not, render the current stub.

## Feed Card Component

A new component for rendering activity feed items. Each card represents a game and emphasizes the social/friends context.

### Card Content (top to bottom)

1. **Friends context** (top of card):
   - Stacked profile picture avatars of friends who played in this game (from `viewerFriendPlayers.nodes[].user.profilePicture`)
   - Text summary: "{name1}, {name2}, and {N} others played {sportType}" using `viewerFriendPlayers.nodes` and `totalCount`
   - If only 1 friend: "{name} played {sportType}"
   - If 2 friends: "{name1} and {name2} played {sportType}"
   - If 3+ friends: "{name1}, {name2}, and {totalCount - 2} others played {sportType}"
   - If 0 friends (current user's own game with no friends): fall back to "You played {sportType}" or similar

2. **Sport info**:
   - Sport icon (from existing `getSportIconPath`)
   - Sport subtype badge (e.g., "5v5", "Singles")
   - Game status badge (Scheduled/In Progress/Complete)

3. **Participants & Score**:
   - Participant names (teams or individuals) — same logic as existing `GameCard`
   - Score display using existing `GameScore` component (for completed/in-progress games)

4. **Date & Location**:
   - Date formatted with `useFormatter` (same as existing game cards)
   - Location name/city if available (`game.location.name` or `game.location.address.city`)

5. **Click behavior**: Entire card links to `/game/{id}` (same as existing `GameCard`)

### Layout

- Single-column layout, centered, max-width (e.g., `max-w-2xl mx-auto`)
- Cards should be visually distinct from the existing `GameCard` — more like a social feed post than a grid card

## Data Requirements

### GraphQL Query: `friendsActivityFeed`

```graphql
friendsActivityFeed(first: 10, after: $cursor) {
  edges {
    cursor
    node {
      id
      startDate
      endDate
      sportType
      gameStatus
      metadata { ...gameMetadataFragment }
      location {
        name
        address { city state }
      }
      participants(first: 10) {
        edges {
          node { ...participantNodeFragment }
        }
      }
      viewerFriendPlayers {
        nodes {
          id
          firstName
          lastName
          user {
            id
            displayName
            profilePicture {
              ...resourceFragment (thumbnailUrl needed)
            }
          }
        }
        totalCount
      }
    }
  }
  pageInfo {
    hasNextPage
    endCursor
  }
}
```

### Schema Assumptions

- `Player` type will have a `user: User` field added by the backend (not yet in schema.graphqls)
- `User.profilePicture` already exists and returns a `Resource` with `thumbnailUrl` on `ImageResource`

### New Types Needed

- `FeedGameNode` — extends `GameNode` with `location` and `viewerFriendPlayers` fields
- `ViewerFriendPlayers` type with `nodes: FeedPlayerNode[]` and `totalCount: number`
- `FeedPlayerNode` — Player with nested `user` containing `displayName` and `profilePicture`

## Server Actions

- `loadFeedGames(first: number, after?: string)` — fetches `friendsActivityFeed` with auth, returns edges + pageInfo
- Used by both the initial server-side fetch (in the page component) and the client-side infinite scroll

## i18n

New translation keys under a `feed` namespace in `messages/en.json`:

- `feed.title` — "Activity Feed"
- `feed.empty.title` — "No activity yet"
- `feed.empty.description` — "When you and your friends play games, they'll show up here."
- `feed.played` — "played" (for "{name} played Basketball")
- `feed.and` — "and"
- `feed.others` — "others" (for "and 3 others")
- `feed.youPlayed` — "You played" (fallback when no friends in game)
- `feed.endOfFeed` — "You're all caught up!"

## File Structure

```
src/
  app/[locale]/
    page.tsx                    — Updated: auth branch, feed for authenticated users
    loading.tsx                 — New: skeleton loading state for home page
    feed/
      actions.ts                — New: loadFeedGames server action
  components/
    feed/
      activity-feed.tsx         — New: infinite scroll feed (client component)
      activity-feed-card.tsx    — New: individual feed card (client component)
      friend-avatars.tsx        — New: stacked avatar display (client component)
  lib/
    types/
      feed.ts                   — New: FeedGameNode, ViewerFriendPlayers, FeedPlayerNode types
```

## Non-Functional Requirements

- Feed should load fast — initial 10 items server-rendered
- Cards should be responsive (work well on mobile through desktop)
- Follow existing codebase conventions: Server Components by default, client components only for interactivity, all text through i18n, all text wrapped in Typography components
