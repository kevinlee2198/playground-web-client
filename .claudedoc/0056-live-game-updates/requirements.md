# Live Game Updates — Requirements

**Date**: 2026-03-16
**Status**: Approved
**Branch**: 0056-live-game-updates

## Overview

When a user is viewing the game detail page (`/game/[id]`), the page subscribes to real-time events via WebSocket and updates the UI live — no refresh needed. This follows a **spectator model**: anyone viewing the game receives updates, regardless of whether they are a participant.

## Subscription Lifecycle

### When to Subscribe

- Subscribe for **all game statuses** (SCHEDULED, IN_PROGRESS, COMPLETE). A SCHEDULED game can start while the user is viewing it, and a COMPLETE game can be unfinalized.
- Subscribe when the game detail page mounts; unsubscribe on unmount.

### Initial Data

- The server renders the page with the latest data from an authenticated GraphQL query.
- The WebSocket subscription picks up from that point forward.
- Every event carries the full `game: Game!` object, so any events missed between server fetch and subscription establishment are self-correcting — the next event received will contain the complete current state.

## Events & UI Behavior

The backend `gameEvents(gameId: ID!)` subscription emits the following events. Each event includes `game: Game!` (the full updated game) and `occurredAt: DateTime!`.

### Status Events

| Event | UI Effect |
|-------|-----------|
| `GameStartedEvent` | Hero transitions from scheduled display to live score block with breathing terracotta dot. Action bar updates (e.g., "Start Game" → "End Game"). Live styling applied (warmer cream, terracotta border tint). |
| `GameEndedEvent` | Breathing dot and live styling removed. Status pill changes to "Final". Action bar updates. |
| `GameResultsFinalizedEvent` | Score edit buttons become disabled (not hidden — removing buttons without explanation is confusing). A "Results Finalized" badge appears near the score block. |
| `GameResultsUnfinalizedEvent` | Score edit buttons are restored. Finalization indicator removed. |

No toast is shown for status transitions. However, a visually hidden `aria-live="polite"` region should announce key transitions for screen reader users (e.g., "Game is now live", "Game has ended — Final score: Lakers 98, Celtics 95").

### Score Events

| Event | UI Effect |
|-------|-----------|
| `GameScoreUpdatedEvent` | Score numbers update with animation: subtle scale `1.0 → 1.05 → 1.0` cross-fade over `600ms` with bounce easing. Score block background pulses once (deep cream → slightly warmer → deep cream). ARIA live region announces the updated score for screen readers. |

The event includes `participant: GameParticipant!` identifying which participant's score changed.

### Participant Events

| Event | UI Effect |
|-------|-----------|
| `GameParticipantAddedEvent` | Participant appears in the participants section in place. A visually hidden `aria-live="polite"` region announces the change (e.g., "Team Alpha joined the game"). Event includes `participant: GameParticipant!`. |
| `GameParticipantRemovedEvent` | Participant is removed from the participants section in place. A visually hidden `aria-live="polite"` region announces the change. Event includes `participantId: ID!`. |

### Roster Events

| Event | UI Effect |
|-------|-----------|
| `TeamRosterUpdatedEvent` | Team member list updates in place. Event includes `teamInstance: TeamInstance!`. |

### Box Score Events

| Event | UI Effect |
|-------|-----------|
| `BoxScoreSavedEvent` | Box score table updates live with the new data. Event includes `basketballBoxScores: [BasketballBoxScore!]!`. |

## Score Editing Conflict

When a live `GameScoreUpdatedEvent` arrives while the user has the inline score edit form open:

- **Suppress the update** — do not overwrite the form or close it.
- When the user saves or cancels the form, apply the latest game state from the most recent event.

Rationale: users editing scores are typically game organizers making deliberate corrections. Interrupting mid-edit is disruptive.

## Connection Loss

When the WebSocket connection drops while viewing a game:

- Show an **amber banner at the top of the game detail page content** (not fixed/sticky — positioned in the page flow, above the hero).
- Banner text: "Connection lost. Reconnecting…"
- Banner style: warm amber background (`--accent-gold`), Nunito 400 text. Not alarming red. Must have sufficient contrast in both light and dark mode.
- **Auto-dismiss only** when the connection is restored. No manual dismiss button — hiding the banner while disconnected would mask a real problem.
- Auto-reconnect is handled by the existing WebSocket client (exponential backoff, max 30s delay).
- On reconnection, the banner dismisses and the next event received brings the full current game state.

## Animation & Motion

### Score Update Animation

- Number cross-fade with subtle scale `1.0 → 1.05 → 1.0` over `--duration-gentle` (600ms) with `--ease-bounce` (`cubic-bezier(0.34, 1.56, 0.64, 1)`).
- Score block background pulses once: deep cream → slightly warmer → deep cream via `background-color` transition.
- Only animate compositor-friendly properties (`transform`, `opacity`) for the score pop. List transition properties explicitly — never use `transition: all`.

### Reduced Motion

- All animations respect `prefers-reduced-motion: reduce`.
- When reduced motion is preferred: numbers swap instantly without animation. Breathing dots become static colored dots. No background pulse.

## Debouncing

Rapid-fire events (e.g., multiple score updates in quick succession during a basketball game) should be **throttled** (not debounced — users want regular updates, not waiting for a quiet period). Buffer incoming events and apply the latest state at a fixed interval of **300ms**. This means at most ~3 UI updates per second during rapid activity.

## Accessibility

- Score displays use `aria-live="polite"` and `aria-atomic="true"` (already present in the codebase).
- When a score updates, the screen reader announces the full context: e.g., "Lakers 98, Celtics 95, Third quarter".
- The connection loss banner should have `role="alert"` for screen reader announcement.
- The breathing dot animation has `aria-hidden="true"` (already present).
- A single visually hidden `aria-live="polite"` announcer region handles status transition and participant change announcements.

## Background Tab Behavior

When the browser tab is backgrounded (`document.hidden`), the subscription remains active but UI updates are paused. On tab focus, apply the latest buffered game state in a single update to avoid animation storms.

## Out of Scope

- **Live score ticker on feed** — requires `liveGamesForFriends` query (not in the backend schema yet).
- **Live updates on game cards in lists/feed** — would require subscribing to every visible game individually.
- **Post-game celebration card** — separate feature, stretch goal for later.
- **Offline/cached feed** — separate feature (design-addendum Section 27).

## Technical Context

### Existing Infrastructure

- **WebSocket client**: `src/lib/graphql-ws-client.ts` — singleton, auth via Bearer token, exponential backoff retry.
- **Subscription hook patterns**: `src/hooks/use-chat-subscription.ts` and `src/hooks/use-notification-subscription.ts` provide reference implementations.
- **Game detail page**: `src/app/[locale]/game/[id]/page.tsx` — currently a server component with one-time `authQuery` fetch.
- **Live UI indicators**: Breathing dot, terracotta styling, ARIA live regions already exist in game components.
- **GraphQL**: Uses `json-to-graphql-query` library. Queries built as objects, not strings.

### Backend API

```graphql
type Subscription {
  gameEvents(gameId: ID!): GameEvent!
}

interface GameEvent {
  game: Game!
  occurredAt: DateTime!
}

# Status events
type GameStartedEvent implements GameEvent { ... }
type GameEndedEvent implements GameEvent { ... }
type GameResultsFinalizedEvent implements GameEvent { ... }
type GameResultsUnfinalizedEvent implements GameEvent { ... }

# Score events
type GameScoreUpdatedEvent implements GameEvent {
  game: Game!
  occurredAt: DateTime!
  participant: GameParticipant!
}

# Participant events
type GameParticipantAddedEvent implements GameEvent {
  game: Game!
  occurredAt: DateTime!
  participant: GameParticipant!
}
type GameParticipantRemovedEvent implements GameEvent {
  game: Game!
  occurredAt: DateTime!
  participantId: ID!
}

# Roster events
type TeamRosterUpdatedEvent implements GameEvent {
  game: Game!
  occurredAt: DateTime!
  teamInstance: TeamInstance!
}

# Box score events
type BoxScoreSavedEvent implements GameEvent {
  game: Game!
  occurredAt: DateTime!
  basketballBoxScores: [BasketballBoxScore!]!
}
```

The subscription does not require the subscriber to be a participant — anyone viewing the game can subscribe.
