# Game CRUD - Requirements

## Overview

This document defines the requirements for the Game CRUD feature, which allows authenticated users with a player profile to create, view, update, delete, start, and end games. The feature also includes managing game participants (teams and individuals) and viewing basketball box scores.

---

## Background and Context

### Problem Statement

Users need a way to organize and manage sport games. Without this feature, users cannot:
- Schedule games for basketball, football, or tennis
- Add teams or individual participants to games
- Track game status (scheduled, in-progress, complete)
- View box scores for completed basketball games
- Browse and discover upcoming or ongoing games

### Key Relationships (from GraphQL Schema)

- `Game` has a `sportType` (BASKETBALL, FOOTBALL, TENNIS) and a `sportSubtype` (e.g., FIVE_ON_FIVE, SINGLES)
- `Game.participants` returns a `GameParticipantConnection` -- participants are either `TeamInstance` or `IndividualParticipant`
- `TeamInstance` contains a list of `Player` references and flexible `attributes` (JSON)
- `IndividualParticipant` contains a single `Player` reference
- `BasketballBoxScore` links a `Player` to a `Game` with basketball-specific statistics
- `Game.gameStatus` transitions: SCHEDULED -> IN_PROGRESS -> COMPLETE
- The `CreateGameInput` uses `@oneOf` with sport-specific inputs (basketball, football, tennis)
- Participant type must match the game's sport subtype (team sports use `TeamInstance`, individual sports use `IndividualParticipant`)

### Sport Subtype to Participant Type Mapping

| Sport | Subtype | Participant Type |
|-------|---------|-----------------|
| Basketball | FIVE_ON_FIVE | TeamInstance |
| Basketball | THREE_ON_THREE | TeamInstance |
| Football | FLAG_FOOTBALL | TeamInstance |
| Football | AMERICAN_FOOTBALL | TeamInstance |
| Tennis | SINGLES | IndividualParticipant |
| Tennis | DOUBLES | TeamInstance |

### Team Size Guidelines

Teams may include bench players in addition to starters. Recommended maximum team sizes:

| Sport | Subtype | Max Team Size | Notes |
|-------|---------|---------------|-------|
| Basketball | FIVE_ON_FIVE | 15 | 5 starters + 10 bench |
| Basketball | THREE_ON_THREE | 6 | 3 starters + 3 bench |
| Football | FLAG_FOOTBALL | 15 | Typical flag football roster |
| Football | AMERICAN_FOOTBALL | 53 | NFL-style roster (can adjust for casual) |
| Tennis | DOUBLES | 2 | Doubles pair |

*Note: These are UI guidelines. Server-side validation may differ.*

### Relevant GraphQL Operations

**Queries:**
```graphql
game(id: ID!): Game                           # Get a single game
games(                                         # List/filter games
  input: GameFilterInput!
  sort: [GameSortInput!]
  first: Int, after: String, last: Int, before: String
): GameConnection!
basketballBoxScores(                           # Basketball box scores
  input: GameIdsAndPlayerIdsInput!
  sort: [BoxScoreSortInput!]
  first: Int, after: String, last: Int, before: String
): BasketballBoxScoreConnection!
currentPlayer: Player                          # Needed to check player profile
```

**Mutations:**
```graphql
createGame(input: CreateGameInput!): CreateGameResponse!
updateGame(input: UpdateGameInput!): UpdateGameResponse!
deleteGame(input: DeleteGameInput!): DeleteGameResponse!
startGame(input: StartGameInput!): StartGameResponse!
endGame(input: EndGameInput!): EndGameResponse!
addGameParticipant(input: AddGameParticipantInput!): AddGameParticipantResponse!
addGameParticipants(input: AddGameParticipantsInput!): AddGameParticipantsResponse!
updateGameParticipant(input: UpdateGameParticipantInput!): UpdateGameParticipantResponse!
removeGameParticipant(input: RemoveGameParticipantInput!): RemoveGameParticipantResponse!
removeGameParticipants(input: RemoveGameParticipantsInput!): RemoveGameParticipantsResponse!
saveBasketballBoxScore(input: SaveBasketballBoxScoreInput!): SaveBasketballBoxScoreResponse!
saveBasketballBoxScores(input: SaveBasketballBoxScoresInput!): SaveBasketballBoxScoresResponse!
```

**Key Input Types:**
```graphql
input CreateGameInput @oneOf {
  basketball: CreateBasketballGameInput
  football: CreateFootballGameInput
  tennis: CreateTennisGameInput
}

input CreateBasketballGameInput {
  startDate: DateTime!
  subtype: BasketballSubtype!     # FIVE_ON_FIVE | THREE_ON_THREE
}

input CreateFootballGameInput {
  startDate: DateTime!
  subtype: FootballSubtype!       # FLAG_FOOTBALL | AMERICAN_FOOTBALL
}

input CreateTennisGameInput {
  startDate: DateTime!
  subtype: TennisSubtype!         # SINGLES | DOUBLES
}

input UpdateGameInput {
  id: ID!
  startDate: DateTime             # Only field currently updatable
}

input GameFilterInput {
  startAfter: DateTime
  startBefore: DateTime
  endAfter: DateTime
  endBefore: DateTime
  sportType: SportType
  playerId: ID
  gameStatus: GameStatus
  createdBy: ID                     # Filter games by creator (for "My Games")
}

input GameSortInput {
  field: GameSortField!           # START_DATE | END_DATE | GAME_STATUS
  direction: SortDirection = ASC  # ASC | DESC
}

input StartGameInput {
  id: ID!
  startDate: DateTime             # Defaults to current time if not provided
}

input EndGameInput {
  id: ID!
  endDate: DateTime               # Defaults to current time if not provided
}
```

---

## Functional Requirements

### FR-1: Game List Page

**FR-1.1**: The game list page shall be accessible at route `/[locale]/games`.

**FR-1.2**: The page shall be accessible via a navbar link labeled "Games" (visible to authenticated users with a player profile).

**FR-1.3**: The page shall require authentication and a player profile. Users without a player profile shall see the player-required modal (from the existing player feature).

**FR-1.4**: The page shall display a list of games with the following information per game card:
| Field | Display | Notes |
|-------|---------|-------|
| sportType | Sport name | e.g., "Basketball" |
| sportSubtype | Subtype label | e.g., "5v5", "Singles" |
| startDate | Formatted date/time | In user's local timezone |
| gameStatus | Status badge | Color-coded: SCHEDULED (default), IN_PROGRESS (active), COMPLETE (muted) |
| participants | Participant summary | e.g., team names or participant count |

**FR-1.5**: Each game card shall be clickable, navigating to the game detail page at `/[locale]/game/[id]`.

### FR-2: Game List Filtering

**FR-2.1**: The game list shall support the following filters:
| Filter | UI Component | GraphQL Field |
|--------|-------------|---------------|
| Start date range | Date range picker | `startAfter`, `startBefore` |
| End date range | Date range picker | `endAfter`, `endBefore` |
| Sport type | Select/dropdown | `sportType` |
| Player | Player search/select | `playerId` |
| Game status | Select/dropdown or toggle group | `gameStatus` |

**FR-2.2**: All filters are optional. When no filters are applied, all games shall be returned.

**FR-2.3**: Filters shall be AND-ed together (matching GraphQL behavior).

**FR-2.4**: Filters shall be applied via URL query parameters so that filtered views are shareable/bookmarkable.

### FR-3: Game List Sorting

**FR-3.1**: The game list shall support sorting by:
| Sort Option | GraphQL Field |
|-------------|---------------|
| Start Date | START_DATE |
| Game Status | GAME_STATUS |

**FR-3.2**: Each sort option shall support ascending and descending direction.

**FR-3.3**: Default sort shall be Start Date descending (most recent first).

### FR-4: Game List Pagination

**FR-4.1**: The game list shall use infinite scroll pagination.

**FR-4.2**: Each page shall fetch a reasonable number of games (e.g., 20).

**FR-4.3**: When the user scrolls near the bottom of the list, the next page shall be automatically fetched and appended.

**FR-4.4**: A loading indicator shall be displayed while the next page is being fetched.

**FR-4.5**: When all games have been loaded (`pageInfo.hasNextPage` is false), no further fetches shall occur. An end-of-list indicator may be shown.

### FR-5: My Games View

**FR-5.1**: The game list page shall include a "My Games" toggle or tab that filters the list to games created by the current logged-in user.

**FR-5.2**: "My Games" is distinct from the user profile page at `/[locale]/user/[id]` -- it specifically shows games the current user owns/created.

**FR-5.3**: The "My Games" filter can be combined with other filters (FR-2).

**FR-5.4**: The `GameFilterInput` exposes a `createdBy` filter for server-side "My Games" filtering. The frontend will pass the current user's ID to this filter.

### FR-6: Game Detail Page

**FR-6.1**: The game detail page shall be accessible at route `/[locale]/game/[id]`.

**FR-6.2**: The page shall require authentication and a player profile.

**FR-6.3**: The page shall display the following game information:

| Section | Fields | Notes |
|---------|--------|-------|
| Header | Sport type, subtype, status badge | Prominent display |
| Schedule | Start date, end date (if applicable) | Formatted in user's local timezone |
| Participants | List of teams or individuals | Paginated if large number; see FR-7 |
| Box Scores | Basketball statistics table | Only for basketball games; see FR-10 |

**FR-6.4**: If the game is not found (null response), display a "Game not found" error state.

### FR-7: Game Participants Display

**FR-7.1**: The participants section shall display differently based on participant type:

**Team-based games (TeamInstance):**
- Display each team as a card/section with:
  - Team name
  - Team description (if present)
  - List of players on the team (firstName, lastName)
  - Team attributes (if relevant)

**Individual-based games (IndividualParticipant):**
- Display a list of individual players (firstName, lastName)

**FR-7.2**: If the number of participants is large, use Relay cursor-based pagination on the `participants` connection field.

**FR-7.3**: Participant search is explicitly **not in scope** for this feature. It may come later.

### FR-8: Game Participant Management

**FR-8.1**: Any authenticated user with a player profile shall be able to add teams to team-based games using the `addGameParticipant` or `addGameParticipants` mutation. *(Note: Owner-only restriction may be added in a future iteration.)*

**FR-8.2**: Any authenticated user with a player profile shall be able to add individual participants to individual-based games.

**FR-8.3**: Any authenticated user with a player profile shall be able to remove teams or individual participants from a game.

**FR-8.4**: Any authenticated user with a player profile shall be able to update team instances (name, description, player roster, attributes).

**FR-8.5**: Any authenticated user with a player profile shall be able to add themselves to a game:
- For team-based games: join an existing team (add their player to a team's player list)
- For individual-based games: add themselves as an individual participant

**FR-8.6**: Any authenticated user with a player profile shall be able to remove themselves from a game.

**FR-8.7**: When adding a team, the following fields shall be available:
| Field | Required | Notes |
|-------|----------|-------|
| name | Yes | Team name |
| description | No | Team description |
| playerIds | No | Initial list of players on the team |
| attributes | No | Flexible JSON attributes |

### FR-9: Game CRUD Operations

#### FR-9.1: Create Game

**FR-9.1.1**: Authenticated users with a player profile shall be able to create a game from the game list page (e.g., "Create Game" button).

**FR-9.1.2**: The create game form shall be a single-page form with dynamic fields based on sport selection:
1. User selects a sport type (Basketball, Football, Tennis)
2. Subtype options update dynamically based on the selected sport
3. Start date/time picker

**FR-9.1.3**: The start date shall default to the current time in the user's local timezone.

**FR-9.1.4**: After successful creation, the user shall be redirected to the game detail page at `/[locale]/game/[id]`.

**FR-9.1.5**: The `CreateGameInput` uses `@oneOf`, so the mutation input must include exactly one sport-specific input object.

#### FR-9.2: Update Game

**FR-9.2.1**: Any authenticated user with a player profile shall be able to update a game. *(Note: Owner-only restriction will be added in a future iteration.)*

**FR-9.2.2**: Currently only `startDate` is updatable via `UpdateGameInput`. The sport type and subtype are not changeable after creation.

**FR-9.2.3**: The update form shall pre-populate with the current start date.

**FR-9.2.4**: The design should be flexible to accommodate additional updatable fields in the future.

#### FR-9.3: Delete Game

**FR-9.3.1**: Any authenticated user with a player profile shall be able to delete a game. *(Note: Owner-only restriction will be added in a future iteration.)*

**FR-9.3.2**: Deleting a game shall require a confirmation dialog before proceeding.

**FR-9.3.3**: The confirmation dialog shall clearly state the action is irreversible.

**FR-9.3.4**: After successful deletion, the user shall be redirected to the game list page at `/[locale]/games`.

#### FR-9.4: Start Game

**FR-9.4.1**: Any authenticated user with a player profile shall be able to start a game.

**FR-9.4.2**: The "Start Game" button shall be visible on the game detail page when the game status is SCHEDULED.

**FR-9.4.3**: Starting a game transitions its status from SCHEDULED to IN_PROGRESS.

**FR-9.4.4**: If `startDate` is not provided in the input, the server defaults to the current time.

**FR-9.4.5**: After starting, the page shall update to reflect the IN_PROGRESS status.

#### FR-9.5: End Game

**FR-9.5.1**: Any authenticated user with a player profile shall be able to end a game.

**FR-9.5.2**: The "End Game" button shall be visible on the game detail page when the game status is IN_PROGRESS.

**FR-9.5.3**: Ending a game transitions its status from IN_PROGRESS to COMPLETE.

**FR-9.5.4**: If `endDate` is not provided in the input, the server defaults to the current time.

**FR-9.5.5**: After ending, the page shall update to reflect the COMPLETE status and display the end date.

### FR-10: Basketball Box Scores

**FR-10.1**: For basketball games, the game detail page shall include a box scores section.

**FR-10.2**: Box scores shall be queryable via `basketballBoxScores` with `gameIds` filter.

**FR-10.3**: The box score table shall display the following fields:

| Field | Label | Notes |
|-------|-------|-------|
| player | Player | firstName + lastName |
| points | PTS | |
| assists | AST | |
| totalRebounds | REB | |
| offensiveRebounds | OREB | |
| defensiveRebounds | DREB | |
| steals | STL | |
| blocks | BLK | |
| turnovers | TO | |
| personalFouls | PF | |
| fieldGoalsMade / fieldGoalsAttempted | FG | Display as "made/attempted" |
| fieldGoalPercentage | FG% | |
| threePointersMade / threePointersAttempted | 3PT | Display as "made/attempted" |
| threePointerPercentage | 3PT% | |
| twoPointersMade / twoPointersAttempted | 2PT | Display as "made/attempted" |
| twoPointerPercentage | 2PT% | |
| freeThrowsMade / freeThrowsAttempted | FT | Display as "made/attempted" |
| freeThrowPercentage | FT% | |

**FR-10.4**: Box scores shall be sortable by: POINTS, ASSISTS, TOTAL_REBOUNDS, STEALS, BLOCKS (matching `BoxScoreSortField` enum).

**FR-10.5**: Any authenticated user with a player profile shall be able to save/edit box scores for participants in the game using `saveBasketballBoxScore` or `saveBasketballBoxScores`.

**FR-10.6**: Box score editing shall only be available for games that are IN_PROGRESS or COMPLETE.

**FR-10.7**: The box score feature shall be designed flexibly so that future sports (football, tennis) can have their own box score types added without major refactoring.

### FR-11: Error Handling

**FR-11.1**: Network errors during any game operation shall display an error message to the user.

**FR-11.2**: If the `game` query returns null, display a "Game not found" page.

**FR-11.3**: If the `games` query fails, display an error state with a retry option.

**FR-11.4**: Server-side validation errors (e.g., invalid state transitions) shall be displayed as toast notifications.

**FR-11.5**: Authorization errors (if any from server) shall be displayed as toast notifications. *(Note: Authorization is deferred to a future iteration, so these errors are not expected initially.)*

---

## UI/UX Requirements

### UX-1: Game List Layout

**UX-1.1**: The game list page shall follow the existing application layout with navbar and footer.

**UX-1.2**: The page shall include:
- Page title ("Games")
- Filter controls (collapsible panel or sidebar)
- Sort controls
- "My Games" toggle/tab
- "Create Game" button (prominent, e.g., top-right)
- Game cards in a list or grid layout

**UX-1.3**: Responsive design:
- Desktop: Multi-column grid or card list with sidebar filters
- Mobile: Single-column card list with filters in a collapsible drawer/sheet

**UX-1.4**: Game cards shall use a consistent card design with:
- Sport icon or color coding by sport type
- Status badge (color-coded)
- Key information visible at a glance (sport, subtype, date, status)

### UX-2: Game Detail Layout

**UX-2.1**: The game detail page shall use a structured layout:
- Header: Sport type, subtype, status badge, action buttons (Start/End/Edit/Delete)
- Schedule section: Start date, end date
- Participants section: Teams or individuals
- Box Scores section: Statistics table (basketball only)

**UX-2.2**: Edit, Delete, Start, and End action buttons shall be visible to all authenticated users with a player profile. *(Note: Owner-only visibility for Edit/Delete will be added in a future iteration when authorization is implemented.)*

**UX-2.3**: Status transitions shall be reflected immediately in the UI after mutation success.

**UX-2.4**: The delete confirmation dialog shall use shadcn/ui AlertDialog component.

### UX-3: Create Game Form

**UX-3.1**: The create game form shall be displayed in a dialog/modal or dedicated page.

**UX-3.2**: Form layout:
1. Sport type selection (radio group or card selection)
2. Sport subtype selection (updates dynamically based on sport)
3. Start date/time picker (defaults to current time)
4. Submit button

**UX-3.3**: Sport subtype options shall update immediately when sport type changes.

**UX-3.4**: The form shall display validation errors inline.

### UX-4: Participant Management

**UX-4.1**: For team-based games, provide UI to:
- Add a new team (form with name, description, optional players)
- Edit a team (inline or modal)
- Remove a team (with confirmation)
- Join a team (add current player to team roster)
- Leave a team (remove current player from team roster)

**UX-4.2**: For individual-based games, provide UI to:
- Join the game (add current player as individual participant)
- Leave the game (remove current player)
- Owner: remove other participants

**UX-4.3**: The "Join" / "Leave" action shall be prominent and easy to find.

### UX-5: Box Score UI

**UX-5.1**: Box scores shall be displayed in a responsive data table.

**UX-5.2**: On mobile, the table shall be horizontally scrollable.

**UX-5.3**: Column headers shall use abbreviated labels (PTS, AST, REB, etc.).

**UX-5.4**: The box score edit form shall allow editing all stat fields for each player. Consider an inline editing approach or a dedicated edit modal per player.

**UX-5.5**: Percentage fields (FG%, 3PT%, FT%) are computed by the server and shall be displayed read-only.

### UX-6: Loading States

**UX-6.1**: Display a skeleton loader for the game list while initial data loads.

**UX-6.2**: Display a skeleton loader for the game detail page while data loads.

**UX-6.3**: Display loading indicators on action buttons (Start, End, Save, Delete) during mutations.

**UX-6.4**: Display a loading spinner at the bottom of the game list during infinite scroll pagination.

**UX-6.5**: Disable buttons during pending mutations to prevent double submission.

### UX-7: Empty States

**UX-7.1**: When no games match the current filters, display an empty state with:
- Descriptive message (e.g., "No games found")
- Suggestion to adjust filters or create a new game

**UX-7.2**: When the game has no participants yet, display a prompt to add participants.

**UX-7.3**: When no box scores exist for a basketball game, display a prompt to add box scores.

---

## Technical Requirements

### TR-1: Data Fetching

**TR-1.1**: Use server components for initial data fetch on both the game list and game detail pages.

**TR-1.2**: Use `authQuery` from the GraphQL client for all game queries (authentication required).

**TR-1.3**: Use `authMutate` from the GraphQL client for all game mutations via server actions.

**TR-1.4**: Implement Relay-style cursor-based pagination for the game list (infinite scroll) and participants.

### TR-2: Component Structure

**TR-2.1**: Create the following components and pages:

| Component | Path | Type | Description |
|-----------|------|------|-------------|
| Games List Page | `src/app/[locale]/games/page.tsx` | Server | Game list page with filters |
| Games Loading | `src/app/[locale]/games/loading.tsx` | Server | Skeleton for game list |
| Game Detail Page | `src/app/[locale]/game/[id]/page.tsx` | Server | Game detail page |
| Game Detail Loading | `src/app/[locale]/game/[id]/loading.tsx` | Server | Skeleton for game detail |
| Game Actions | `src/app/[locale]/game/actions.ts` | Server Actions | Create, update, delete, start, end game mutations |
| Participant Actions | `src/app/[locale]/game/participant-actions.ts` | Server Actions | Add, update, remove participant mutations |
| Box Score Actions | `src/app/[locale]/game/box-score-actions.ts` | Server Actions | Save box score mutations |
| GameCard | `src/components/game/game-card.tsx` | Client | Card for game list items |
| GameListFilters | `src/components/game/game-list-filters.tsx` | Client | Filter controls |
| GameListSort | `src/components/game/game-list-sort.tsx` | Client | Sort controls |
| CreateGameForm | `src/components/game/create-game-form.tsx` | Client | Create game form |
| UpdateGameForm | `src/components/game/update-game-form.tsx` | Client | Update game form (start date) |
| GameDetailHeader | `src/components/game/game-detail-header.tsx` | Client | Header with status, actions |
| GameStatusBadge | `src/components/game/game-status-badge.tsx` | Client | Color-coded status badge |
| GameParticipants | `src/components/game/game-participants.tsx` | Client | Participants section |
| TeamCard | `src/components/game/team-card.tsx` | Client | Team display/edit card |
| AddTeamForm | `src/components/game/add-team-form.tsx` | Client | Form to add a team |
| IndividualParticipantList | `src/components/game/individual-participant-list.tsx` | Client | Individual participants list |
| BasketballBoxScoreTable | `src/components/game/basketball-box-score-table.tsx` | Client | Box score display table |
| BasketballBoxScoreForm | `src/components/game/basketball-box-score-form.tsx` | Client | Box score edit form |
| DeleteGameDialog | `src/components/game/delete-game-dialog.tsx` | Client | Delete confirmation dialog |
| GameInfiniteList | `src/components/game/game-infinite-list.tsx` | Client | Infinite scroll wrapper |

**TR-2.2**: Update the navbar component to include a "Games" link for authenticated users with a player profile.

### TR-3: Form Handling

**TR-3.1**: Use react-hook-form for form state management and validation in create/update game forms and box score forms.

**TR-3.2**: Use Zod for client-side schema validation.

**TR-3.3**: Create game form Zod schema:
```typescript
const createGameSchema = z.object({
  sportType: z.enum(["BASKETBALL", "FOOTBALL", "TENNIS"]),
  subtype: z.string().min(1),  // validated against sport-specific subtypes
  startDate: z.date(),
});
```

**TR-3.4**: The start date picker shall use a date-time picker component. Consider using an existing shadcn/ui-compatible date picker or a library like `date-fns` for formatting.

### TR-4: State Management

**TR-4.1**: Use React state and server actions for mutations (consistent with the player feature pattern).

**TR-4.2**: After successful mutations (create, update, delete, start, end), use `revalidatePath` to refresh server-side cached data.

**TR-4.3**: For infinite scroll, maintain a client-side accumulator of loaded game edges and the current `endCursor` for pagination.

### TR-5: Authentication and Authorization

**TR-5.1**: All game pages require authentication. Redirect unauthenticated users to sign-in.

**TR-5.2**: All game pages require a player profile. Users without one shall see the player-required modal.

**TR-5.3**: Authorization (owner-only actions) will be implemented in a future iteration. For this initial implementation, all authenticated users with a player profile can perform all game operations.

**TR-5.4**: The `GameFilterInput` exposes a `createdBy` filter which will be used for the "My Games" feature. The frontend will pass the current user's ID to filter games they created.

### TR-6: shadcn/ui Components Required

**TR-6.1**: Ensure the following shadcn/ui components are available (add if missing):
- `Card` - Game cards
- `Button` - Actions
- `Input` - Form fields
- `Select` - Sport type, subtype, sort options
- `Badge` - Status badges
- `Dialog` - Create/edit forms
- `AlertDialog` - Delete confirmation
- `Skeleton` - Loading states
- `Calendar` / Date picker - Start date selection
- `Table` - Box score display
- `Tabs` or `ToggleGroup` - My Games toggle, filter tabs
- `Sheet` - Mobile filter drawer
- `DropdownMenu` - Game actions menu on detail page
- `Popover` - Date picker container
- Form components (Form, FormField, FormItem, etc.)

### TR-7: Navbar Integration

**TR-7.1**: Add "Games" link to navbar, visible only to authenticated users with a player profile.

**TR-7.2**: Use the existing navbar patterns (NavbarAuthLinks client component).

---

## Internationalization (i18n)

### i18n-1: Translation Keys

Add the following keys to `messages/en.json` under a new `game` namespace:

```json
{
  "header": {
    "games": "Games"
  },
  "game": {
    "title": "Games",
    "myGames": "My Games",
    "allGames": "All Games",
    "createTitle": "Create Game",
    "editTitle": "Edit Game",
    "detailTitle": "Game Details",
    "notFound": "Game not found",
    "notFoundDescription": "The game you are looking for does not exist or has been removed.",
    "noGames": "No games found",
    "noGamesDescription": "Try adjusting your filters or create a new game.",
    "form": {
      "sportType": "Sport",
      "sportSubtype": "Format",
      "startDate": "Start Date",
      "selectSport": "Select a sport",
      "selectFormat": "Select a format"
    },
    "status": {
      "scheduled": "Scheduled",
      "inProgress": "In Progress",
      "complete": "Complete"
    },
    "actions": {
      "create": "Create Game",
      "edit": "Edit Game",
      "delete": "Delete Game",
      "start": "Start Game",
      "end": "End Game",
      "save": "Save",
      "cancel": "Cancel",
      "starting": "Starting...",
      "ending": "Ending...",
      "saving": "Saving...",
      "deleting": "Deleting..."
    },
    "deleteConfirmation": {
      "title": "Delete Game",
      "description": "Are you sure you want to delete this game? This action cannot be undone.",
      "confirm": "Delete",
      "cancel": "Cancel"
    },
    "participants": {
      "title": "Participants",
      "noParticipants": "No participants yet",
      "addTeam": "Add Team",
      "editTeam": "Edit Team",
      "removeTeam": "Remove Team",
      "joinTeam": "Join Team",
      "leaveTeam": "Leave Team",
      "joinGame": "Join Game",
      "leaveGame": "Leave Game",
      "removeParticipant": "Remove",
      "teamName": "Team Name",
      "teamDescription": "Team Description",
      "players": "Players",
      "noPlayers": "No players on this team"
    },
    "boxScore": {
      "title": "Box Scores",
      "noBoxScores": "No box scores recorded yet",
      "addBoxScores": "Add Box Scores",
      "editBoxScores": "Edit Box Scores",
      "saveBoxScores": "Save Box Scores",
      "basketball": {
        "points": "PTS",
        "assists": "AST",
        "totalRebounds": "REB",
        "offensiveRebounds": "OREB",
        "defensiveRebounds": "DREB",
        "steals": "STL",
        "blocks": "BLK",
        "turnovers": "TO",
        "personalFouls": "PF",
        "fieldGoals": "FG",
        "fieldGoalPercentage": "FG%",
        "threePointers": "3PT",
        "threePointerPercentage": "3PT%",
        "twoPointers": "2PT",
        "twoPointerPercentage": "2PT%",
        "freeThrows": "FT",
        "freeThrowPercentage": "FT%"
      }
    },
    "filters": {
      "title": "Filters",
      "startDateRange": "Start Date Range",
      "endDateRange": "End Date Range",
      "sportType": "Sport Type",
      "gameStatus": "Status",
      "player": "Player",
      "clearFilters": "Clear Filters",
      "from": "From",
      "to": "To",
      "allSports": "All Sports",
      "allStatuses": "All Statuses"
    },
    "sort": {
      "title": "Sort",
      "startDate": "Start Date",
      "gameStatus": "Status",
      "ascending": "Ascending",
      "descending": "Descending"
    },
    "validation": {
      "sportTypeRequired": "Sport type is required",
      "subtypeRequired": "Sport format is required",
      "startDateRequired": "Start date is required",
      "startDateFuture": "Start date should be in the future"
    },
    "success": {
      "created": "Game created successfully",
      "updated": "Game updated successfully",
      "deleted": "Game deleted successfully",
      "started": "Game started",
      "ended": "Game ended",
      "participantAdded": "Participant added",
      "participantRemoved": "Participant removed",
      "teamUpdated": "Team updated",
      "boxScoresSaved": "Box scores saved"
    },
    "errors": {
      "loadError": "Failed to load games",
      "createError": "Failed to create game",
      "updateError": "Failed to update game",
      "deleteError": "Failed to delete game",
      "startError": "Failed to start game",
      "endError": "Failed to end game",
      "participantError": "Failed to update participants",
      "boxScoreError": "Failed to save box scores",
      "retry": "Retry"
    }
  }
}
```

### i18n-2: Existing Keys to Reuse

The following existing translation keys shall be reused:
- `sports.BASKETBALL`, `sports.FOOTBALL`, `sports.TENNIS` - Sport type names
- `sportSubtypes.*` - Sport subtype labels
- `actions.create`, `actions.edit`, `actions.save`, `actions.cancel` - Common action labels
- `player.modal.*` - Player required modal

---

## Security Considerations

### SEC-1: Authentication

**SEC-1.1**: All game operations require authentication.

**SEC-1.2**: All game operations require an existing player profile.

### SEC-2: Authorization

**Note**: Fine-grained authorization (owner-only actions) will be implemented in a future iteration. For this initial implementation, authorization is simplified.

**SEC-2.1**: Any authenticated user with a player profile can perform all game operations:
- View any game
- Create, update, delete any game
- Start or end any game
- Add/remove participants from any game
- View and edit box scores for any game

**SEC-2.2**: Future authorization enhancements will restrict certain actions (update, delete) to the game owner. The UI should be designed with this in mind but does not need to implement owner checks for this iteration.

### SEC-3: Input Validation

**SEC-3.1**: Validate all inputs client-side for UX, but rely on server-side validation for security.

**SEC-3.2**: Date inputs shall be validated to ensure they are valid DateTime values.

---

## Acceptance Criteria

1. Authenticated users with a player profile can navigate to `/[locale]/games` via the navbar
2. The game list page displays games with sport type, subtype, start date, and status
3. Users can filter games by start date range, end date range, sport type, player, and game status
4. Users can sort games by start date and game status
5. The game list uses infinite scroll pagination
6. Users can toggle "My Games" to see only games they created
7. Clicking a game card navigates to `/[locale]/game/[id]`
8. The game detail page displays sport type, subtype, status, schedule, participants, and box scores (basketball)
9. Users can create a game by selecting sport type, subtype, and start date
10. The start date defaults to the current time in the user's local timezone
11. After creating a game, the user is redirected to the game detail page
12. Users can update the start date of a game
13. Users can delete a game with a confirmation dialog
14. After deleting a game, the user is redirected to the game list
15. Users can start a SCHEDULED game (transitions to IN_PROGRESS)
16. Users can end an IN_PROGRESS game (transitions to COMPLETE)
17. Users can add, edit, and remove teams (team-based games) or individual participants
18. Any user with a player profile can join/leave a game as a participant
19. Basketball games display a box score table with full statistics
20. Box scores can be sorted by points, assists, rebounds, steals, or blocks
21. Users can save/edit box scores for basketball games that are IN_PROGRESS or COMPLETE
22. Loading skeletons are displayed during initial data fetch
23. Loading indicators are displayed during mutations
24. Error messages are displayed when operations fail
25. All user-facing text uses i18n translation keys
26. Pages are responsive on desktop and mobile
27. Users without a player profile see the player-required modal when accessing game pages

---

## Scope Exclusions

**EX-1**: Livestream features are explicitly **not in scope**. The `Game.livestreams` connection field shall not be queried or displayed.

**EX-2**: Chat functionality for games is not in scope.

**EX-3**: Participant search within a game is not in scope (may come later).

**EX-4**: Box scores for football and tennis are not in scope. Only basketball box scores are implemented. The design should be flexible for future sport-specific box scores.

**EX-5**: Game location/venue is not in scope (not in the current schema).

---

## Open Questions

*All previously open questions have been resolved. See Resolved Decisions section.*

---

## Dependencies

- shadcn/ui components: Card, Button, Input, Select, Badge, Dialog, AlertDialog, Skeleton, Calendar, Table, Tabs/ToggleGroup, Sheet, DropdownMenu, Popover, Form components
- Existing GraphQL client infrastructure (`authQuery`, `authMutate`)
- Existing authentication infrastructure (Better Auth)
- Existing i18n infrastructure (next-intl)
- Existing player feature (player-required modal)
- Form library: react-hook-form
- Validation library: Zod
- Date library: date-fns or similar for date formatting and timezone handling

---

## Resolved Decisions

1. **URL structure**: Game list at `/[locale]/games`, game detail at `/[locale]/game/[id]`. *(See FR-1.1, FR-6.1)*

2. **Pagination style**: Infinite scroll for the game list. *(See FR-4)*

3. **Create form style**: Single form with dynamic sport-specific fields, not a multi-step wizard. *(See FR-9.1.2)*

4. **Default start date**: Current time in user's local timezone. *(See FR-9.1.3)*

5. **Post-create redirect**: Navigate to game detail page. *(See FR-9.1.4)*

6. **Delete confirmation**: Required via AlertDialog. *(See FR-9.3.2)*

7. **Start/End game buttons**: On the game detail page, visible to all authenticated users based on current status. *(See FR-9.4, FR-9.5)*

8. **Player profile required**: All game features require a player profile. *(See TR-5.2)*

9. **Box scores**: Basketball only for now, designed flexibly for future sports. *(See FR-10.7)*

10. **Livestreams**: Not in scope. *(See EX-1)*

11. **Authorization deferred**: Owner-only restrictions are deferred to a future iteration. Any authenticated user with a player profile can perform all CRUD operations on any game. *(See SEC-2)*

12. **3-on-3 Basketball uses TeamInstance**: THREE_ON_THREE basketball uses `TeamInstance` (not `IndividualParticipant`) because it's still a team-based game format.

13. **My Games filter**: The `GameFilterInput` exposes a `createdBy` filter for server-side "My Games" filtering. *(See TR-5.4)*

14. **Team sizes**: Teams can include bench players. Max sizes are guidelines (e.g., 15 for 5v5 basketball, 6 for 3v3). *(See Team Size Guidelines)*
