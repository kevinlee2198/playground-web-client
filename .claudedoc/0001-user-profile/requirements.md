# User Profile Page - Requirements

## Overview

This document defines the requirements for the User Profile Page feature. This feature enables users to view public profiles of other users/players, including their activity history, player statistics, and friendship status. The friend system is fully integrated with this feature.

## Architecture Decision: User Type Hierarchy

### Current Schema Analysis

The GraphQL schema defines two user types:

- **User**: For viewing other users (public profiles)
  - Implements: `Node`
  - Fields: `id`, `firstName`, `lastName`, `player`, `friendship`
  - The `friendship` field shows the relationship between the current authenticated user and this user
  - Query: `user(id: ID!)` returns `User`

- **CurrentUser**: For the authenticated user's own data (includes private fields)
  - Implements: `Node`
  - Fields: `id`, `firstName`, `lastName`, `email`, `player`
  - Query: `me` returns `CurrentUser!`

- **Player**: Represents a participant in games (ID is a Long)
  - Fields: `id`, `firstName`, `lastName`, `age`, `height`, `weight`, `biography`
  - Accessed via `User.player` field (nullable - user may not have a player profile yet)

### Decision

**Create a unified profile page at `/user/[userId]` that displays User information with nested Player data.**

Rationale:
1. Users interact with other users socially (friendships use User IDs)
2. Players represent the same person in a gaming/sports context
3. The friend system operates on User IDs
4. Profile URLs should be shareable and stable (User ID from auth is more stable)
5. The `user(id)` query returns `User` which includes the `friendship` field for relationship status

The page should:
- Accept a User ID in the URL
- Display User information (name)
- If the User has an associated Player, display Player details and game history
- Handle cases where a User exists but has no Player record
- Show appropriate friend actions based on friendship status

---

## Functional Requirements

### FR-1: Profile Page Display

**FR-1.1**: The profile page shall be accessible at route `/[locale]/user/[id]` where `id` is the User ID.

**FR-1.2**: The page shall display the following User information:
- Full name (firstName + lastName)
- Profile picture placeholder (avatar with initials until profile pictures are implemented)

**FR-1.3**: If the User has associated Player data, the page shall display:
- Player physical attributes (age, height, weight) when available
- Player biography when available

**FR-1.4**: The page shall display the user's game history showing ALL previous activities (not limited to basketball).

### FR-2: Game History Section

**FR-2.1**: The game history shall be fetched using the `games` query with `playerId` filter.

**FR-2.2**: Each game entry shall display as a summary card:
- Sport type (Basketball, Football, Tennis)
- Sport subtype (e.g., FIVE_ON_FIVE, THREE_ON_THREE, SINGLES, DOUBLES, FLAG_FOOTBALL)
- For team games: team names
- Score display (future enhancement when available)

**FR-2.3**: Games shall be sorted by start date in descending order (most recent first).

**FR-2.4**: The game list shall support pagination (infinite scroll or "Load More" button).

**FR-2.5**: Each game card shall be clickable and redirect to the game detail page (`/game/[gameId]`).

**FR-2.6**: Game participants are fetched via the polymorphic `participants` field which returns `GameParticipantConnection`. Participants can be either:
- `TeamInstance` - for team-based games (contains `name`, `players` array)
- `IndividualParticipant` - for individual games like tennis singles (contains `player`)

### FR-3: Authentication and Authorization

**FR-3.1**: The profile page shall be publicly accessible (unauthenticated users CAN view profiles).

**FR-3.2**: Friend actions (Add Friend, Accept Request) shall require authentication.

**FR-3.3**: Authorization errors from the server shall be handled gracefully.

### FR-4: Error Handling

**FR-4.1**: If the User ID does not exist, the page shall display a 404 Not Found page.

**FR-4.2**: If the current user has been BLOCKED by the profile owner, the page shall display a 404 Not Found page (do not reveal the block).

**FR-4.3**: If the Player data fails to load but User exists, the page shall display User info with a message indicating player data is unavailable.

**FR-4.4**: Network errors shall display an appropriate error message with retry option.

### FR-5: Friend Functionality

**FR-5.1**: The profile page shall display friend-related actions based on the `friendship` field from `User`.

**FR-5.2**: Friend action states (when viewing another user's profile while authenticated):

| Friendship State | UI Display |
|-----------------|------------|
| No friendship (null) | Show "Add Friend" button |
| PENDING + current user is requester | Show "Friend Request Pending" status (disabled state) |
| PENDING + current user is addressee | Show "Accept Friend Request" button |
| ACCEPTED | Show "Friends" status indicator |
| BLOCKED (by profile owner) | Show 404 Not Found page |
| DECLINED | Show "Add Friend" button (can re-request) |

**FR-5.3**: The "Add Friend" button shall call the `sendFriendRequest(input: SendFriendRequestInput!)` mutation.

**FR-5.4**: The "Accept Friend Request" button shall call the `acceptFriendRequest(input: AcceptFriendRequestInput!)` mutation.

**FR-5.5**: For unauthenticated users viewing a profile, hide all friend action buttons.

**FR-5.6**: For authenticated users viewing their own profile, display an "Edit Profile" button placeholder instead of friend actions.

**FR-5.7**: Friend count and mutual friends shall NOT be displayed (deferred to future enhancement).

### FR-6: Chat Integration

**FR-6.1**: Display a "Message" button on profiles for authenticated users viewing another user's profile.

**FR-6.2**: The "Message" button shall only be enabled when the users are friends (friendship status is ACCEPTED).

**FR-6.3**: If not friends, the "Message" button shall be disabled with a tooltip: "You must be friends to send messages".

**FR-6.4**: Display of existing chat rooms shall NOT be implemented (deferred to future enhancement).

### FR-7: Features Explicitly Excluded

**FR-7.1**: NO livestream status display on profiles.

**FR-7.2**: NO friend count or mutual friends display.

**FR-7.3**: NO chat room list display.

---

## UI/UX Requirements

### UX-1: Layout and Design

**UX-1.1**: Follow ESPN player profile design as inspiration (https://www.espn.com/nba/player/_/id/4065648/jayson-tatum).

**UX-1.2**: Profile header section containing:
- Large avatar (placeholder with initials, centered or left-aligned)
- User's full name (prominent heading)
- Player bio excerpt (if available)
- Action buttons (Add Friend / Accept Request / Friends status / Edit Profile)
- Message button (enabled only for friends)

**UX-1.3**: Stats/Info section (when Player data exists):
- Display physical attributes in a card or grid layout
- Age, Height (formatted with units), Weight (formatted with units)

**UX-1.4**: Activity/Games section:
- Tab or section header: "Game History" or "Recent Activity"
- Card layout for games (clickable to navigate to game detail)
- Visual indicators for sport type (icons or badges)
- Display sport subtype (e.g., "5v5", "3v3", "Singles", "Doubles")
- For team games: show team names

**UX-1.5**: Responsive design:
- Desktop: Multi-column layout (profile info + stats side by side, games below)
- Mobile: Single column, stacked layout

### UX-2: Navbar Avatar Dropdown

**UX-2.1**: Replace the current "Sign Out" button with an Avatar component when user is authenticated.

**UX-2.2**: The Avatar shall display:
- User's initials as fallback
- Profile picture when available (future)

**UX-2.3**: Hovering/clicking the Avatar shall reveal a dropdown menu with:
- "View Profile" - navigates to current user's profile page
- "Settings" - navigates to account settings page (future feature, link to `/settings`)
- "Sign Out" - triggers sign out flow

**UX-2.4**: The dropdown shall use shadcn/ui DropdownMenu component.

**UX-2.5**: For unauthenticated users, continue showing "Sign Up" and "Sign In" buttons.

### UX-3: Loading States

**UX-3.1**: Display skeleton loaders while fetching User/Player data.

**UX-3.2**: Display skeleton loaders for game history section.

**UX-3.3**: Show loading indicator when loading more games (pagination).

**UX-3.4**: Show loading state on friend action buttons while mutations are in progress.

### UX-4: Empty States

**UX-4.1**: If user has no game history, display friendly message: "No games played yet"

**UX-4.2**: If player data is not available, gracefully hide the stats section rather than showing empty fields.

### UX-5: Friend Action Feedback

**UX-5.1**: After clicking "Add Friend", button should update to show "Friend Request Pending" state.

**UX-5.2**: After clicking "Accept Friend Request", button should update to show "Friends" status.

**UX-5.3**: Display toast notifications for successful friend actions.

**UX-5.4**: Display error toast if friend action fails.

---

## Technical Requirements

### TR-0: Backend Technology

**TR-0.1**: The backend uses **Spring Boot GraphQL** (not Netflix DGS). Error handling may resemble DGS patterns but the underlying framework is Spring Boot GraphQL.

### TR-1: Data Fetching

**TR-1.1**: Use server components for initial data fetch (User with nested Player, friendship status, initial games).

**TR-1.2**: Use the existing GraphQL client (`query` for public data, `authQuery` for authenticated requests to get friendship data).

**TR-1.3**: GraphQL queries required:

```graphql
# Fetch user by ID with nested player data and friendship status
# Returns User type which includes friendship field
query {
  user(id: "...") {
    id
    firstName
    lastName
    player {
      id
      firstName
      lastName
      age
      height
      weight
      biography
    }
    friendship {
      id
      status
      requester {
        id
      }
      addressee {
        id
      }
      createdDate
    }
  }
}

# Fetch games for player with polymorphic participants
query {
  games(input: { playerId: "..." }, sort: [{ field: START_DATE, direction: DESC }], first: 10) {
    edges {
      node {
        id
        startDate
        endDate
        sportType
        sportSubtype
        gameStatus
        participants(first: 10) {
          edges {
            node {
              __typename
              ... on TeamInstance {
                id
                name
                players {
                  id
                  firstName
                  lastName
                }
              }
              ... on IndividualParticipant {
                id
                player {
                  id
                  firstName
                  lastName
                }
              }
            }
          }
        }
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

**TR-1.4**: GraphQL mutations required:

```graphql
# Send friend request
mutation {
  sendFriendRequest(input: { userId: "..." }) {
    friendship {
      id
      status
      requester { id }
      addressee { id }
    }
  }
}

# Accept friend request
mutation {
  acceptFriendRequest(input: { requesterId: "..." }) {
    friendship {
      id
      status
    }
  }
}
```

**TR-1.5**: Implement client-side pagination for game history using cursor-based pagination.

**TR-1.6**: When checking for BLOCKED status, if `friendship.status === 'BLOCKED'` and the current user is the addressee (meaning they were blocked), render 404.

### TR-2: Component Structure

**TR-2.1**: Create the following components:
- `src/app/[locale]/user/[id]/page.tsx` - Main profile page (server component)
- `src/components/profile/profile-header.tsx` - Profile header with avatar, name, actions
- `src/components/profile/player-stats.tsx` - Player statistics display
- `src/components/profile/game-history.tsx` - Game history list (client component for pagination)
- `src/components/profile/game-card.tsx` - Individual game entry (clickable)
- `src/components/profile/friend-actions.tsx` - Friend action buttons (client component for mutations)
- `src/components/playground/user-avatar-menu.tsx` - Navbar avatar dropdown (client component)

**TR-2.2**: Update `src/components/auth/auth-button.tsx` to use the new avatar menu when authenticated.

### TR-3: shadcn/ui Components Required

**TR-3.1**: Add the following shadcn/ui components:
- `Avatar` - For profile picture display
- `DropdownMenu` - For navbar avatar menu
- `Card` - For game entries and stats display
- `Badge` - For sport type and status indicators
- `Skeleton` - For loading states
- `Button` - For friend actions
- `Tooltip` - For disabled Message button explanation

### TR-4: 404 Handling

**TR-4.1**: Use Next.js `notFound()` function when user is not found.

**TR-4.2**: Use Next.js `notFound()` function when user has blocked the current user.

**TR-4.3**: Create or use existing not-found page at `src/app/[locale]/user/[id]/not-found.tsx` or global not-found.

### TR-5: Type Handling for User Types

**TR-5.1**: The `user(id)` query returns `User` type specifically.

**TR-5.2**: When querying for the current user's own profile, use `me` query which returns `CurrentUser` type (includes email).

**TR-5.3**: The frontend should handle the polymorphic `GameParticipant` interface using `__typename` discriminator:
- `TeamInstance` for team-based games
- `IndividualParticipant` for individual games

---

## Internationalization (i18n)

### i18n-1: Translation Keys Required

Add the following keys to `messages/en.json`:

```json
{
  "profile": {
    "title": "Profile",
    "viewProfile": "View Profile",
    "settings": "Settings",
    "editProfile": "Edit Profile",
    "message": "Message",
    "messageFriendsOnly": "You must be friends to send messages",
    "stats": {
      "title": "Player Stats",
      "age": "Age",
      "height": "Height",
      "weight": "Weight",
      "years": "years",
      "biography": "Biography"
    },
    "games": {
      "title": "Game History",
      "noGames": "No games played yet",
      "loadMore": "Load More",
      "vs": "vs",
      "status": {
        "scheduled": "Scheduled",
        "inProgress": "In Progress",
        "complete": "Complete"
      }
    },
    "friends": {
      "addFriend": "Add Friend",
      "pending": "Friend Request Pending",
      "acceptRequest": "Accept Friend Request",
      "friends": "Friends",
      "requestSent": "Friend request sent",
      "requestAccepted": "Friend request accepted",
      "error": "Failed to process friend request"
    },
    "errors": {
      "notFound": "User not found",
      "playerDataUnavailable": "Player information unavailable",
      "loadError": "Failed to load profile"
    }
  },
  "sports": {
    "basketball": "Basketball",
    "football": "Football",
    "tennis": "Tennis"
  },
  "sportSubtypes": {
    "FIVE_ON_FIVE": "5v5",
    "THREE_ON_THREE": "3v3",
    "FLAG_FOOTBALL": "Flag Football",
    "AMERICAN_FOOTBALL": "American Football",
    "SINGLES": "Singles",
    "DOUBLES": "Doubles"
  }
}
```

---

## Security Considerations

### SEC-1: Data Exposure

**SEC-1.1**: Email addresses should NOT be displayed on public profiles (privacy concern). Only `CurrentUser` type has email, and that is for the user viewing their own data.

**SEC-1.2**: Only display publicly appropriate information (name, player stats, game history).

**SEC-1.3**: Server handles authorization - client should gracefully handle 401/403 responses.

**SEC-1.4**: When a user is blocked, display 404 to not reveal the block action to the blocked user.

---

## Future Extensibility

### FE-1: Planned Enhancements

The design should accommodate future additions:

**FE-1.1**: Profile pictures - Avatar component should support image URLs when backend supports it.

**FE-1.2**: Unfriend functionality - Add ability to unfriend using `unfriend(input: UnfriendRequestInput!)` mutation.

**FE-1.3**: Activity feed - Structure allows adding a more detailed activity stream.

**FE-1.4**: Statistics dashboard - Player stats section can expand to show career averages, charts.

**FE-1.5**: Edit profile functionality - Edit Profile button will link to profile editing page.

**FE-1.6**: Friend list display - Show friend count and mutual friends on profile.

**FE-1.7**: Account Settings page (`/settings`) - Separate page for private account configuration:
- Notification preferences (enable/disable notifications)
- Privacy settings
- Email preferences
- Connected accounts
- Security settings (password, 2FA)
- Account deletion
This is distinct from the public profile page and should be implemented as a separate feature.

**FE-1.8**: Chat integration - When clicking "Message" button, navigate to or create a chat room with the friend.

**FE-1.9**: Game scores - Display scores for completed games when score data is available.

**FE-1.10**: Block user functionality - Add ability to block users using friendship system.

---

## Acceptance Criteria

1. User can navigate to `/en/user/{userId}` and see a profile page
2. Profile displays user's full name with avatar placeholder
3. If player data exists, physical attributes and biography are shown
4. Game history section shows past games with sport type, subtype, and team names for team games
5. Game cards are clickable and navigate to game detail page
6. Pagination works for game history (Load More or infinite scroll)
7. 404 page displays when user ID does not exist
8. 404 page displays when viewing user has been blocked by profile owner
9. Navbar shows avatar dropdown for authenticated users with "View Profile" and "Sign Out" options
10. All user-facing text uses i18n translation keys
11. Page is responsive (works on mobile and desktop)
12. Page works for unauthenticated visitors (public profiles, no friend actions)
13. Authenticated users see appropriate friend action based on relationship status
14. "Add Friend" button successfully sends friend request and updates UI
15. "Accept Friend Request" button successfully accepts request and updates UI
16. "Message" button is disabled for non-friends with appropriate tooltip

---

## Dependencies

- shadcn/ui components: Avatar, DropdownMenu, Card, Badge, Skeleton, Button, Tooltip
- Existing GraphQL client infrastructure
- Existing i18n infrastructure (next-intl)

---

## Open Questions

1. **Profile picture storage**: When profile pictures are added, what will be the URL format/storage mechanism?

2. **Chat room creation**: When "Message" button is clicked for friends, should it create a new chat room or navigate to existing one if it exists?

3. **Decline friend request**: Should there be UI to decline incoming friend requests from the profile page, or only accept?
