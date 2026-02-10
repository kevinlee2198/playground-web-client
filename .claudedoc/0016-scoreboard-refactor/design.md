# 0016 - Scoreboard Refactor Design

## File Structure

```
src/components/game/
├── game-scoreboard.tsx                          [REFACTOR] Factory (~100 lines)
├── scoreboard/
│   ├── basketball-score-display.tsx            [NEW] Basketball display
│   ├── basketball-score-form.tsx               [NEW] Basketball form + schema
│   ├── football-score-display.tsx              [NEW] Football display
│   ├── football-score-form.tsx                 [NEW] Football form + schema
│   ├── tennis-score-display.tsx                [NEW] Tennis table display
│   └── tennis-score-form.tsx                   [NEW] Tennis form + schema
└── score/
    └── game-score.tsx                           [MODIFY] Switch statement cleanup
```

**Note**: `simple-score.tsx` and `tennis-score.tsx` in `score/` should also be reviewed to ensure
they follow consistent patterns with the new scoreboard components. If significant divergence exists,
consider creating a shared component directory or aligning naming/patterns.

## Component Hierarchy

```
GameScoreboard (factory, holds isEditing state)
├── Card wrapper (always rendered)
│   ├── CardHeader with title + edit pencil button
│   └── CardContent
│       ├── [display mode] switch(sportType):
│       │   ├── BASKETBALL → BasketballScoreDisplay
│       │   ├── FOOTBALL → FootballScoreDisplay
│       │   └── TENNIS → TennisScoreDisplay
│       └── [edit mode] switch(sportType):
│           ├── BASKETBALL → BasketballScoreForm
│           ├── FOOTBALL → FootballScoreForm
│           └── TENNIS → TennisScoreForm
```

## Props Interfaces

### Factory

```typescript
// game-scoreboard.tsx
interface GameScoreboardProps {
  game: GameDetail;
}
```

### Display Components

```typescript
// Shared interface for basketball and football display
interface SimpleScoreDisplayProps {
  nameA: string;
  nameB: string;
  metadataA: ParticipantMetadata | null;
  metadataB: ParticipantMetadata | null;
}

// Tennis display
interface TennisScoreDisplayProps {
  nameA: string;
  nameB: string;
  metadataA: ParticipantMetadata | null;
  metadataB: ParticipantMetadata | null;
}
```

### Form Components

```typescript
// Shared interface for basketball and football forms
interface SimpleScoreFormProps {
  sportType: SportType.BASKETBALL | SportType.FOOTBALL;
  participantA: GameParticipantDetail;
  participantB: GameParticipantDetail;
  nameA: string;
  nameB: string;
  onSuccess: () => void;
  onCancel: () => void;
}

// Tennis form
interface TennisScoreFormProps {
  participantA: GameParticipantDetail;
  participantB: GameParticipantDetail;
  nameA: string;
  nameB: string;
  bestOf: number;
  onSuccess: () => void;
  onCancel: () => void;
}
```

## Zod Schemas

### Basketball / Football

```typescript
const simpleScoreSchema = z.object({
  scoreA: z.number().int("Must be a whole number").min(0, "Must be non-negative"),
  scoreB: z.number().int("Must be a whole number").min(0, "Must be non-negative"),
});
```

### Tennis

```typescript
const tennisSetSchema = z.object({
  gamesWonA: z.number().int().min(0).max(7, "Cannot exceed 7"),
  gamesWonB: z.number().int().min(0).max(7, "Cannot exceed 7"),
  tiebreakPointsA: z.number().int().min(0).nullable(),
  tiebreakPointsB: z.number().int().min(0).nullable(),
}).refine((data) => {
  // Tiebreak validation: only on 7-6 or 6-7 sets
  const is76 = data.gamesWonA === 7 && data.gamesWonB === 6;
  const is67 = data.gamesWonA === 6 && data.gamesWonB === 7;

  if (!is76 && !is67) {
    // No tiebreak allowed
    return data.tiebreakPointsA === null && data.tiebreakPointsB === null;
  }

  // On a tiebreak set, the losing player (with 6 games) has tiebreak points
  if (is76) {
    return data.tiebreakPointsB !== null && data.tiebreakPointsA === null;
  }
  // is67
  return data.tiebreakPointsA !== null && data.tiebreakPointsB === null;
}, { message: "Tiebreak points only valid on 7-6 sets, assigned to losing player" });

const createTennisScoreSchema = (bestOf: number) =>
  z.object({
    sets: z.array(tennisSetSchema)
      .min(1, "At least one set required")
      .max(bestOf, `Cannot exceed ${bestOf} sets`),
  });
```

## Factory Implementation

```typescript
export function GameScoreboard({ game }: GameScoreboardProps) {
  const t = useTranslations();
  const [isEditing, setIsEditing] = useState(false);

  const participants = game.participants.edges.map((e) => e.node);
  const canEdit = game.gameStatus === GameStatus.IN_PROGRESS ||
                  game.gameStatus === GameStatus.COMPLETE;

  if (participants.length < 2) {
    // early return: not enough participants
  }

  const [participantA, participantB] = participants;
  const nameA = getParticipantName(participantA);
  const nameB = getParticipantName(participantB);

  const handleSuccess = () => setIsEditing(false);
  const handleCancel = () => setIsEditing(false);

  const renderContent = () => {
    switch (game.sportType) {
      case SportType.BASKETBALL:
        return isEditing ? (
          <BasketballScoreForm
            sportType={SportType.BASKETBALL}
            participantA={participantA} participantB={participantB}
            nameA={nameA} nameB={nameB}
            onSuccess={handleSuccess} onCancel={handleCancel}
          />
        ) : (
          <BasketballScoreDisplay
            nameA={nameA} nameB={nameB}
            metadataA={participantA.metadata} metadataB={participantB.metadata}
          />
        );
      case SportType.FOOTBALL:
        return isEditing ? (
          <FootballScoreForm ... />
        ) : (
          <FootballScoreDisplay ... />
        );
      case SportType.TENNIS:
        return isEditing ? (
          <TennisScoreForm
            participantA={participantA} participantB={participantB}
            nameA={nameA} nameB={nameB}
            bestOf={game.metadata.__typename === "TennisGameMetadata" ? game.metadata.bestOf : 3}
            onSuccess={handleSuccess} onCancel={handleCancel}
          />
        ) : (
          <TennisScoreDisplay ... />
        );
      default:
        return null;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{t("game.scoreboard.title")}</CardTitle>
        {canEdit && !isEditing && (
          <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent>{renderContent()}</CardContent>
    </Card>
  );
}
```

## Form Submission Flow

1. User edits values in form fields
2. Zod validates on blur (field-level errors shown inline)
3. User clicks Save → `form.handleSubmit()` runs
4. Zod validates entire form
5. If valid, `onSubmit` callback:
   a. Builds `UpdateParticipantScoreEntry[]` from form values
   b. Wraps `updateParticipantScores(entries)` in `startTransition`
   c. On success: `toast.success()`, calls `onSuccess()` prop
   d. On error: `toast.error()`, sets form-level error state
6. Factory receives `onSuccess` → sets `isEditing = false`
7. `revalidatePath` in server action causes page re-render with fresh data

## Helper Functions

```typescript
// Shared across basketball/football display + form
function extractSimpleScore(metadata: ParticipantMetadata | null): number | null {
  if (!metadata) return null;
  if (metadata.__typename === "BasketballParticipantMetadata" ||
      metadata.__typename === "FootballParticipantMetadata") {
    return metadata.score;
  }
  return null;
}

// In factory
function getParticipantName(participant: GameParticipantDetail): string {
  if (participant.__typename === "TeamInstance") return participant.name;
  return `${participant.player.firstName} ${participant.player.lastName}`;
}
```

## i18n Keys to Add

Add to `messages/en.json` under `game.scoreboard` or `game.errors`:
- `game.errors.scoreNonNegative`: "Score must be non-negative"
- `game.errors.scoreMustBeInteger`: "Score must be a whole number"
- `game.errors.gamesWonMax`: "Games won cannot exceed 7"
- `game.errors.tiebreakInvalid`: "Tiebreak points only valid on 7-6 sets, assigned to losing player"
- `game.errors.atLeastOneSet`: "At least one set is required"
- `game.errors.maxSets`: "Cannot exceed maximum number of sets"

## Build Sequence

1. Create `scoreboard/` directory
2. Create basketball display + form components
3. Create football display + form components
4. Create tennis display + form components
5. Refactor `game-scoreboard.tsx` to factory pattern
6. Update `game-score.tsx` to use switch statement
7. Add i18n keys
8. Run build + lint to verify
