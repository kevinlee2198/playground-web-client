# Authorization Reference

This document describes every authorization rule enforced by the backend. Use it to implement permission-aware UI in the frontend (hiding/disabling buttons, showing appropriate errors) and as a reference for the full authorization model.

**Authentication provider:** Keycloak (OAuth2 / OIDC with JWT Bearer tokens)
**Authorization engine:** Cerbos (Attribute-Based Access Control)

---

## Table of Contents

- [Roles and Identity](#roles-and-identity)
- [User Profile](#user-profile)
- [Player Profile](#player-profile)
- [Game](#game)
- [Game Participants](#game-participants)
  - [Team Instance](#team-instance)
  - [Individual Participant](#individual-participant)
  - [Players on a Team](#players-on-a-team)
- [Game Results and Statistics](#game-results-and-statistics)
  - [Scores (Participant Metadata)](#scores-participant-metadata)
  - [Sport-Specific Statistics](#sport-specific-statistics)
  - [Results Finalization](#results-finalization)
- [Game Media](#game-media)
  - [Media Operations](#media-operations)
  - [Livestream Operations](#livestream-operations)
- [Chat](#chat)
  - [Chat Room Management](#chat-room-management)
  - [Chat Messages](#chat-messages)
  - [Direct Messages vs Group Chats](#direct-messages-vs-group-chats)
- [User Preferences](#user-preferences)
  - [Profile Visibility](#profile-visibility)
- [Follows](#follows)
  - [Follow Requests (Private Profiles)](#follow-requests-private-profiles)
- [Blocking](#blocking)
  - [What Happens When You Block](#what-happens-when-you-block)
  - [Blocking Behavior by Query](#blocking-behavior-by-query)
  - [Structural vs Social Content](#structural-vs-social-content)
  - [Field-Level Anonymization](#field-level-anonymization)
  - [Blocking Summary Table](#blocking-summary-table)
- [Resources (File Uploads)](#resources-file-uploads)
- [Game Invitations](#game-invitations)
- [Subscriptions](#subscriptions)
  - [Game Events](#game-events)
  - [Chat Events](#chat-events)
- [Notifications](#notifications)
- [Error Behavior](#error-behavior)
- [Quick Reference Matrix](#quick-reference-matrix)

---

## Roles and Identity

### Principal Roles

| Role        | Description                                           |
| ----------- | ----------------------------------------------------- |
| `anonymous` | Unauthenticated user. Limited read-only access.       |
| `user`      | Any authenticated user.                               |
| `system`    | Internal system operations. Not available to clients. |

### Derived Roles (Contextual)

Derived roles are computed per-request based on the relationship between the authenticated user and the resource.

| Derived Role            | Condition                                                                                              |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `game_owner`            | The user has a `GameMember` record with role `OWNER` for the game (`game_owner_id == principal.id`)    |
| `game_editor`           | The user has a `GameMember` record with role `EDITOR` for the game (`principal.id in game_editor_ids`) |
| `game_participant`      | The user's player is on any team/individual slot in the game                                           |
| `game_pending_invitee`  | The user has a PENDING invitation to the game (`principal.id in game_pending_invitee_ids`)             |
| `game_accepted_invitee` | The user has an ACCEPTED invitation to the game (`principal.id in game_accepted_invitee_ids`)          |
| `invitation_invitee`\*  | The user is the invitee on a specific game invitation (`principal.id == invitee_id`)                   |
| `team_member`           | The user's player is on the specific team instance                                                     |
| `chat_room_owner`       | The user has the OWNER role in the chat room                                                           |
| `chat_room_admin`       | The user has the ADMIN role in the chat room                                                           |
| `chat_room_member`      | The user has any role (OWNER, ADMIN, or MEMBER) in the chat room                                       |
| `message_author`        | The user sent the specific chat message                                                                |
| `game_media_creator`    | The user created the specific game media item (`game_media_creator_id == principal.id`)                |
| `self`                  | The resource's `subject_user_id` matches the principal (used for player profile ownership)             |
| `resource_owner`\*      | The resource's `owner` field matches the principal (used for file/resource ownership)                  |

\* Not a Cerbos derived role — enforced as an inline condition in the relevant policy.

---

## User Profile

Any authenticated user can update their own profile fields. There is no way to update another user's profile.

| Operation           | Who Can Do It          | GraphQL       |
| ------------------- | ---------------------- | ------------- |
| Read (direct query) | Any user or anonymous  | `user(input)` |
| Read (own)          | Any authenticated user | `me { ... }`  |
| Update (own)        | Any authenticated user | `updateUser`  |

`updateUser` uses partial update semantics — only fields included in the input are changed. Currently supports `biography` (nullable) and `displayName` (non-nullable). Authorization is enforced via `@PreAuthorize("isAuthenticated()")` and `principal.id()` scoping.

For profile visibility behavior, see [Profile Visibility](#profile-visibility). For blocking behavior on user reads, see [Blocking Behavior by Query](#blocking-behavior-by-query).

---

## Player Profile

A player profile represents a user's identity in games. Players are **auto-created** when a user is first provisioned — there is no `createPlayer` or `deletePlayer` mutation. Every user always has exactly one player.

| Operation                    | Who Can Do It                        | GraphQL                 |
| ---------------------------- | ------------------------------------ | ----------------------- |
| Read (direct query)          | Any user or anonymous                | `player(id)`            |
| Read (own, via current user) | Any authenticated user               | `me { player { ... } }` |
| Update (own)                 | Owner only (via `self` derived role) | `updatePlayer`          |

`updatePlayer` always operates on the current user's player — no player ID is required in the input.

For blocking behavior on player reads, see [Blocking Behavior by Query](#blocking-behavior-by-query).

---

## Game

| Operation               | Who Can Do It                            | GraphQL                  |
| ----------------------- | ---------------------------------------- | ------------------------ |
| Create                  | Any authenticated user                   | `createGame`             |
| Read (PUBLIC/PROTECTED) | Any user or anonymous                    | `game(id)`, `games(...)` |
| Read (PRIVATE)          | Managers, participants, or invitees only | `game(id)`, `games(...)` |
| Update                  | Game owner or editor                     | `updateGame`             |
| Start                   | Game owner or editor                     | `startGame`              |
| End                     | Game owner or editor                     | `endGame`                |
| Delete                  | Game owner only                          | `deleteGame`             |
| Add editor              | Game owner only                          | `addGameEditor`          |
| Remove editor           | Game owner only                          | `removeGameEditor`       |
| Transfer ownership      | Game owner only                          | `transferGameOwnership`  |

### Frontend Fields for Game Management

| Field                 | Type                   | Description                                                                                                                                                                           |
| --------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Game.viewerGameRole` | `GameRole?`            | The current viewer's management role: `OWNER`, `EDITOR`, or `null` (no management role). Use this to conditionally render edit/delete/management buttons. `null` for anonymous users. |
| `Game.members(...)`   | `GameMemberConnection` | Paginated list of management members (owner + editors). Use for the editor management screen. Each `GameMember` has `user: User!` and `role: GameRole!`.                              |

**Frontend button visibility logic:**

| UI Element                  | Show When                                  |
| --------------------------- | ------------------------------------------ |
| Edit game button            | `viewerGameRole != null` (OWNER or EDITOR) |
| Delete game button          | `viewerGameRole == OWNER`                  |
| Manage editors button       | `viewerGameRole == OWNER`                  |
| Start/End game button       | `viewerGameRole != null`                   |
| Finalize/Unfinalize results | `viewerGameRole != null`                   |

### Visibility-Based Access

| Tier          | View                                      | Self-Join                           | Discovery                         |
| ------------- | ----------------------------------------- | ----------------------------------- | --------------------------------- |
| **PUBLIC**    | Anyone (incl. anonymous)                  | Any authenticated user              | Appears in all feeds and searches |
| **PROTECTED** | Anyone (incl. anonymous)                  | Managers and accepted invitees only | Appears in all feeds and searches |
| **PRIVATE**   | Managers, participants, and invitees only | Managers and accepted invitees only | Invisible to uninvolved users     |

"Involved" means the user is a manager (owner/editor), participant, or invitee (PENDING or ACCEPTED).

**PRIVATE game filtering:** PRIVATE games are excluded from all game queries (`game(id)`, `games(...)`, `followingActivityFeed`) when the viewer is not involved. `game(id)` returns `null` for uninvolved users. The `gameEvents` subscription rejects uninvolved users with `AccessDeniedException`.

**Visibility changes:** When a game's visibility changes, existing participants and invitees retain access. No participants or invitations are removed. Visibility controls discovery and future access, not retroactive removal.

### Filtering Games by Management Role

The `organizedByMe: Boolean` filter on `games(...)` returns only games where the current viewer is an OWNER or EDITOR. Use this for the "My Games" or "Games I Manage" screen. For anonymous users, the filter is silently ignored (returns all games).

```graphql
games(filter: { organizedByMe: true }) { ... }
```

### Editor Management Mutations

| Mutation                       | Who Can Call | Success Response                               | Error Responses                          |
| ------------------------------ | ------------ | ---------------------------------------------- | ---------------------------------------- |
| `addGameEditor(input)`         | Owner only   | `AddGameEditorResponse { gameMember }`         | `GameNotFoundError`, `UserNotFoundError` |
| `removeGameEditor(input)`      | Owner only   | `RemoveGameEditorResponse { id }`              | `GameNotFoundError`, `UserNotFoundError` |
| `transferGameOwnership(input)` | Owner only   | `TransferGameOwnershipResponse { gameMember }` | `GameNotFoundError`, `UserNotFoundError` |

**Transfer behavior:** The current owner becomes an EDITOR, and the target user becomes the new OWNER. If the target was already an EDITOR, they are promoted. If they had no role, a new OWNER membership is created.

**Service-layer restrictions** (not expressible in Cerbos policy alone):

- **Cannot add duplicate member:** If the user already has a role (OWNER or EDITOR), `addGameEditor` throws `IllegalStateException`.
- **Cannot remove the owner:** `removeGameEditor` rejects attempts to remove the OWNER. Use `transferGameOwnership` first.

### Game Properties Relevant to Authorization

| Field           | Type                                                   | Description                                                                                                                                                                                                                                                      |
| --------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `visibility`    | `PUBLIC` / `PROTECTED` / `PRIVATE`                     | Controls who can discover, view, and join the game. `PUBLIC`: anyone can view and self-join. `PROTECTED`: anyone can view, only managers or invited users can join. `PRIVATE`: only managers, participants, and invitees can view or join. Defaults to `PUBLIC`. |
| `gameStatus`    | `SCHEDULED` / `IN_PROGRESS` / `COMPLETE` / `FINALIZED` | The game's lifecycle state. `FINALIZED` locks the entire game record — scores, statistics, rosters, and participants cannot be modified except by managers (owner/editors). Managers can unfinalize (`FINALIZED` → `COMPLETE`) to allow corrections.             |
| `statEntryMode` | `OPEN` / `SELF_REPORT` / `MANAGER_ONLY`                | Controls who can enter scores and statistics while the game is not finalized. Defaults to `OPEN`.                                                                                                                                                                |

**Stat entry modes:**

- **`OPEN`**: Any game participant can enter or edit scores and statistics for anyone. Suitable for casual, trust-based games.
- **`SELF_REPORT`**: Participants can only enter their own statistics. For team sports, team members can update their own team's score. Suitable for individual sports or accountability-focused games.
- **`MANAGER_ONLY`**: Only the game owner and editors can enter scores and statistics. Regular participants cannot modify any scores or stats regardless of other conditions. Suitable for organized games with a dedicated scorekeeper.

The `visibility` and `statEntryMode` properties are orthogonal — visibility controls who can be in the game, while `statEntryMode` controls what participants can do once they're in.

The game owner is the user whose `GameMember` record has role `OWNER`. Ownership can be transferred via `transferGameOwnership` — the previous owner becomes an EDITOR and the target user becomes the new OWNER. Game management roles (`OWNER`, `EDITOR`) are independent from game participation: a user can be an editor without being a player in the game, and vice versa.

---

## Game Participants

Game participants are either **TeamInstance** (team sports) or **IndividualParticipant** (individual sports). The participant type is determined by the game's sport subtype.

### Team Instance

| Operation                  | Who Can Do It         | GraphQL                                           |
| -------------------------- | --------------------- | ------------------------------------------------- |
| Read                       | Any user or anonymous | via `game.participants`                           |
| Create                     | Game owner or editor  | `addGameParticipant`, `addGameParticipants`       |
| Update (name, description) | Game owner or editor  | `updateGameParticipant`, `updateGameParticipants` |
| Delete                     | Game owner or editor  | `removeGameParticipant`, `removeGameParticipants` |

**Score updates** on team instances follow the [Scores](#scores-participant-metadata) rules below.

### Individual Participant

| Operation            | Who Can Do It              | Condition                                   | GraphQL                                     |
| -------------------- | -------------------------- | ------------------------------------------- | ------------------------------------------- |
| Read                 | Any user or anonymous      |                                             | via `game.participants`                     |
| Create (join)        | Game owner or editor       | Always                                      | `addGameParticipant`, `addGameParticipants` |
| Create (self-join)   | Any authenticated user     | Game visibility is `PUBLIC`                 | `addGameParticipant`                        |
| Create (self-join)   | Accepted invitee           | Game visibility is `PROTECTED` or `PRIVATE` | `addGameParticipant`                        |
| Update               | Game owner or editor       | Always                                      | `updateGameParticipant`                     |
| Update (own)         | The participant themselves | Always                                      | `updateGameParticipant`                     |
| Delete (remove)      | Game owner or editor       | Always                                      | `removeGameParticipant`                     |
| Delete (self-remove) | The participant themselves | Always                                      | `removeGameParticipant`                     |

### Players on a Team

| Operation              | Who Can Do It          | Condition                                   | GraphQL                                                         |
| ---------------------- | ---------------------- | ------------------------------------------- | --------------------------------------------------------------- |
| Add player             | Game owner or editor   | Always                                      | `addPlayerToTeamInstance`, `addPlayersToTeamInstance`           |
| Add player (self-join) | Any authenticated user | Game visibility is `PUBLIC`                 | `addPlayerToTeamInstance`                                       |
| Add player (self-join) | Accepted invitee       | Game visibility is `PROTECTED` or `PRIVATE` | `addPlayerToTeamInstance`                                       |
| Remove player          | Game owner or editor   | Always                                      | `removePlayerFromTeamInstance`, `removePlayersFromTeamInstance` |
| Remove player (self)   | The player themselves  | Always (team member)                        | `removePlayerFromTeamInstance`                                  |

---

## Game Results and Statistics

### Scores (Participant Metadata)

Scores are updated via `updateGameParticipant` / `updateGameParticipants` using the `metadata` field. Score updates are governed by `gameStatus` and `statEntryMode`:

| Who                           | When                                                         | Can Update Scores?  |
| ----------------------------- | ------------------------------------------------------------ | ------------------- |
| Game owner or editor          | Always (even when finalized)                                 | Yes                 |
| Any game participant          | `gameStatus != FINALIZED` AND `statEntryMode == OPEN`        | Yes                 |
| Game participant (own scores) | `gameStatus != FINALIZED` AND `statEntryMode == SELF_REPORT` | Yes (own only)      |
| Team member (team scores)     | `gameStatus != FINALIZED` AND `statEntryMode == SELF_REPORT` | Yes (own team only) |
| Any game participant          | `statEntryMode == MANAGER_ONLY`                              | No                  |
| Any game participant          | `gameStatus == FINALIZED`                                    | No                  |

**`SELF_REPORT` and team scores:** For team sports, `SELF_REPORT` restricts team score updates to members of that team — any member can update their own team's score, but not the opposing team's.

### Sport-Specific Statistics

Every sport type has its own statistics queries and save mutations. **All sport-specific statistics follow the identical authorization pattern**, governed by the same Cerbos conditions (`gameStatus`, `statEntryMode`, role checks).

| Operation                   | Who Can Do It         | Condition                                                                               |
| --------------------------- | --------------------- | --------------------------------------------------------------------------------------- |
| Read                        | Any user or anonymous |                                                                                         |
| Create / Update             | Game owner or editor  | Always (even when finalized)                                                            |
| Create / Update             | Game participant      | `gameStatus != FINALIZED` AND `statEntryMode == OPEN`                                   |
| Create / Update (own stats) | Game participant      | `gameStatus != FINALIZED` AND `statEntryMode == SELF_REPORT` AND `targetPlayer == self` |
| Create / Update             | Game participant      | `statEntryMode == MANAGER_ONLY` — **No**                                                |
| Create / Update             | Game participant      | `gameStatus == FINALIZED` — **No**                                                      |
| Delete                      | Game owner only       | Always (not yet exposed in GraphQL)                                                     |

#### Statistics by Sport

| Sport                    | Query                            | Save (single)                   | Save (bulk)                         | Cerbos Resource                |
| ------------------------ | -------------------------------- | ------------------------------- | ----------------------------------- | ------------------------------ |
| Basketball               | `basketballBoxScores(...)`       | `saveBasketballBoxScore`        | `saveBasketballBoxScores`           | `basketball-box-score`         |
| Football (Offense)       | `footballOffensiveStats(...)`    | `saveFootballOffensiveStats`    | `saveFootballOffensiveStatsBulk`    | `football-offensive-stats`     |
| Football (Defense)       | `footballDefensiveStats(...)`    | `saveFootballDefensiveStats`    | `saveFootballDefensiveStatsBulk`    | `football-defensive-stats`     |
| Football (Special Teams) | `footballSpecialTeamsStats(...)` | `saveFootballSpecialTeamsStats` | `saveFootballSpecialTeamsStatsBulk` | `football-special-teams-stats` |
| Baseball (Batting)       | `baseballBattingStats(...)`      | `saveBaseballBattingStats`      | `saveBaseballBattingStatsBulk`      | `baseball-batting-stats`       |
| Baseball (Pitching)      | `baseballPitchingStats(...)`     | `saveBaseballPitchingStats`     | `saveBaseballPitchingStatsBulk`     | `baseball-pitching-stats`      |
| Baseball (Fielding)      | `baseballFieldingStats(...)`     | `saveBaseballFieldingStats`     | `saveBaseballFieldingStatsBulk`     | `baseball-fielding-stats`      |
| Baseball (Game Metadata) | via `Game.metadata`              | via `createGame` / `updateGame` | —                                   | `baseball-game-metadata`       |
| Pickleball               | `pickleballStatistics(...)`      | `savePickleballStatistics`      | `savePickleballStatisticsBulk`      | `pickleball-statistics`        |
| Tennis                   | `tennisStatistics(...)`          | `saveTennisStatistics`          | `saveTennisStatisticsBulk`          | `tennis-statistics`            |
| Volleyball               | `volleyballStatistics(...)`      | `saveVolleyballStatistics`      | `saveVolleyballStatisticsBulk`      | `volleyball-statistics`        |

All statistics queries support filtering by `gameIds` and/or `playerIds`, with cursor-based pagination. Statistics queries also enforce **game visibility** — statistics for PRIVATE games are excluded for uninvolved viewers, using the same Cerbos-based filtering as game queries.

### Results Finalization

Finalization is a game status transition, not a boolean toggle. The game must be in the correct state before the transition is allowed.

| Operation  | Who Can Do It        | Transition               | GraphQL                 |
| ---------- | -------------------- | ------------------------ | ----------------------- |
| Finalize   | Game owner or editor | `COMPLETE` → `FINALIZED` | `finalizeGameResults`   |
| Unfinalize | Game owner or editor | `FINALIZED` → `COMPLETE` | `unfinalizeGameResults` |

Attempting to finalize a game that is not `COMPLETE` (or unfinalize a game that is not `FINALIZED`) returns `InvalidGameStatusTransitionError`.

When results are finalized (`gameStatus == FINALIZED`), the game record is frozen:

- **Scores and statistics**: Only the game owner or editor can modify
- **Rosters**: No adding or removing players from teams
- **Participants**: No adding or removing teams/individuals
- **Reads**: Participants and viewers can still read all data
- **Reversible**: The game owner or editor can unfinalize at any time with `unfinalizeGameResults` to make corrections

---

## Game Media

Game media items (images, videos, livestreams, link previews) are attached to games. The `Game.media` connection returns all media for a game. Each concrete type (`ImageMedia`, `VideoMedia`, `LivestreamMedia`, `LinkMedia`) implements the `GameMedia` interface.

### Media Operations

| Operation             | Who Can Do It                                         | GraphQL            |
| --------------------- | ----------------------------------------------------- | ------------------ |
| Read                  | Any user or anonymous (blocked users' media excluded) | via `game.media`   |
| Resolve URL (preview) | Game owner, editor, or participant                    | `resolveUrl`       |
| Add link              | Game owner, editor, or participant                    | `addGameMediaLink` |
| Delete                | Media creator, game owner, or game editor             | `deleteGameMedia`  |

For image/video **uploads**, the two-phase upload flow in [Resources](#resources-file-uploads) applies. The `gameMedia` upload context restricts `requestUpload` to game owners, editors, and participants. When `confirmUpload` is called for a `gameMedia` context, a `GameMedia` record is created.

**Blocking on reads:** The `Game.media` resolver uses Cerbos PlanResources to filter out media uploaded by blocked users. Anonymous users see all media.

### Livestream Operations

Livestreams are a special type of game media (`LivestreamMedia`). When a livestream ends, the backend transitions it to a `VideoMedia`.

| Operation                   | Who Can Do It                             | GraphQL               |
| --------------------------- | ----------------------------------------- | --------------------- |
| Start                       | Game owner or game participant            | `startLivestream`     |
| Update (title, description) | Media creator only                        | `updateLivestream`    |
| End                         | Media creator, game owner, or game editor | `endLivestream`       |
| Heartbeat (keep alive)      | Media creator only                        | `livestreamHeartbeat` |

**Note:** Game editors **cannot** start livestreams (only owners and participants), but **can** end them. The `livestreamHeartbeat` mutation keeps the stream alive; missed heartbeats trigger auto-transition to `VideoMedia`.

---

## Chat

### Chat Room Roles

| Role     | Power Level                                                                   |
| -------- | ----------------------------------------------------------------------------- |
| `OWNER`  | Full control. One per group chat.                                             |
| `ADMIN`  | Can manage members and messages, but cannot manage other admins or the owner. |
| `MEMBER` | Can read and send messages, leave the room.                                   |

### Chat Room Management

| Operation                 | Who Can Do It             | Applies To  | GraphQL                                        |
| ------------------------- | ------------------------- | ----------- | ---------------------------------------------- |
| Create DM                 | Any authenticated user    | DMs         | `createDirectMessage`                          |
| Create group              | Any authenticated user    | Groups      | `createGroupChat`                              |
| Read room                 | Any room member           | Both        | `chatRoom(id)`, `chatRooms`                    |
| Rename                    | Owner or Admin            | Groups only | `renameChatRoom`                               |
| Add member                | Owner or Admin            | Groups only | `addChatRoomMember`                            |
| Remove member (kick)      | Owner or Admin            | Groups only | `removeChatRoomMember`                         |
| Leave                     | Any member (except Owner) | Groups only | `leaveChatRoom`                                |
| Delete room               | Owner only                | Groups only | (not yet exposed)                              |
| Promote (MEMBER -> ADMIN) | Owner only                | Groups only | `updateChatRoomMemberRole`                     |
| Demote (ADMIN -> MEMBER)  | Owner only                | Groups only | `updateChatRoomMemberRole`                     |
| Transfer ownership        | Owner only                | Groups only | `updateChatRoomMemberRole` (set `role: OWNER`) |

**Service-layer restrictions** (not expressible in Cerbos policy alone):

- **Mutual follow required for DM creation**: `createDirectMessage` requires the two users to be mutual follows — returns `MutualFollowRequiredError` if not. Existing DMs are returned idempotently regardless of current follow status.
- **Mutual follow required for sending messages in DMs**: `sendChatMessage` in a DirectMessageChatRoom requires mutual follow status — returns `MutualFollowRequiredError` if the mutual follow relationship is broken.
- **Mutual follow required for adding group members**: `addChatRoomMember` requires mutual follow between the adder and the target user — returns `MutualFollowRequiredError` if not. This implicitly prevents adding blocked users, since blocking destroys the follow relationship.
- **Admin cannot remove another Admin**: Admins can only remove MEMBERs. Returns an error if the target is an Admin or Owner.
- **Owner must transfer before leaving**: The Owner cannot leave the group. They must first transfer ownership to another member, then they can leave.
- **Role management not allowed on DMs**: `updateChatRoomMemberRole`, `renameChatRoom`, `leaveChatRoom`, `addChatRoomMember`, `removeChatRoomMember` are not applicable to DirectMessageChatRooms.

### Chat Messages

| Operation     | Who Can Do It                   | GraphQL                     |
| ------------- | ------------------------------- | --------------------------- |
| Read          | Any room member                 | via `chatRoom.chatMessages` |
| Send          | Any room member                 | `sendChatMessage`           |
| Update (edit) | Message author only             | `updateChatMessage`         |
| Delete        | Message author, Owner, or Admin | `deleteChatMessage`         |

### Direct Messages vs Group Chats

| Feature        | Direct Message                                                         | Group Chat                                                             |
| -------------- | ---------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Creation       | `createDirectMessage` (idempotent, requires mutual follow)             | `createGroupChat`                                                      |
| Members        | Exactly 2, immutable                                                   | 2+, mutable                                                           |
| Roles          | All members are MEMBER                                                 | OWNER, ADMIN, MEMBER hierarchy                                        |
| Name           | No name (derived from participants)                                    | Has a `name` field                                                    |
| Leave          | Not allowed                                                            | Allowed (except Owner)                                                |
| Kick/Add       | Not allowed                                                            | Owner or Admin (requires mutual follow between adder and target)      |
| Role changes   | Not allowed                                                            | Owner only                                                            |
| Blocking       | Creating a DM with a blocked user is **rejected**                      | Blocking does not affect existing group chat membership               |
| Mutual follows | Required for creation and sending messages                             | Required for adding new members                                       |
| Messaging      | Requires mutual follow — `canMessage` field indicates current status   | No mutual follow check for sending messages                           |

### Frontend Fields for Chat

| Field                              | Type       | Description                                                                                                                                                                                                  |
| ---------------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `DirectMessageChatRoom.canMessage` | `Boolean!` | Whether the viewer can send messages in this DM. Reflects the current mutual follow status between the two participants. When `false`, the frontend should disable the message input and show an explanation. |

---

## User Preferences

User preferences are **auto-created** when a user is first provisioned — there is no `createUserPreferences` mutation. Every user always has exactly one preferences record.

| Operation    | Who Can Do It          | GraphQL                      |
| ------------ | ---------------------- | ---------------------------- |
| Read (own)   | Any authenticated user | `me { preferences { ... } }` |
| Update (own) | Any authenticated user | `updateUserPreferences`      |

Preferences are strictly self-owned — a user can only read and update their own preferences. There is no way to query another user's preferences. Authorization is enforced via `@PreAuthorize("isAuthenticated()")` and `principal.id()` scoping in the controller.

`updateUserPreferences` uses partial update semantics — only fields included in the input are changed. Omitted fields retain their current values. Sending `null` for any field is rejected (`IllegalArgumentException`).

### Profile Visibility

The `profileVisibility` preference controls who can see a user's profile when queried by other users.

| Value              | Behavior                                                                                                                                 |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `PUBLIC` (default) | Anyone can see the profile, including anonymous users                                                                                    |
| `PRIVATE`          | Only the user themselves and their followers can see a full profile; everyone else receives a partial User with restricted fields nulled |

#### Masking Logic

For a PRIVATE profile, the viewer's access is determined as follows:

1. If the viewer is the target user → full profile
2. If the viewer is a follower of the target → full profile
3. Otherwise (anonymous or authenticated non-follower) → partial User with restricted fields set to `null`

Restricted fields that are nulled for non-followers: `firstName`, `lastName`, `biography`. Fields that remain visible: `id`, `username`, `displayName`, `profileVisibility`, `profilePicture`, `player`, `followerCount`, `followingCount`, `viewerFollowsUser`.

**Interaction with blocking:** The blocked-user check runs before the visibility check. If user A has blocked user B, `user(input)` returns `null` for B regardless of visibility settings.

#### Masking Paths (where enforcement is applied)

Profile visibility masking is applied in all of the following paths:

| Path                                                  | Description                                                                                          |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `user(input)` query                                   | Direct profile lookup — returns partial User for PRIVATE non-followers                               |
| `searchUsers`                                         | Search results — PRIVATE profiles appear but with restricted fields nulled                           |
| `HasUser` batch mapping                               | `GameMember.user`, `ChatRoomMember.user`, `UserChatMessage.user` — partial User for PRIVATE profiles |
| `Player.user` batch mapping                           | Players in game rosters — partial User for PRIVATE profiles                                          |
| `Follow.follower` / `Follow.following` batch mappings | Users in follower/following lists — partial User for PRIVATE profiles                                |

#### Consent-Based Paths (intentionally unmasked)

These paths expose User fields regardless of `profileVisibility` because the target user took an action implying consent:

| Path                                                                                                 | Reason                                           |
| ---------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `NewFollowerNotification.follower`                                                                   | They chose to follow you                         |
| `GameInvitation.inviter` / `GameInvitation.invitee`                                                  | Mutual game invitation action                    |
| `GameInvitationReceivedNotification.inviter`                                                         | They invited you to a game                       |
| `MemberJoinedChatMessage.member` / `MemberLeftChatMessage.member`                                    | Voluntary group chat action                      |
| `mutualFollows`                                                                                      | Your own social graph data                       |
| `blockedUsers`                                                                                       | You blocked them — you already know who they are |
| `FollowUserResponse.user` / `UnfollowUserResponse.user`                                              | Mutation response on your own action             |
| `GameMedia.addedBy` (all concrete types: `ImageMedia`, `VideoMedia`, `LivestreamMedia`, `LinkMedia`) | They chose to add media publicly                 |

#### Games and Statistics

Profile visibility does **not** filter game or statistics data. Games and box scores are always returned regardless of participant visibility settings. The frontend controls profile-page UX (e.g., showing a "private profile" overlay) using the `profileVisibility` field on the User.

Note: `showGameHistory` and `showStatistics` exist in `UserPreferences` but are **not currently enforced** by the backend. They are reserved for a future enhancement.

**Frontend guidance:**

- When `user(input)` returns a partial User (check `profileVisibility: PRIVATE`), the profile is private — show a "private profile" state
- When `user(input)` returns `null`, the user is blocked — show a generic "profile unavailable" message (do not distinguish between blocked and private)
- The `me { preferences { profileVisibility } }` query tells the current user their own visibility setting for the settings UI

---

## Follows

The follow model is unidirectional. Following someone is a one-way action. When two users each follow the other, they are considered **mutual follows** (implicit, not a separate relationship state).

For **PUBLIC** profiles, follows are instant. For **PRIVATE** profiles, `followUser` creates a pending follow request that the target must approve or decline.

| Operation            | Who Can Do It                          | GraphQL                                                                                                                   |
| -------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Follow a user        | Any authenticated user                 | `followUser` → `FollowUserResponse` (PUBLIC), `FollowRequestSentResponse` (PRIVATE), or `FollowRequestAlreadyExistsError` |
| Unfollow a user      | The follower                           | `unfollowUser`                                                                                                            |
| Remove a follower    | The followed user                      | `removeFollower`                                                                                                          |
| Query followers      | Any authenticated user                 | `followers(userId, ...)`                                                                                                  |
| Query following      | Any authenticated user                 | `following(userId, ...)`                                                                                                  |
| Query mutual follows | Any authenticated user                 | `mutualFollows(...)`                                                                                                      |
| Query blocked users  | Any authenticated user (own list only) | `blockedUsers(...)`                                                                                                       |

### Follow Rules

- `followUser` routes based on target's `profileVisibility`: PUBLIC → instant follow, PRIVATE → pending request.
- `followUser` is rejected if either user has blocked the other — returns `UserBlockedError`.
- `unfollowUser` returns `UnfollowUserResponse` with a `wasMutualFollow` flag indicating whether the relationship was mutual before unfollowing.
- `mutualFollows` is used for the DM recipient selector (creating a DM requires mutual follow).
- Blocked users are automatically excluded from `followers`, `following`, and `mutualFollows` results.

### Frontend Fields for Follow State

The User type includes viewer-relative fields for rendering follow buttons and determining access. All return `null` for unauthenticated viewers.

| Field                        | Type              | Description                                                                                                                                    |
| ---------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `viewerFollowsUser`         | `Boolean?`        | Whether the authenticated viewer follows this user. Use to render follow/unfollow button state and to determine access to private profiles.    |
| `userFollowsViewer`         | `Boolean?`        | Whether this user follows the viewer. Use to display "Follows you" badges. Combined with `viewerFollowsUser`, determines mutual follow status. |
| `viewerSentFollowRequest`   | `FollowRequest?`  | The viewer's pending outgoing follow request to this user, if any. Use to render "Requested" button state for private profiles.                |
| `viewerReceivedFollowRequest`| `FollowRequest?` | A pending incoming follow request from this user to the viewer, if any. Available for inline approve/decline UX on profile pages.              |

**Frontend button visibility logic:**

| UI Element              | Show When                                                                 |
| ----------------------- | ------------------------------------------------------------------------- |
| Follow button           | `viewerFollowsUser == false` AND `viewerSentFollowRequest == null`       |
| Unfollow button         | `viewerFollowsUser == true`                                              |
| Requested (cancel) button| `viewerSentFollowRequest != null`                                       |
| "Follows you" badge     | `userFollowsViewer == true`                                              |
| Mutual follow indicator | `viewerFollowsUser == true` AND `userFollowsViewer == true`              |

### Follow Requests (Private Profiles)

When the target has `profileVisibility = PRIVATE`, `followUser` creates a `FollowRequest` instead of an instant follow. The target must approve or decline.

| Operation               | Who Can Do It          | GraphQL                               |
| ----------------------- | ---------------------- | ------------------------------------- |
| Approve a request       | The target (recipient) | `approveFollowRequest`                |
| Decline a request       | The target (recipient) | `declineFollowRequest`                |
| Cancel a request        | The requester (sender) | `cancelFollowRequest`                 |
| Query incoming requests | The target             | `followRequests(direction: INCOMING)` |
| Query outgoing requests | The requester          | `followRequests(direction: OUTGOING)` |

**Authorization rules:**

- `approveFollowRequest` and `declineFollowRequest` are restricted to the **target** of the request.
- `cancelFollowRequest` is restricted to the **requester** of the request.
- **Oracle prevention:** All three mutations return `FollowRequestNotFoundError` for both "request doesn't exist" and "request exists but you're not authorized." The caller cannot distinguish these cases.

**Lifecycle:**

- Approve: deletes the request, creates a follow, sends `FollowRequestApprovedNotification` to requester and `NewFollowerNotification` to target.
- Decline: silently deletes the request (no notification).
- Cancel: deletes the request and removes unread `FollowRequestReceivedNotification` for this pair (spam prevention).
- Block: `blockUser` deletes any pending requests in both directions.
- PRIVATE → PUBLIC: `updateUserPreferences` auto-approves all pending requests for the user.

**Consent-based masking:** `FollowRequest.requester` and `FollowRequest.target` resolve full `User` objects without partial masking. The requester consented by sending the request, and the target is viewing their own inbox. Same applies to `FollowRequestReceivedNotification.requester` and `FollowRequestApprovedNotification.approver`.

**TOCTOU protections:**

- `FollowRequestService.create()` re-reads `profileVisibility` inside the transaction. If the target switched to PUBLIC between the check and create, an instant follow is created instead.
- `FollowRequestService.approve()` re-checks for blocks after inserting the follow. If a concurrent block was created, the follow is deleted and an error is thrown.
- `bulkApprove` uses `INSERT ... ON CONFLICT DO NOTHING` to safely handle concurrent single-approve + bulk-approve races.

---

## Blocking

Any authenticated user can block any other user regardless of current relationship status. Blocking is **bidirectional** in its effects — if A blocks B, the visibility effects apply to both A and B equally.

| Operation | Who Can Do It                         | GraphQL       |
| --------- | ------------------------------------- | ------------- |
| Block     | Any authenticated user                | `blockUser`   |
| Unblock   | Only the user who initiated the block | `unblockUser` |

### What Happens When You Block

1. **Existing follow relationships** in both directions are deleted (A stops following B and B stops following A)
2. **Pending follow requests** in both directions are deleted
3. **DM creation** with the blocked user is **rejected** (bidirectional — neither party can create a DM)
4. **Follow attempts** between blocked users are rejected — returns `UserBlockedError`
5. **Game invitations** to/from blocked users are rejected (bidirectional — returns `UserBlockedError`)
6. **Content visibility** changes immediately (see below)

### Blocking Behavior by Query

This section documents the **exact behavior** for every query and nested field when a blocking relationship exists between the viewer and another user. The behavior varies significantly depending on context.

#### Player Queries

**`player(id)`** — Direct player query

- **Behavior:** Returns **`null`** — the player is completely hidden, not anonymized
- This is a social content query (direct profile lookup), so the blocked player is invisible
- Anonymous (unauthenticated) users see the full player — blocking only applies to authenticated viewers

**`me { player { ... } }`** — Current user's own player (via `CurrentUser`)

- **Behavior:** Always returns the full unredacted player. Blocking never affects your own data.

#### User Queries

**`user(id)` / `user(username)`** — Direct user query

- **Behavior:** Returns **`null`** — the user profile is completely hidden
- This is a social content query (direct profile lookup), so the blocked user is invisible
- Anonymous (unauthenticated) users see the full user — blocking only applies to authenticated viewers
- **Note:** Profile visibility (`PRIVATE`) is also checked after the blocking check. For non-blocked PRIVATE profiles, returns a partial User (not `null`) — see [Profile Visibility](#profile-visibility)

**`searchUsers(query)`** — User search

- **Behavior:** **Blocked users are completely excluded** from search results (database-level filter). Neither the blocker nor the blocked user will see the other in search results.
- **Note:** PRIVATE profiles of non-blocked users do appear in search results but with restricted fields nulled — see [Profile Visibility](#profile-visibility)

#### Game Queries

**`game(id)`** — Single game query

- **Behavior:** **No blocking check.** Games are always visible regardless of blocking.

**`games(filter, sort, ...)`** — Game list query

- **Behavior:** **No blocking check.** All matching games are returned.
- If using the `playerId` filter to find a blocked user's games, results are **still returned** — no short-circuiting.

**`followingActivityFeed`** — Activity feed

- **Behavior:** **No blocking check.** Shows games where the viewer or users the viewer follows participate. Games containing blocked users still appear.

#### Nested Game Fields

**`Game.participants` -> `TeamInstance.players` / `IndividualParticipant.player`** — Players nested inside game participants

- **Behavior:** The Player object is returned but with **identifying fields anonymized** (set to `null`).
- This is the key difference from a direct `player(id)` query — the behavior is the same (anonymization), but the player is never removed from the list. The team roster stays structurally intact.
- See [Field-Level Anonymization](#field-level-anonymization) for the exact field list.

**`Game.media`** — All game media (images, videos, livestreams, links)

- **Behavior:** **Hidden** — media created by blocked users is excluded from results
- Uses Cerbos PlanResources to filter at the query level
- Anonymous users see all media (no blocking context)

#### Statistics Queries

**All statistics queries** (`basketballBoxScores`, `footballOffensiveStats`, `footballDefensiveStats`, `footballSpecialTeamsStats`, `baseballBattingStats`, `baseballPitchingStats`, `baseballFieldingStats`, `pickleballStatistics`, `tennisStatistics`, `volleyballStatistics`)

- **Behavior:** All matching statistics are returned. The nested `Player` on each stat record is **anonymized** — blocked players' identifying fields are nulled (same pattern as game participants). Stat data remains fully visible.

#### Chat Queries

**`chatRoom(id)`** — Single chat room

- **Behavior:** **No blocking check.** Returns the room if the viewer is a member.

**`chatRooms`** — Chat room list

- **Behavior:** **No blocking check.** Returns all rooms where the viewer is a member, including rooms with blocked users.

**`directMessageChatRoom(userId)`** — Find existing DM

- **Behavior:** **No blocking check.** Returns the existing DM if one exists, even if the other user is blocked.

**`chatRoom.chatMessages`** — Messages in a chat room

- **Behavior:** **No blocking check.** All messages are returned, including from blocked users.

#### Chat Mutations

**`createDirectMessage(userId)`** — Create a new DM

- **Behavior:** **Blocked.** Returns `UserBlockedError` via result union.
- This is bidirectional — neither party can create a new DM.

**`createGroupChat(userIds)`** — Create a group chat

- **Behavior:** Blocked users in the `userIds` list are **silently filtered out** — the group is created without them. No error is thrown.

**`addChatRoomMember(chatRoomId, userId)`** — Add member to existing group

- **Behavior:** **Mutual follow required.** Returns `MutualFollowRequiredError` if the adder and the target are not mutual follows. This implicitly prevents adding blocked users, since blocking destroys the follow relationship.

#### Follow Queries & Mutations

**`followers(userId, ...)`** — Query a user's followers

- **Behavior:** Blocked users are **excluded** from results (database-level filter).

**`following(userId, ...)`** — Query users someone follows

- **Behavior:** Blocked users are **excluded** from results (database-level filter).

**`mutualFollows(...)`** — Query mutual follows (for DM recipient selector)

- **Behavior:** Blocked users are **excluded** from results. Requires authentication.

**`blockedUsers(...)`** — Query your blocked users list

- **Behavior:** Returns only blocks initiated by the current user.

**`followUser(userId)`** — Follow a user

- **Behavior:** **Rejected** if either user has blocked the other. Returns `UserBlockedError` via result union.

**`unfollowUser(userId)`** — Unfollow a user

- **Behavior:** Returns `UnfollowUserResponse` with a `wasMutualFollow` flag.

**`removeFollower(userId)`** — Remove a user from your followers

- **Behavior:** Removes the follow relationship where the specified user follows you.

**`blockUser(userId)`** — Block a user

- **Behavior:** Returns `SelfActionError` if you try to block yourself. Returns `UserNotFoundError` if the target does not exist. On success, returns `BlockUserResponse` with `userId`. Existing follow relationships in both directions are removed.

**`unblockUser(userId)`** — Unblock a user

- **Behavior:** Only the person who initiated the block can unblock. Returns `BlockNotFoundError` if no block exists or if the other user blocked you (you can only unblock blocks you initiated). On success, returns `UnblockUserResponse`.

#### Notification & Subscription Queries

**`notifications`** — User notifications

- **Behavior:** **Unaffected** — all notifications are returned. Blocking is enforced at creation time: mutations that trigger notifications (`followUser`, `sendGameInvitation`) already reject blocked users, so notifications from blocked users cannot be created.

**`chatEvents` subscription** — Chat event stream

- **Behavior:** **No blocking check.** Events from blocked users in shared chat rooms are still delivered.

### Structural vs Social Content

Blocking distinguishes between two layers of content:

| Layer          | Examples                                                                           | Blocking Behavior                                      |
| -------------- | ---------------------------------------------------------------------------------- | ------------------------------------------------------ |
| **Structural** | Players in game rosters, teams, scores, box scores                                 | **Anonymized** — present but identifying fields nulled |
| **Social**     | Player profiles, user profiles, game media (including livestreams), search results | **Hidden** — filtered from results entirely            |

Structural data preserves game integrity — a team roster stays intact even if members have blocked each other. Social data is personal content that blocked users should not see at all.

### Field-Level Anonymization

When a blocked user's player appears in a game context (e.g., as a team member or individual participant), the player object is returned with identifying fields set to `null`. Note: direct `player(id)` queries return `null` entirely — anonymization only applies in nested game contexts.

```graphql
# What the viewer sees for a blocked player in a game context
{
  id: "123"           # Preserved — structural data
  age: null           # Anonymized
  height: null        # Anonymized
  weight: null        # Anonymized
  user: null          # Anonymized — no link to user profile
}
```

The `id` is always preserved so the frontend can still reference the player structurally (e.g., for positioning on a team roster). The Player type only has `id`, `age`, `height`, `weight`, and `user` — personal fields like `firstName`, `lastName`, and `biography` live on the User type and are controlled by [Profile Visibility](#profile-visibility), not blocking.

**How `user: null` works:** When identifying fields are redacted, the internal `userId` reference is set to `null`. The `Player.user` batch resolver sees `userId == null` and returns `null` — so the blocked player's User profile is unreachable through this path.

### Blocking Summary Table

| Query / Context                 | Behavior                                                                                                                                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `player(id)`                    | **Hidden** — returns `null` for blocked players                                                                                                                                                                    |
| `me { player }`                 | **Unaffected** — always returns your own full player                                                                                                                                                               |
| `user(id)` / `user(username)`   | **Hidden** — returns `null` for blocked users. **Partial** — returns partial User with restricted fields nulled for PRIVATE profiles when viewer is not a follower (see [Profile Visibility](#profile-visibility)) |
| `searchUsers`                   | **Hidden** — blocked users excluded from results. **Partial** — PRIVATE profile users appear with restricted fields nulled (see [Profile Visibility](#profile-visibility))                                         |
| `game(id)`                      | **Unaffected** — always returns the game                                                                                                                                                                           |
| `games(...)`                    | **Unaffected** — all matching games returned                                                                                                                                                                       |
| `followingActivityFeed`         | **Unaffected** — games with blocked participants still appear                                                                                                                                                      |
| `TeamInstance.players`          | **Anonymized** — blocked players in list with null identifying fields                                                                                                                                              |
| `IndividualParticipant.player`  | **Anonymized** — blocked player with null identifying fields                                                                                                                                                       |
| `Game.media`                    | **Hidden** — blocked users' media (including livestreams) excluded                                                                                                                                                 |
| Statistics queries (all sports) | **Anonymized** — blocked players with null identifying fields; stat data visible                                                                                                                                   |
| `chatRoom(id)`                  | **Unaffected** — returned if viewer is a member                                                                                                                                                                    |
| `chatRooms`                     | **Unaffected** — all member rooms returned                                                                                                                                                                         |
| `directMessageChatRoom(userId)` | **Unaffected** — returns existing DM if it exists                                                                                                                                                                  |
| `chatRoom.chatMessages`         | **Unaffected** — all messages returned                                                                                                                                                                             |
| `createDirectMessage`           | **Blocked** — returns `UserBlockedError` or `MutualFollowRequiredError` via result union                                                                                                                           |
| `sendChatMessage` (in DMs)      | **Mutual follow required** — returns `MutualFollowRequiredError` if mutual follow is broken                                                                                                                        |
| `createGroupChat`               | **Filtered** — blocked users silently removed from member list                                                                                                                                                     |
| `addChatRoomMember`             | **Mutual follow required** — returns `MutualFollowRequiredError`; implicitly prevents blocked users since blocking destroys follows                                                                                |
| `followers(...)`                | **Filtered** — blocked users excluded from results                                                                                                                                                                 |
| `following(...)`                | **Filtered** — blocked users excluded from results                                                                                                                                                                 |
| `sendGameInvitation`            | **Blocked** — returns `UserBlockedError` via result union (bidirectional)                                                                                                                                          |
| `notifications`                 | **Unaffected** — blocking enforced at creation time (mutations reject blocked users)                                                                                                                               |
| `followUser`                    | **Blocked** — returns `UserBlockedError` via result union                                                                                                                                                          |
| `blockUser`                     | **Restricted** — returns `SelfActionError` if self, `UserNotFoundError` if target doesn't exist                                                                                                                    |
| `unblockUser`                   | **Restricted** — `BlockNotFoundError` if no block exists or if they blocked you                                                                                                                                    |

---

## Resources (File Uploads)

### Upload Flow

1. **Phase 1**: Client calls `requestUpload` with file metadata and context -> receives `uploadUrl` and `resourceId`
2. **Client uploads** file bytes directly to the presigned S3 URL
3. **Phase 2**: Client calls `confirmUpload` with the `resourceId` to mark it permanent
   - **Exception**: Chat media is confirmed automatically when `sendChatMessage` is called — skip `confirmUpload`

### Upload Contexts

| Context              | Description                          | Who Can Upload                     |
| -------------------- | ------------------------------------ | ---------------------------------- |
| `userProfilePicture` | Profile picture for the current user | The user themselves                |
| `gameMedia`          | Photos/videos attached to a game     | Game owner, editor, or participant |
| `chatMedia`          | File/image sent in a chat message    | Any room member                    |

### Resource Authorization

| Operation               | Who Can Do It          | GraphQL                |
| ----------------------- | ---------------------- | ---------------------- |
| Create (request upload) | Any authenticated user | `requestUpload`        |
| Read                    | Any user or anonymous  | via parent type fields |
| Confirm                 | Resource owner only    | `confirmUpload`        |
| Delete                  | Resource owner only    | `deleteResource`       |

**Blocking on reads:** The `Game.media` resolver uses Cerbos PlanResources to filter out resources uploaded by blocked users. `User.profilePicture` and `MediaChatMessage.resource` batch mappings are unaffected by blocking.

---

## Game Invitations

Game organizers and editors can invite users to join their games. Invitations grant access to PROTECTED and PRIVATE games.

### Invitation Lifecycle

| Status      | Description                                | Terminal? |
| ----------- | ------------------------------------------ | --------- |
| `PENDING`   | Invitation sent, awaiting invitee response | No        |
| `ACCEPTED`  | Invitee accepted the invitation            | Yes       |
| `CANCELLED` | Manager revoked the invitation             | Yes       |

There is no `DECLINED` status — declining deletes the invitation row entirely (to avoid social awkwardness in a friends app). There is no expiry mechanism.

**Accept does not auto-join.** Accepting grants permission to join (and view access for PRIVATE games). The invitee then uses the normal self-join flow.

### Invitation Operations

| Operation               | Who Can Do It                | GraphQL                                     |
| ----------------------- | ---------------------------- | ------------------------------------------- |
| Send invitation         | Game owner or editor         | `sendGameInvitation`, `sendGameInvitations` |
| Cancel invitation       | Game owner or editor         | `cancelGameInvitation`                      |
| Accept invitation       | The invitee only             | `acceptGameInvitation`                      |
| Decline invitation      | The invitee only             | `declineGameInvitation`                     |
| View game's invitations | Game owner or editor         | `Game.invitations(...)`                     |
| View own invitation     | The invitee (via game field) | `Game.viewerInvitation`                     |

### Send Restrictions

- **Game must not be COMPLETE** — returns `GameCompleteError`
- **Bidirectional block check** — returns `UserBlockedError` if either party has blocked the other
- **No duplicate PENDING invitations** — returns `AlreadyInvitedError`
- **Already a participant** — returns `AlreadyParticipantError` (checks both team players and individual participants)
- **Self-invitation silently skipped** — manager already has access
- **Manager invitation silently skipped** — already has full access

### Re-Inviting

A user can be re-invited after:

- **Decline** — the row was deleted, so no record blocks a new invitation
- **Cancellation** — the old `CANCELLED` row is reused and reset to `PENDING`
- **Departure after accept** — the old `ACCEPTED` row is reused and reset to `PENDING`

### Bulk Invitations

`sendGameInvitations` uses partial-failure semantics: valid invitations succeed, per-invitee results are returned with individual success/error status. Game-level errors (`GameNotFoundError`, `GameCompleteError`) fail the entire operation.

### Frontend Fields for Invitations

| Field                   | Type                       | Description                                                                                            |
| ----------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `Game.viewerInvitation` | `GameInvitation?`          | The current viewer's invitation (PENDING or ACCEPTED). Null if none. Follows `viewerGameRole` pattern. |
| `Game.invitations(...)` | `GameInvitationConnection` | Paginated invitations for the game. Returns empty connection for non-managers (soft auth).             |

### Invitation Filters on Game Queries

| Filter              | Description                                                                            |
| ------------------- | -------------------------------------------------------------------------------------- |
| `invitedToMe: true` | Only games where the viewer has a PENDING invitation (needs response)                  |
| `myGames: true`     | Games where the viewer is a participant, manager, or has a PENDING/ACCEPTED invitation |

---

## Subscriptions

### Game Events

| Operation | Who Can Do It                    | GraphQL              |
| --------- | -------------------------------- | -------------------- |
| Subscribe | Anyone who can **read** the game | `gameEvents(gameId)` |

The `gameEvents` subscription performs a Cerbos READ check on the game at subscription time. This means:

- **PUBLIC/PROTECTED games:** Any user (including anonymous) can subscribe
- **PRIVATE games:** Only managers, participants, and invitees can subscribe — uninvolved users receive `AccessDeniedException`

Events include: `GameStartedEvent`, `GameEndedEvent`, `GameResultsFinalizedEvent`, `GameResultsUnfinalizedEvent`, `GameScoreUpdatedEvent`, `GameParticipantAddedEvent`, `GameParticipantRemovedEvent`, `TeamRosterUpdatedEvent`, `BoxScoreSavedEvent`.

### Chat Events

| Operation | Who Can Do It          | GraphQL      |
| --------- | ---------------------- | ------------ |
| Subscribe | Any authenticated user | `chatEvents` |

The `chatEvents` subscription delivers events for all chat rooms the user is a member of. Events from blocked users in shared chat rooms are still delivered (no blocking filter on the subscription).

---

## Notifications

| Operation    | Who Can Do It                               | GraphQL                           |
| ------------ | ------------------------------------------- | --------------------------------- |
| Query        | Authenticated user (own notifications only) | `notifications(...)`              |
| Mark as read | Authenticated user (own notifications only) | `readNotifications`               |
| Subscribe    | Authenticated user (own events only)        | `notificationEvents` subscription |

### Notification Types

| Type                                 | Trigger                                              |
| ------------------------------------ | ---------------------------------------------------- |
| `NewFollowerNotification`            | Someone started following you                        |
| `GameStartedNotification`            | A game you're participating in starts                |
| `GameInvitationReceivedNotification` | Someone invites you to a game                        |
| `FollowRequestReceivedNotification`  | Someone sends you a follow request (private profile) |
| `FollowRequestApprovedNotification`  | Someone approves your follow request                 |

---

## Error Behavior

The backend uses two error channels:

1. **Result unions (domain errors):** Every mutation returns a union type (e.g., `CreateDirectMessageResult = CreateDirectMessageResponse | UserBlockedError`). Domain errors like "not found", "invalid state", or "blocked" are returned as typed error objects in the response `data`, not in the GraphQL `errors` array. Clients should use `... on Error { message }` as a catch-all or match specific error types.

2. **GraphQL errors array (infrastructure errors):** Authentication failures (`UNAUTHORIZED`) and authorization failures (`FORBIDDEN`) from Spring Security's `@PreAuthorize` checks are returned in the standard GraphQL `errors` array. These indicate the user lacks the role or permission to call the mutation at all.

The frontend should:

1. **Proactively hide/disable** UI elements the user cannot interact with (using the rules in this document)
2. **Handle result union errors** by checking the `__typename` of mutation responses
3. **Handle GraphQL errors** for infrastructure-level auth failures (e.g., race conditions where permissions changed between page load and action)

Common error scenarios:

- Attempting to modify a game you don't own or edit -> `FORBIDDEN` in GraphQL errors array (Cerbos authorization)
- Attempting to delete a game as an editor (not owner) -> `FORBIDDEN` in GraphQL errors array (Cerbos authorization)
- Attempting to modify finalized results as a participant -> `FORBIDDEN` in GraphQL errors array (Cerbos authorization)
- Attempting to finalize a game that is not `COMPLETE` -> `InvalidGameStatusTransitionError` via result union
- Attempting to unfinalize a game that is not `FINALIZED` -> `InvalidGameStatusTransitionError` via result union
- Attempting to invite a user to a completed game -> `GameCompleteError` via result union
- Attempting to invite an already-invited user -> `AlreadyInvitedError` via result union
- Attempting to invite an already-participating user -> `AlreadyParticipantError` via result union
- Attempting to invite a blocked user -> `UserBlockedError` via result union
- Attempting to accept/decline a non-PENDING invitation -> `InvalidInvitationStatusError` via result union
- Attempting to create a DM with a blocked user -> `UserBlockedError` via result union
- Attempting to follow a blocked user -> `UserBlockedError` via result union
- Attempting to remove an admin as another admin -> `InsufficientRoleError` via result union
- Owner attempting to leave without transferring ownership -> `OwnerCannotLeaveError` via result union
- Attempting to block yourself -> `SelfActionError` via result union

---

## Quick Reference Matrix

### Game Operations

| Action                                  | Anonymous | Authenticated | Owner | Editor | Participant | Accepted Invitee | Pending Invitee |
| --------------------------------------- | --------- | ------------- | ----- | ------ | ----------- | ---------------- | --------------- |
| View game (PUBLIC/PROTECTED)            | Yes       | Yes           | Yes   | Yes    | Yes         | Yes              | Yes             |
| View game (PRIVATE)                     |           |               | Yes   | Yes    | Yes         | Yes              | Yes             |
| View game (FINALIZED)                   | Yes       | Yes           | Yes   | Yes    | Yes         | Yes              | Yes             |
| Create game                             |           | Yes           |       |        |             |                  |                 |
| Update game                             |           |               | Yes   | Yes    |             |                  |                 |
| Start/End game                          |           |               | Yes   | Yes    |             |                  |                 |
| Delete game                             |           |               | Yes   |        |             |                  |                 |
| Add/Remove editor                       |           |               | Yes   |        |             |                  |                 |
| Transfer ownership                      |           |               | Yes   |        |             |                  |                 |
| Add participant (PROTECTED/PRIVATE)     |           |               | Yes   | Yes    |             |                  |                 |
| Add participant (PUBLIC)                |           | Yes           | Yes   | Yes    |             |                  |                 |
| Self-join (PROTECTED/PRIVATE)           |           |               | Yes   | Yes    |             | Yes              |                 |
| Self-remove from game                   |           |               |       |        | Yes         |                  |                 |
| Finalize results (requires COMPLETE)    |           |               | Yes   | Yes    |             |                  |                 |
| Unfinalize results (requires FINALIZED) |           |               | Yes   | Yes    |             |                  |                 |
| Send invitation                         |           |               | Yes   | Yes    |             |                  |                 |
| Cancel invitation                       |           |               | Yes   | Yes    |             |                  |                 |
| Accept invitation                       |           |               |       |        |             |                  | Yes (self only) |
| Decline invitation                      |           |               |       |        |             |                  | Yes (self only) |
| View game invitations                   |           |               | Yes   | Yes    |             |                  |                 |

### Game Media Operations

| Action               | Anonymous | Authenticated | Owner | Editor | Participant | Media Creator |
| -------------------- | --------- | ------------- | ----- | ------ | ----------- | ------------- |
| View media           | Yes       | Yes           | Yes   | Yes    | Yes         | Yes           |
| Resolve URL          |           |               | Yes   | Yes    | Yes         |               |
| Add link             |           |               | Yes   | Yes    | Yes         |               |
| Upload media         |           |               | Yes   | Yes    | Yes         |               |
| Delete media         |           |               | Yes   | Yes    |             | Yes (own)     |
| Start livestream     |           |               | Yes   |        | Yes         |               |
| Update livestream    |           |               |       |        |             | Yes           |
| End livestream       |           |               | Yes   | Yes    |             | Yes           |
| Livestream heartbeat |           |               |       |        |             | Yes           |

### Statistics and Scores Operations (All Sports)

| Action                  | Owner or Editor | Participant (OPEN) | Participant (SELF_REPORT) | Participant (MANAGER_ONLY) | Participant (finalized) |
| ----------------------- | --------------- | ------------------ | ------------------------- | -------------------------- | ----------------------- |
| Update scores           | Yes             | Yes                | Own only                  | No                         | No                      |
| Save statistics         | Yes             | Yes                | Own only                  | No                         | No                      |
| Modify rosters          | Yes             | —                  | —                         | —                          | No                      |
| Add/remove participants | Yes             | —                  | —                         | —                          | No                      |

### Chat Operations

| Action                  | Owner               | Admin              | Member | Non-member |
| ----------------------- | ------------------- | ------------------ | ------ | ---------- |
| Read messages           | Yes                 | Yes                | Yes    |            |
| Send message            | Yes                 | Yes                | Yes    |            |
| Edit own message        | Yes                 | Yes                | Yes    |            |
| Delete own message      | Yes                 | Yes                | Yes    |            |
| Delete others' messages | Yes                 | Yes                |        |            |
| Rename group            | Yes                 | Yes                |        |            |
| Add member              | Yes                 | Yes                |        |            |
| Remove member           | Yes                 | Yes (members only) |        |            |
| Promote/Demote          | Yes                 |                    |        |            |
| Transfer ownership      | Yes                 |                    |        |            |
| Leave                   | Must transfer first | Yes                | Yes    |            |
