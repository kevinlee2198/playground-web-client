# 0016 - Scoreboard Refactor Requirements

## Problem Statement

The current `GameScoreboard` component (`src/components/game/game-scoreboard.tsx`) is a 675-line monolith that:
1. Handles all sport types (basketball, football, tennis) with deeply nested ternaries
2. Uses raw `useState` with no validation for score editing — state is not synced with props after save, causing the "score updates don't work" bug
3. Mixes display, editing, state management, and server action logic in one file
4. Cannot accommodate sport subtype variations (e.g., basketball "21" where N individual players each have their own score vs 5v5 with two team scores)

## Goals

1. **Factory pattern**: Refactor `GameScoreboard` into a factory that switches on sport type and delegates to sport-specific components
2. **Separate display and form components**: Each sport gets its own display component and form component for clean separation of concerns
3. **TanStack Forms + Zod validation**: Replace raw `useState` editing with proper form management and strict validation
4. **Fix the score update bug**: By using TanStack Forms with `defaultValues` derived from props, state will always be in sync
5. **Future-proof for subtypes**: Separate files per sport allow divergence when subtypes (e.g., basketball "21") need different UIs without modifying existing components

## Functional Requirements

### FR-1: Factory Component (GameScoreboard)
- The factory holds the `isEditing` state and renders the Card wrapper with title and edit button
- Uses a `switch` statement on `sportType` to delegate to sport-specific display or form components
- Edit button shown only when `gameStatus === IN_PROGRESS || COMPLETE`
- Scoreboard shown only when `gameStatus !== SCHEDULED`
- Passes `onSuccess` and `onCancel` callbacks to form components

### FR-2: Basketball Score Display
- Shows two participant names with scores in large text format (e.g., `78 - 65`)
- Handles null metadata gracefully (show "-")

### FR-3: Basketball Score Form
- Inline editing (replaces display in-place when editing)
- Two number inputs (one per participant) labeled with participant names
- Zod validation: scores must be non-negative integers
- Submits via existing `updateParticipantScores` server action with `{ basketball: { score } }` metadata
- Shows field-level validation errors, form-level server errors, and toast notifications
- Cancel and Save buttons with loading state via `useTransition`

### FR-4: Football Score Display
- Same visual structure as basketball (two participants, simple scores)
- Handles null metadata gracefully

### FR-5: Football Score Form
- Same structure as basketball form
- Submits with `{ football: { score } }` metadata key

### FR-6: Tennis Score Display
- Table format showing player names, sets won, and per-set scores
- Tiebreak notation: `7-6(3)` where the losing player's tiebreak points are shown in parentheses
- Handles null metadata and empty sets array

### FR-7: Tennis Score Form
- Table-based inline editing with dynamic set management (add/remove sets)
- Per-set inputs: games won (per player) and tiebreak points (per player)
- Strict Zod validation:
  - Games won: integer, 0-7
  - Tiebreak points: non-negative integer or null, only valid when set score is 7-6 or 6-7
  - Tiebreak points assigned to the losing player (the one with 6 games)
  - Set count limited to `bestOf` from game metadata
  - At least one set required
- Auto-calculates `setsWon` from set data before submission
- Submits with `{ tennis: { setsWon, sets } }` metadata

### FR-8: GameScore Factory Cleanup
- Convert `game-score.tsx` from if-else chains to switch statement
- `simple-score.tsx` and `tennis-score.tsx` should also be reviewed and adjusted to follow consistent patterns with the new scoreboard components

### FR-9: Error Handling
- Field-level: Zod validation on blur, displayed via `FieldError`
- Form-level: Server action errors via `useState` + error alert block
- Toast: Success/error toasts via `sonner`

## Non-Functional Requirements

### NFR-1: Codebase Conventions
- Follow existing TanStack Forms patterns (see `basketball-box-score-form.tsx`, `update-player-form.tsx`)
- Use `FormTextField` and other shared form field components from `form-field.tsx`
- Use shadcn/BaseUI components (Card, Table, Input, Button)
- All user-facing text via `useTranslations()` from next-intl
- TypeScript strict mode

### NFR-2: Future Extensibility
- Each sport has its own files so subtypes can diverge (e.g., basketball "21" = N individual scores)
- Adding a new sport or subtype means adding new component files and a case to the switch — no existing components modified

## Out of Scope
- Adding new sport subtypes (e.g., basketball "21") — this refactor prepares the architecture for it
- Optimistic updates — wait for server confirmation before exiting edit mode
- Box score integration changes
