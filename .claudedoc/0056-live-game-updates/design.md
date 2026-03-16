# Live Game Updates — Design

**Date**: 2026-03-16
**Status**: Approved (revised after adversarial review + Vercel best practices audit)
**Parent**: `requirements.md`
**Approach**: Minimal change with pure reducer (Approach A + reducer from B)

## Architecture Overview

A single `GameLiveContext` provides live game state to existing Client Components. The subscription hook handles transport, throttling, and tab-visibility. A pure reducer handles event-to-state transformations. Server Components stay Server Components where possible; `GameBoxScores` converts to Client.

## Review Fixes Applied

Issues identified by adversarial review and Vercel React best practices audit:

1. **GameDetailHero SCHEDULED→IN_PROGRESS transition** (Critical): `GameDetailHero` is a Server Component with baked-in conditional rendering. When `GameStartedEvent` arrives, the hero can't re-render. Fix: extract the conditional content area into a new `GameHeroContent` Client Component that reads from context and handles the SCHEDULED/IN_PROGRESS/COMPLETE branching reactively.

2. **Trailing throttle drops intermediate event types** (Critical): The 300ms trailing throttle only keeps the last event, dropping earlier events of different types. Fix: the reducer now **always merges common game fields** (`gameStatus`, `resultsFinalized`, `viewerGameRole`, `visibility`, `participants`, `metadata`) from `event.game` before applying event-specific logic. Any single event carries the full game state, making the trailing throttle safe.

3. **`resultsFinalized` missing from types and query** (Critical): The field exists in the schema but not in `GameDetail` or the page query. Fix: add `resultsFinalized: boolean` to `GameDetail` and `GameNode`, add it to the page query, and wire it into `canEdit` logic.

4. **`revalidatePath` conflicts with reducer state** (High): Server actions re-render the page but `useReducer` ignores new props after mount. Fix: add a `SYNC_FROM_SERVER` reducer action dispatched via `useEffect` when the `game` prop reference changes.

5. **Score edit form stuck on finalization** (High): If `GameResultsFinalizedEvent` fires while editing, the form stays open but saves will always fail. Fix: `GameScoreBlock` watches `resultsFinalized` from context and force-closes the form with a toast when it becomes true.

6. **Connection loss fires before first connection** (High): `client.on("closed")` fires on initial connection failure. Fix: guard with `hasEverConnected` flag — only dispatch `CONNECTION_LOST` after at least one successful connection.

7. **Box score data shape mismatch** (Medium): `BoxScoreSavedEvent` carries a flat `BasketballBoxScoreNode[]` but state stores `{ node: BasketballBoxScoreNode }[]`. Fix: the reducer wraps each incoming box score in `{ node: ... }` before upserting.

8. **`statusPill` removal breaks SCHEDULED display** (Medium): The hero's SCHEDULED branch also renders `statusPill`. Fix: keep `statusPill` in `GameDetailHero` for the SCHEDULED path only; the new `GameHeroContent` Client Component handles the IN_PROGRESS/COMPLETE status badge reactively.

9. **`currentPlayerId` not routed through `GameDetailClient`** (Medium): Fix: add `currentPlayerId` to `GameDetailClient` props and pass it to `GameParticipants`.

10. **Vercel `server-serialization`**: Avoid passing the full `GameDetail` twice. The page passes `game` once to `GameDetailClient`; child components read from context, not from separate props.

## Files to Create (5)

### 1. `src/lib/types/game-event.ts`

Event type definitions following the `notification.ts` catch-all pattern:

- `GameEventBase` — `{ occurredAt: string; game: GameEventGame }` where `GameEventGame` contains live-changing fields: `id`, `gameStatus`, `resultsFinalized`, `viewerGameRole`, `visibility`, `participants` (with edges), `metadata`
- 9 concrete event interfaces with `__typename` literals:
  - `GameStartedEvent`, `GameEndedEvent`, `GameResultsFinalizedEvent`, `GameResultsUnfinalizedEvent` — status-only
  - `GameScoreUpdatedEvent` — `participant: GameParticipantDetail`
  - `GameParticipantAddedEvent` — `participant: GameParticipantDetail`
  - `GameParticipantRemovedEvent` — `participantId: number`
  - `TeamRosterUpdatedEvent` — `teamInstance: TeamInstanceDetail`
  - `BoxScoreSavedEvent` — `basketballBoxScores: BasketballBoxScoreNode[]`
- `KnownGameEvent` — union of all 9
- `GameEvent` — `KnownGameEvent | (GameEventBase & { __typename: string })`
- `isKnownGameEventType()` — type guard

### 2. `src/hooks/use-game-subscription.ts`

Mirrors `use-chat-subscription.ts` pattern with these differences:

- **Dynamic query**: `gameEvents(gameId)` requires a runtime argument. Build the query string via `useMemo(() => jsonToGraphQLQuery({...}), [gameId])` inside the hook (not at module scope).
- **Throttle**: 300ms trailing throttle via `latestEventRef` + `setTimeout`. Each incoming event replaces `latestEventRef.current` and resets the timer. When the timer fires, call `onEventRef.current(latestEventRef.current)`. Safe because the reducer always merges the full `event.game` state regardless of event type.
- **Tab visibility**: `visibilitychange` listener inside the subscription effect. When `document.hidden`, set `isPausedRef = true` — events still land in `latestEventRef` but the timer doesn't fire. On visibility restore, flush `latestEventRef` immediately.
- **Connection loss**: Use `client.on("closed")` → `onConnectionLostRef.current()` and `client.on("connected")` (after first) → `onReconnectRef.current()`. Guard `closed` handler with `hasEverConnected` flag — only fire `onConnectionLost` after at least one successful connection.
- **No disposal**: Like the chat hook, does not call `disposeGraphQLWsClient()` — the notification hook owns that lifecycle.
- **Callback refs**: Store `onEvent`, `onConnectionLost`, `onReconnect` in refs (existing pattern from `use-chat-subscription.ts`). This prevents effect re-subscription on callback changes per Vercel `advanced-event-handler-refs` pattern.

Hook signature:
```typescript
useGameSubscription({
  gameId: number;
  enabled: boolean;
  onEvent: (event: GameEvent) => void;
  onConnectionLost?: () => void;
  onReconnect?: () => void;
})
```

Subscription query uses inline fragments with `__on` for all 9 event types. Reuses `participantDetailNodeFragment` for participant payloads, `gameMetadataFragment` for the `game` field, and `playerRefFragment` for team instances.

The `game` field on every event requests: `id`, `gameStatus`, `resultsFinalized`, `viewerGameRole`, `visibility`, `participants` (with `participantDetailNodeFragment`), `metadata` (with `gameMetadataFragment`). Fields that don't change live (`description`, `startDate`, `endDate`, `sportType`, `location`, `media`) are NOT requested — they are preserved from the initial SSR fetch.

### 3. `src/components/game/live/game-live-reducer.ts`

Pure reducer function — no React imports, fully unit-testable.

**State shape:**
```typescript
interface LiveGameState {
  game: GameDetail;
  boxScores: { node: BasketballBoxScoreNode }[];
  isConnected: boolean;
}
```

**Actions:** `GAME_EVENT` (wraps a `KnownGameEvent`), `CONNECTION_LOST`, `RECONNECTED`, `SYNC_FROM_SERVER`.

**Common merge first, then event-specific logic:**

For every `GAME_EVENT` action, the reducer FIRST merges common game fields from `event.game` into `state.game`:
```typescript
const mergedGame = {
  ...state.game,
  gameStatus: event.game.gameStatus,
  resultsFinalized: event.game.resultsFinalized,
  viewerGameRole: event.game.viewerGameRole,
  visibility: event.game.visibility,
  participants: event.game.participants,
  metadata: event.game.metadata,
};
```

THEN applies event-specific logic on top:
- `BoxScoreSavedEvent`: upsert box score entries by `node.player.id`, wrapping each incoming `BasketballBoxScoreNode` in `{ node: ... }` to match the state shape
- `CONNECTION_LOST`: `isConnected = false`
- `RECONNECTED`: `isConnected = true`
- `SYNC_FROM_SERVER`: fully replace `game` and `boxScores` from the action payload (used when `revalidatePath` delivers fresh server data)

Since the common merge already handles participants and game status from the full `event.game` object, event-specific handlers for score updates, participant add/remove, roster updates, and status changes become no-ops — the common merge is sufficient. Only `BoxScoreSavedEvent` needs additional handling for box scores.

### 4. `src/components/game/live/game-hero-content.tsx`

New Client Component that replaces the conditional content area inside `GameDetailHero`. This solves the critical issue where the Server Component's SCHEDULED/IN_PROGRESS branching is baked at SSR time.

Responsibilities:
- Reads `game` from `GameLiveContext` (with fallback to prop for SSR)
- Handles the SCHEDULED vs IN_PROGRESS/COMPLETE branching reactively
- When SCHEDULED: renders the formatted date and status badge
- When IN_PROGRESS/COMPLETE: renders `<GameScoreBlock>` with a derived status pill
- The status pill (badge with breathing dot for live games) is rendered here, not in `GameDetailHero`

This component receives `formattedDate` as a prop from `GameDetailHero` (which has access to server-side `getFormatter()`), so it doesn't need to duplicate date formatting.

### 5. `src/components/game/live/game-detail-client.tsx`

The single Client Component wrapper. Responsibilities:

1. **State**: Holds `useReducer(gameLiveReducer, initialState)` seeded from props using lazy initialization (`() => createInitialState(game, initialBoxScores)`) per Vercel `rerender-lazy-state-init`
2. **Subscription**: Calls `useGameSubscription` with event dispatch, connection loss/reconnect handlers
3. **Context**: Provides `GameLiveContext` to all children
4. **Prop sync**: `useEffect` watches the `game` prop and dispatches `SYNC_FROM_SERVER` when it changes (handles `revalidatePath` from server actions)
5. **Connection banner**: Renders amber `role="alert"` banner when `state.isConnected === false`
6. **Announcer**: Renders visually hidden `aria-live="polite"` region for status/participant change announcements
7. **Children**: Renders `GameDetailActions`, `GameParticipants`, `GameBoxScores` (now client) using `state.game` and `state.boxScores`. Passes `currentPlayerId` to `GameParticipants`.

The page passes `<GameDetailHero>` as `children` — the Server Component renders inside this Client Component via the standard RSC composition pattern.

**Context shape:**
```typescript
interface GameLiveContextValue {
  game: GameDetail;
  boxScores: { node: BasketballBoxScoreNode }[];
  isConnected: boolean;
}
```

Default is `null`. A `useGameLiveContext()` helper returns `null` when outside the provider (for components like `GameScoreBlock` that may render in game cards without the live provider).

## Files to Modify (7)

### 1. `src/lib/types/game.ts`

- Add `resultsFinalized: boolean` to `GameDetail` interface
- Add `resultsFinalized: boolean` to `GameNode` interface

### 2. `src/app/[locale]/game/[id]/page.tsx`

- Add `resultsFinalized: true` to the game query
- Move box score fetch from `GameBoxScores` into the page (same query, guarded by `sportType === BASKETBALL`). The box score fetch depends on `game.id`, so it must be sequential after the game fetch (not parallelizable).
- Replace the current JSX body with `<GameDetailClient>` wrapper
- Pass `<GameDetailHero>` as `children` (RSC composition)
- Pass `game`, `initialBoxScores`, `playerId`, `canUpload`, `locationText` as props
- Remove `Suspense`/`GameBoxScoresSkeleton` (no longer needed)

### 3. `src/components/game/game-detail-hero.tsx`

- Remove `statusPill` local variable and the `<GameScoreBlock game={game} statusPill={statusPill} />` call
- Replace the conditional content area (SCHEDULED vs IN_PROGRESS/COMPLETE) with `<GameHeroContent>`, passing `game`, `formattedDate`
- Keep the static wrapper (sport gradient section, sport emoji pill, description, venue/date metadata) as Server Component
- The SCHEDULED branch's status badge stays here (server-rendered, static for scheduled games)

### 4. `src/components/game/game-score-block.tsx`

- Import `useGameLiveContext` (null-safe — returns `null` outside provider)
- Read `liveGame` from context when available, fall back to `game` prop
- Score suppression is implicit: when `isEditing === true`, the form renders. On close, `GameScore` re-renders from context which already holds the latest state. No buffering needed.
- Add a `useEffect` watching `liveGame?.resultsFinalized`: if it becomes `true` while `isEditing`, force-close the form and show a toast ("Results have been finalized. Your edits were not saved.")
- Update `canEdit` to check `!game.resultsFinalized`

### 5. `src/components/game/game-box-scores.tsx`

- Add `"use client"` directive
- Remove `async` keyword and the `authQuery` call
- Accept `boxScores` and `game` as props (or read from `GameLiveContext`)
- Retain all rendering logic (`groupByTeam`, `CollapsibleBoxScore`, `BasketballBoxScoreTable`) unchanged

### 6. `src/components/game/game-participants.tsx`

- Import `useGameLiveContext` (null-safe)
- Use `liveGame` from context when available, fall back to `game` prop

### 7. `messages/en.json`

Add under `game`:
```json
"live": {
  "connectionLost": "Connection lost. Reconnecting\u2026",
  "gameStarted": "Game is now live",
  "gameEnded": "Game has ended",
  "resultsFinalized": "Results have been finalized",
  "resultsUnfinalized": "Results have been unfinalized",
  "participantAdded": "{name} joined the game",
  "participantRemoved": "A participant left the game",
  "resultsFinalizedWhileEditing": "Results have been finalized. Your edits were not saved."
}
```

## Data Flow

```
WebSocket (graphql-ws)
  └─ useGameSubscription
       ├─ 300ms trailing throttle (safe: reducer merges full game state from any event)
       ├─ tab-visibility pause/flush
       ├─ onConnectionLost → dispatch(CONNECTION_LOST)  [guarded by hasEverConnected]
       └─ onReconnect → dispatch(RECONNECTED)
            └─ onEvent → dispatch(GAME_EVENT, event)
                  └─ gameLiveReducer
                       ├─ ALWAYS merge common game fields from event.game
                       └─ THEN apply event-specific logic (only BoxScoreSavedEvent needs extra handling)
                            └─ new LiveGameState
                                 └─ GameLiveContext
                                      ├─ GameHeroContent (SCHEDULED↔live branching + status pill)
                                      ├─ GameScoreBlock (live scores + animation + finalization guard)
                                      ├─ GameDetailActions (live start/end buttons)
                                      ├─ GameParticipants (live roster)
                                      ├─ GameBoxScores (live stats)
                                      ├─ ConnectionBanner (amber alert)
                                      └─ Announcer (sr-only aria-live)

Server Action (e.g., startGame) → revalidatePath → new page props
  └─ GameDetailClient receives new `game` prop
       └─ useEffect detects prop change
            └─ dispatch(SYNC_FROM_SERVER, { game, boxScores })
                 └─ reducer replaces full state
```

## Score Suppression (Implicit)

`GameScoreBlock` toggles between score display and score form via `isEditing` state. When `isEditing === true`, the form renders and the score display is unmounted. Context always holds the latest game state from subscription events. When the user saves or cancels (setting `isEditing = false`), `GameScore` re-mounts and reads the current context value — which already reflects the latest subscription data. No explicit buffering, no pending state, no reducer flag needed.

**Exception:** If `resultsFinalized` becomes `true` while editing, the form is force-closed with a toast. This prevents the user from submitting a form that will always be rejected by the backend.

## Key Decisions

1. **`GameHeroContent` Client Component** — Extracts the conditional SCHEDULED/IN_PROGRESS/COMPLETE branching from the Server Component `GameDetailHero` into a Client Component that reads from context. The static hero wrapper stays a Server Component.
2. **Pure reducer with common-first merge** — Every event merges the full `event.game` state before event-specific handling. This makes the trailing throttle safe and eliminates the need for per-event-type state merge logic (except box scores).
3. **Single context** — All consumers re-render on any event. Acceptable because the game detail page has a bounded number of consumers (~6) and events are throttled to max 3/second.
4. **`GameBoxScores` converts to Client** — The Suspense boundary + second fetch is replaced by props from the page. Net reduction in complexity.
5. **`SYNC_FROM_SERVER` action** — Handles `revalidatePath` after server actions by syncing fresh server data into the reducer.
6. **`hasEverConnected` guard** — Connection loss banner only shows after a successful connection, not on initial connection failure.
7. **No new npm packages** — Everything uses existing `graphql-ws`, `json-to-graphql-query`, and React primitives.

## Build Sequence

1. Add `resultsFinalized` to `GameDetail`/`GameNode` types and page query
2. Types (`game-event.ts`)
3. Reducer (`game-live-reducer.ts`) + unit tests
4. Subscription hook (`use-game-subscription.ts`)
5. `GameHeroContent` Client Component (`game-hero-content.tsx`)
6. Client wrapper + context (`game-detail-client.tsx`)
7. Convert `GameBoxScores` to Client Component
8. Modify `GameScoreBlock` (context consumption + finalization guard)
9. Modify `GameDetailHero` (extract conditional content to `GameHeroContent`)
10. Modify `GameParticipants` (context consumption)
11. Rewire page (`page.tsx`)
12. i18n strings (`en.json`)
13. QA: `npm run build && npm run lint && npm test`
