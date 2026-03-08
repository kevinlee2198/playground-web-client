# Authorization Reference

This document describes every authorization rule enforced by the backend. Use it to implement permission-aware UI in the frontend (hiding/disabling buttons, showing appropriate errors) and as a reference for the full authorization model.

**Authentication provider:** Keycloak (OAuth2 / OIDC with JWT Bearer tokens)
**Authorization engine:** Cerbos (Attribute-Based Access Control)

---

## Table of Contents

- [Roles and Identity](#roles-and-identity)
- [Player Profile](#player-profile)
- [Game](#game)
- [Game Participants](#game-participants)
  - [Team Instance](#team-instance)
  - [Individual Participant](#individual-participant)
  - [Players on a Team](#players-on-a-team)
- [Game Results and Statistics](#game-results-and-statistics)
  - [Scores (Participant Metadata)](#scores-participant-metadata)
  - [Box Scores (Basketball)](#box-scores-basketball)
  - [Results Finalization](#results-finalization)
- [Livestreams](#livestreams)
- [Chat](#chat)
  - [Chat Room Management](#chat-room-management)
  - [Chat Messages](#chat-messages)
  - [Direct Messages vs Group Chats](#direct-messages-vs-group-chats)
- [Friendships](#friendships)
- [Blocking](#blocking)
  - [What Happens When You Block](#what-happens-when-you-block)
  - [Blocking Behavior by Query](#blocking-behavior-by-query)
  - [Structural vs Social Content](#structural-vs-social-content)
  - [Field-Level Anonymization](#field-level-anonymization)
  - [Blocking Summary Table](#blocking-summary-table)
- [Resources (File Uploads)](#resources-file-uploads)
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

| Derived Role         | Condition                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------ |
| `game_organizer`     | The user created the game (`game.createdBy == principal.id`)                               |
| `game_participant`   | The user's player is on any team/individual slot in the game                               |
| `team_member`        | The user's player is on the specific team instance                                         |
| `chat_room_owner`    | The user has the OWNER role in the chat room                                               |
| `chat_room_admin`    | The user has the ADMIN role in the chat room                                               |
| `chat_room_member`   | The user has any role (OWNER, ADMIN, or MEMBER) in the chat room                           |
| `message_author`     | The user sent the specific chat message                                                    |
| `livestream_creator` | The user started the specific livestream                                                   |
| `self`               | The resource's `subject_user_id` matches the principal (used for player profile ownership) |
| `owner`              | The resource's `owner` field matches the principal (used for file/resource ownership)      |

---

## Player Profile

A player profile represents a user's identity in games.

| Operation           | Who Can Do It                         | GraphQL                       |
| ------------------- | ------------------------------------- | ----------------------------- |
| Create              | Any authenticated user (one per user) | `createPlayer`                |
| Read (direct query) | Any user or anonymous                 | `player(id)`, `currentPlayer` |
| Update              | Owner only (via system `owner` role)  | `updatePlayer`                |
| Delete              | Owner only (via system `owner` role)  | `deletePlayer`                |

For blocking behavior on player reads, see [Blocking Behavior by Query](#blocking-behavior-by-query).

---

## Game

| Operation | Who Can Do It          | GraphQL                  |
| --------- | ---------------------- | ------------------------ |
| Create    | Any authenticated user | `createGame`             |
| Read      | Any user or anonymous  | `game(id)`, `games(...)` |
| Update    | Game organizer only    | `updateGame`             |
| Start     | Game organizer only    | `startGame`              |
| End       | Game organizer only    | `endGame`                |
| Delete    | Game organizer only    | `deleteGame`             |

### Game Properties Relevant to Authorization

| Field              | Type                   | Description                                                                   |
| ------------------ | ---------------------- | ----------------------------------------------------------------------------- |
| `visibility`       | `PUBLIC` / `PRIVATE`   | Controls who can join the game. Defaults to `PUBLIC`.                         |
| `resultsFinalized` | `Boolean`              | When `true`, only the organizer can modify scores/stats. Defaults to `false`. |
| `statEntryMode`    | `OPEN` / `SELF_REPORT` | Controls who can enter statistics. Defaults to `OPEN`.                        |

The game organizer is the user who created the game (the `createdBy` user). This cannot be transferred.

---

## Game Participants

Game participants are either **TeamInstance** (team sports) or **IndividualParticipant** (individual sports). The participant type is determined by the game's sport subtype.

### Team Instance

| Operation                  | Who Can Do It         | GraphQL                                           |
| -------------------------- | --------------------- | ------------------------------------------------- |
| Read                       | Any user or anonymous | via `game.participants`                           |
| Create                     | Game organizer only   | `addGameParticipant`, `addGameParticipants`       |
| Update (name, description) | Game organizer only   | `updateGameParticipant`, `updateGameParticipants` |
| Delete                     | Game organizer only   | `removeGameParticipant`, `removeGameParticipants` |

**Score updates** on team instances follow the [Scores](#scores-participant-metadata) rules below.

### Individual Participant

| Operation            | Who Can Do It              | Condition                   | GraphQL                                     |
| -------------------- | -------------------------- | --------------------------- | ------------------------------------------- |
| Read                 | Any user or anonymous      |                             | via `game.participants`                     |
| Create (join)        | Game organizer             | Always                      | `addGameParticipant`, `addGameParticipants` |
| Create (self-join)   | Any authenticated user     | Game visibility is `PUBLIC` | `addGameParticipant`                        |
| Update               | Game organizer             | Always                      | `updateGameParticipant`                     |
| Update (own)         | The participant themselves | Always                      | `updateGameParticipant`                     |
| Delete (remove)      | Game organizer             | Always                      | `removeGameParticipant`                     |
| Delete (self-remove) | The participant themselves | Always                      | `removeGameParticipant`                     |

### Players on a Team

| Operation              | Who Can Do It          | Condition                   | GraphQL                                                         |
| ---------------------- | ---------------------- | --------------------------- | --------------------------------------------------------------- |
| Add player             | Game organizer         | Always                      | `addPlayerToTeamInstance`, `addPlayersToTeamInstance`           |
| Add player (self-join) | Any authenticated user | Game visibility is `PUBLIC` | `addPlayerToTeamInstance`                                       |
| Remove player          | Game organizer         | Always                      | `removePlayerFromTeamInstance`, `removePlayersFromTeamInstance` |
| Remove player (self)   | The player themselves  | Always (team member)        | `removePlayerFromTeamInstance`                                  |

---

## Game Results and Statistics

### Scores (Participant Metadata)

Scores are updated via `updateGameParticipant` / `updateGameParticipants` using the `metadata` field. The same authorization rules as the participant update apply, but score-specific behavior is additionally governed by `resultsFinalized` and `statEntryMode`:

| Who                           | When                                                           | Can Update Scores? |
| ----------------------------- | -------------------------------------------------------------- | ------------------ |
| Game organizer                | Always                                                         | Yes                |
| Any game participant          | `resultsFinalized == false` AND `statEntryMode == OPEN`        | Yes                |
| Game participant (own scores) | `resultsFinalized == false` AND `statEntryMode == SELF_REPORT` | Yes (own only)     |
| Any game participant          | `resultsFinalized == true`                                     | No                 |

### Box Scores (Basketball)

| Operation       | Who Can Do It                | Condition                                                                                 | GraphQL                                             |
| --------------- | ---------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Read            | Any user or anonymous        |                                                                                           | `basketballBoxScores(...)`                          |
| Create / Update | Game organizer               | Always                                                                                    | `saveBasketballBoxScore`, `saveBasketballBoxScores` |
| Create / Update | Game participant             | `resultsFinalized == false` AND `statEntryMode == OPEN`                                   | `saveBasketballBoxScore`                            |
| Create / Update | Game participant (own stats) | `resultsFinalized == false` AND `statEntryMode == SELF_REPORT` AND `targetPlayer == self` | `saveBasketballBoxScore`                            |
| Delete          | Game organizer only          | Always                                                                                    | (not yet exposed in GraphQL)                        |

### Results Finalization

| Operation          | Who Can Do It       | GraphQL                 |
| ------------------ | ------------------- | ----------------------- |
| Finalize results   | Game organizer only | `finalizeGameResults`   |
| Unfinalize results | Game organizer only | `unfinalizeGameResults` |

When results are finalized (`resultsFinalized == true`):

- Only the game organizer can modify scores and statistics
- Participants can still read all data
- The organizer can reverse this at any time with `unfinalizeGameResults`

---

## Livestreams

| Operation                   | Who Can Do It                        | GraphQL                |
| --------------------------- | ------------------------------------ | ---------------------- |
| Read                        | Any user or anonymous                | via `game.livestreams` |
| Start                       | Game organizer OR game participant   | `startLivestream`      |
| Update (title, description) | Livestream creator only              | `updateLivestream`     |
| End                         | Livestream creator OR game organizer | `endLivestream`        |

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

| Feature      | Direct Message                                    | Group Chat                                     |
| ------------ | ------------------------------------------------- | ---------------------------------------------- |
| Creation     | `createDirectMessage` (idempotent)                | `createGroupChat`                              |
| Members      | Exactly 2, immutable                              | 2+, mutable                                    |
| Roles        | All members are MEMBER                            | OWNER, ADMIN, MEMBER hierarchy                 |
| Name         | No name (derived from participants)               | Has a `name` field                             |
| Leave        | Not allowed                                       | Allowed (except Owner)                         |
| Kick/Add     | Not allowed                                       | Owner or Admin                                 |
| Role changes | Not allowed                                       | Owner only                                     |
| Blocking     | Creating a DM with a blocked user is **rejected** | Blocking does not affect group chat membership |

---

## Friendships

| Operation         | Who Can Do It                              | GraphQL                |
| ----------------- | ------------------------------------------ | ---------------------- |
| Send request      | Any authenticated user                     | `sendFriendRequest`    |
| Accept request    | The addressee (recipient) only             | `acceptFriendRequest`  |
| Decline request   | The addressee (recipient) only             | `declineFriendRequest` |
| Cancel request    | The requester (sender) only, while PENDING | `cancelFriendRequest`  |
| Unfriend          | Either user in an ACCEPTED friendship      | `unfriend`             |
| Query friendships | Authenticated user (own friendships only)  | `friendships(...)`     |

### Friendship Statuses

| Status     | Meaning                         |
| ---------- | ------------------------------- |
| `PENDING`  | Request sent, awaiting response |
| `ACCEPTED` | Both users are friends          |
| `DECLINED` | Request was declined            |
| `BLOCKED`  | One user has blocked the other  |

### Friendship Filters

The `friendships` query supports filtering by:

- `status`: Filter by `PENDING`, `ACCEPTED`, `DECLINED`, `BLOCKED`
- `direction`: `INCOMING` (requests sent to me) or `OUTGOING` (requests I sent)

---

## Blocking

Any authenticated user can block any other user regardless of current relationship status. Blocking is **bidirectional** in its effects — if A blocks B, the visibility effects apply to both A and B equally.

| Operation | Who Can Do It                         | GraphQL       |
| --------- | ------------------------------------- | ------------- |
| Block     | Any authenticated user                | `blockUser`   |
| Unblock   | Only the user who initiated the block | `unblockUser` |

### What Happens When You Block

1. **Friendship record** is set to `BLOCKED` status (with the blocker as `requester`)
2. **DM creation** with the blocked user is **rejected** (bidirectional — neither party can create a DM)
3. **Friend requests** between blocked users are rejected
4. **Content visibility** changes immediately (see below)

### Blocking Behavior by Query

This section documents the **exact behavior** for every query and nested field when a blocking relationship exists between the viewer and another user. The behavior varies significantly depending on context.

#### Player Queries

**`player(id)`** — Direct player query

- **Behavior:** Returns **`null`** — the player is completely hidden, not anonymized
- This is a social content query (direct profile lookup), so the blocked player is invisible
- Anonymous (unauthenticated) users see the full player — blocking only applies to authenticated viewers

**`currentPlayer`** — Current user's own player

- **Behavior:** Always returns the full unredacted player. Blocking never affects your own data.

#### User Queries

**`user(id)` / `user(username)`** — Direct user query

- **Behavior:** Returns **`null`** — the user profile is completely hidden
- This is a social content query (direct profile lookup), so the blocked user is invisible
- Anonymous (unauthenticated) users see the full user — blocking only applies to authenticated viewers

**`searchUsers(query)`** — User search

- **Behavior:** **Blocked users are completely excluded** from search results (database-level filter).
- Neither the blocker nor the blocked user will see the other in search results.

#### Game Queries

**`game(id)`** — Single game query

- **Behavior:** **No blocking check.** Games are always visible regardless of blocking.

**`games(filter, sort, ...)`** — Game list query

- **Behavior:** **No blocking check.** All matching games are returned.
- If using the `playerId` filter to find a blocked user's games, results are **still returned** — no short-circuiting.

**`friendsActivityFeed`** — Activity feed

- **Behavior:** **No blocking check.** Shows games where the viewer or viewer's ACCEPTED friends participate. Games containing blocked users still appear.

#### Nested Game Fields

**`Game.participants` -> `TeamInstance.players` / `IndividualParticipant.player`** — Players nested inside game participants

- **Behavior:** The Player object is returned but with **identifying fields anonymized** (set to `null`).
- This is the key difference from a direct `player(id)` query — the behavior is the same (anonymization), but the player is never removed from the list. The team roster stays structurally intact.
- See [Field-Level Anonymization](#field-level-anonymization) for the exact field list.

**`Game.livestreams`** — Livestreams on a game

- **Behavior:** **Hidden** — livestreams created by blocked users are excluded from results
- Uses Cerbos PlanResources to filter at the query level
- Anonymous users see all livestreams (no blocking context)

**`Game.media`** — Media/files attached to a game

- **Behavior:** **Hidden** — media uploaded by blocked users is excluded from results
- Uses Cerbos PlanResources to filter at the query level
- Anonymous users see all media (no blocking context)

#### Statistics Queries

**`basketballBoxScores(input)`** — Box score queries

- **Behavior:** **No blocking check.** All matching box scores are returned. The nested `Player` on each box score is **not** anonymized at this level.

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

- **Behavior:** **No blocking check.** Blocked users can be added to existing group chats.

#### Friendship Queries & Mutations

**`friendships(filter)`** — Query friendships

- **Behavior:** Returns BLOCKED friendships when filtering by `status: BLOCKED`. The blocked user's information is visible in the friendship record.

**`sendFriendRequest(userId)`** — Send friend request

- **Behavior:** **Rejected** if either user has blocked the other. Returns `FriendshipAlreadyExistsError` with `currentStatus: BLOCKED` via result union.

**`blockUser(userId)`** — Block a user

- **Behavior:** Succeeds unless the target has already blocked the viewer first, in which case returns `UserBlockedYouError` via result union. Returns `SelfActionError` if you try to block yourself.

**`unblockUser(userId)`** — Unblock a user

- **Behavior:** Only the person who initiated the block can unblock. Returns `BlockNotFoundError` if no block exists. Returns `UserBlockedYouError` if the other user blocked you (you can only unblock blocks you initiated).

#### Notification & Subscription Queries

**`notifications`** — User notifications

- **Behavior:** **No blocking check.** Notifications from blocked users (e.g., past friend requests) remain visible.

**`chatEvents` subscription** — Chat event stream

- **Behavior:** **No blocking check.** Events from blocked users in shared chat rooms are still delivered.

### Structural vs Social Content

Blocking distinguishes between two layers of content:

| Layer          | Examples                                                                | Blocking Behavior                                      |
| -------------- | ----------------------------------------------------------------------- | ------------------------------------------------------ |
| **Structural** | Players in game rosters, teams, scores, box scores                      | **Anonymized** — present but identifying fields nulled |
| **Social**     | Player profiles, user profiles, livestreams, game media, search results | **Hidden** — filtered from results entirely            |

Structural data preserves game integrity — a team roster stays intact even if members have blocked each other. Social data is personal content that blocked users should not see at all.

### Field-Level Anonymization

When a blocked user's player appears in a game context (e.g., as a team member or individual participant), the player object is returned with identifying fields set to `null`. Note: direct `player(id)` queries return `null` entirely — anonymization only applies in nested game contexts.

```graphql
# What the viewer sees for a blocked player
{
  id: "123"           # Preserved - structural data
  firstName: null     # Anonymized
  lastName: null      # Anonymized
  age: null           # Anonymized
  height: null        # Anonymized
  weight: null        # Anonymized
  biography: null     # Anonymized
  user: null          # Anonymized - no link to user profile
}
```

The `id` is always preserved so the frontend can still reference the player structurally (e.g., for positioning on a team roster).

**How `user: null` works:** When identifying fields are redacted, the internal `userId` reference is set to `null`. The `Player.user` batch resolver sees `userId == null` and returns `null` — so the blocked player's User profile is unreachable through this path.

### Blocking Summary Table

| Query / Context                 | Behavior                                                                                             |
| ------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `player(id)`                    | **Hidden** — returns `null` for blocked players                                                      |
| `currentPlayer`                 | **Unaffected** — always returns your own full player                                                 |
| `user(id)` / `user(username)`   | **Hidden** — returns `null` for blocked users                                                        |
| `searchUsers`                   | **Hidden** — blocked users excluded from results                                                     |
| `game(id)`                      | **Unaffected** — always returns the game                                                             |
| `games(...)`                    | **Unaffected** — all matching games returned                                                         |
| `friendsActivityFeed`           | **Unaffected** — games with blocked participants still appear                                        |
| `TeamInstance.players`          | **Anonymized** — blocked players in list with null identifying fields                                |
| `IndividualParticipant.player`  | **Anonymized** — blocked player with null identifying fields                                         |
| `Game.livestreams`              | **Hidden** — blocked users' livestreams excluded                                                     |
| `Game.media`                    | **Hidden** — blocked users' media excluded                                                           |
| `basketballBoxScores`           | **Unaffected** — all box scores returned                                                             |
| `chatRoom(id)`                  | **Unaffected** — returned if viewer is a member                                                      |
| `chatRooms`                     | **Unaffected** — all member rooms returned                                                           |
| `directMessageChatRoom(userId)` | **Unaffected** — returns existing DM if it exists                                                    |
| `chatRoom.chatMessages`         | **Unaffected** — all messages returned                                                               |
| `createDirectMessage`           | **Blocked** — returns `UserBlockedError` via result union                                            |
| `createGroupChat`               | **Filtered** — blocked users silently removed from member list                                       |
| `addChatRoomMember`             | **Unaffected** — blocked users can be added                                                          |
| `sendFriendRequest`             | **Blocked** — returns `FriendshipAlreadyExistsError` (status `BLOCKED`) via result union             |
| `blockUser`                     | **Blocked** — returns `UserBlockedYouError` if target already blocked you, `SelfActionError` if self |
| `unblockUser`                   | **Restricted** — `BlockNotFoundError` if no block exists, `UserBlockedYouError` if they blocked you  |

---

## Resources (File Uploads)

### Upload Flow

1. **Phase 1**: Client calls `requestUpload` with file metadata and context -> receives `uploadUrl` and `resourceId`
2. **Client uploads** file bytes directly to the presigned S3 URL
3. **Phase 2**: Client calls `confirmUpload` with the `resourceId` to mark it permanent
   - **Exception**: Chat media is confirmed automatically when `sendChatMessage` is called — skip `confirmUpload`

### Upload Contexts

| Context              | Description                          | Who Can Upload         |
| -------------------- | ------------------------------------ | ---------------------- |
| `userProfilePicture` | Profile picture for the current user | The user themselves    |
| `gameMedia`          | Photos/videos attached to a game     | Any authenticated user |
| `chatMedia`          | File/image sent in a chat message    | Any room member        |

### Resource Authorization

| Operation               | Who Can Do It          | GraphQL                |
| ----------------------- | ---------------------- | ---------------------- |
| Create (request upload) | Any authenticated user | `requestUpload`        |
| Read                    | Any user or anonymous  | via parent type fields |
| Confirm                 | Resource owner only    | `confirmUpload`        |
| Delete                  | Resource owner only    | `deleteResource`       |

**Blocking on reads:** The `Game.media` resolver uses Cerbos PlanResources to filter out resources uploaded by blocked users. `User.profilePicture` and `MediaChatMessage.resource` batch mappings are unaffected by blocking.

---

## Notifications

| Operation    | Who Can Do It                               | GraphQL                           |
| ------------ | ------------------------------------------- | --------------------------------- |
| Query        | Authenticated user (own notifications only) | `notifications(...)`              |
| Mark as read | Authenticated user (own notifications only) | `readNotifications`               |
| Subscribe    | Authenticated user (own events only)        | `notificationEvents` subscription |

### Notification Types

| Type                                | Trigger                               |
| ----------------------------------- | ------------------------------------- |
| `FriendRequestReceivedNotification` | Someone sends you a friend request    |
| `FriendRequestAcceptedNotification` | Someone accepts your friend request   |
| `GameStartedNotification`           | A game you're participating in starts |

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

- Attempting to modify a game you don't organize -> `FORBIDDEN` in GraphQL errors array (Cerbos authorization)
- Attempting to modify finalized results as a participant -> `FORBIDDEN` in GraphQL errors array (Cerbos authorization)
- Attempting to create a DM with a blocked user -> `UserBlockedError` via result union
- Attempting to send a friend request to a blocked user -> `FriendshipAlreadyExistsError` (status `BLOCKED`) via result union
- Attempting to remove an admin as another admin -> `InsufficientRoleError` via result union
- Owner attempting to leave without transferring ownership -> `OwnerCannotLeaveError` via result union
- Attempting to block someone who already blocked you -> `UserBlockedYouError` via result union

---

## Quick Reference Matrix

### Game Operations

| Action                      | Anonymous | Authenticated | Organizer | Participant |
| --------------------------- | --------- | ------------- | --------- | ----------- |
| View game                   | Yes       | Yes           | Yes       | Yes         |
| Create game                 |           | Yes           |           |             |
| Update game                 |           |               | Yes       |             |
| Start/End game              |           |               | Yes       |             |
| Delete game                 |           |               | Yes       |             |
| Add participant (PRIVATE)   |           |               | Yes       |             |
| Add participant (PUBLIC)    |           | Yes           | Yes       |             |
| Self-remove from game       |           |               |           | Yes         |
| Finalize/unfinalize results |           |               | Yes       |             |

### Statistics Operations

| Action          | Organizer | Participant (OPEN, not finalized) | Participant (SELF_REPORT, not finalized) | Participant (finalized) |
| --------------- | --------- | --------------------------------- | ---------------------------------------- | ----------------------- |
| Update scores   | Yes       | Yes                               | Own only                                 | No                      |
| Save box scores | Yes       | Yes                               | Own only                                 | No                      |

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
