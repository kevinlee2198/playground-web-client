---
name: add-sport-type
description: Step-by-step guide for adding a new sport type to the Playground app. Use this skill whenever the user wants to add a new sport (e.g., volleyball, wiffleball, soccer, track & field, swimming) or asks about what's involved in supporting a new sport. Also trigger when the user mentions "new sport", "add sport", "sport type", or discusses expanding the app to cover additional sports. This includes adding per-player stats for an existing sport.
---

# Adding a New Sport Type

Adding a sport requires changes across the full stack of the frontend app: GraphQL schema, TypeScript types, constants, translations, CSS theming, UI components, forms, score display, and tests. This skill walks through every file and pattern involved.

## Pre-Flight Check: What Already Exists?

Before starting, determine what already exists for this sport. Many sports have partial support — the backend schema may already define the types, or basic game support may be in place without stats.

**Quick check sequence:**
1. Search `schema.graphqls` for the sport name — are types already defined?
2. Check `src/lib/constants.ts` — is the sport in the `SportType` enum?
3. Check `src/lib/types/game.ts` — do metadata interfaces exist?
4. Check `src/components/game/sport-icon.tsx` — is the sport in the `sportPaths` lookup?
5. Check `src/components/game/score/game-score.tsx` — is there a case for this sport?
6. Check `src/components/game/create-game-form.tsx` — is there a branch for this sport?
7. Check `src/lib/types/stats/` — does a stats type file exist?
8. Check `src/components/game/game-stats.tsx` — does it handle this sport?

Skip any commits below where all items are already done. Report to the user what's done vs. what remains before starting implementation.

## Before You Start

Gather these details from the user (or research via web search if ambiguous):

1. **Sport name** — e.g., "Volleyball"
2. **Subtypes / formats** — e.g., "Indoor 6v6" and "Beach 2v2"
3. **Participation model** — team-based or individual (per subtype)
4. **Team size limits** — max roster size per subtype (if team-based)
5. **Max participants** — how many teams/individuals compete in a game (usually 2)
6. **Scoring model** — how scores are tracked per participant. Look at the GraphQL schema (`schema.graphqls`) to understand existing patterns. Read the existing `ParticipantMetadata` types to see what patterns are already in use (simple score, set-based, game-based, etc.)
7. **Game configuration fields** — sport-specific settings on the game itself (periods, best-of-N, etc.)
8. **SVG icon** — add a Lucide-style 24x24 SVG icon to `public/sports/{sport}.svg` and inline its paths in `src/components/game/sport-icon.tsx`
9. **Color theme** — pick oklch values for the sport accent color. Follow the existing pattern in `src/app/globals.css`: a light tint for backgrounds and a deeper foreground variant. Choose a hue angle that feels natural for the sport and distinct from existing sports. Check the existing `--sport-*` variables to see which hue angles are taken.
10. **Per-player stats** — what stats should be tracked per player? This may not exist yet in the schema — check and ask.
    - **Single-category**: one flat set of stats per player (like basketball, pickleball)
    - **Multi-category**: multiple independent stat groups per player (like football's offensive/defensive/special teams), each with its own types, table, form, and server actions

## Commit Strategy

Split the work into logical commits so each one compiles, is reviewable in isolation, and tells a clear story. Each commit grouping below is marked with a commit boundary.

---

## Commit 1: Data layer — schema, types, constants, fragments

Everything downstream depends on this foundation: enums, type definitions, config records, and GraphQL fragments. Group these together because they form a single coherent unit — "the new sport exists in the type system."

### 1. GraphQL Schema — `schema.graphqls`

This is a local reference copy of the backend schema. Update it to document the new types even though the backend team manages the actual schema.

**Add:**

- [ ] New subtype enum: `enum {Sport}Subtype { ... }`
- [ ] `{Sport}GameMetadata` type with sport-specific fields (subtype + config like periods, bestOf, etc.)
- [ ] `{Sport}ParticipantMetadata` type with score structure
- [ ] Add to `union GameMetadata`: `| {Sport}GameMetadata`
- [ ] Add to `union ParticipantMetadata`: `| {Sport}ParticipantMetadata`
- [ ] `Create{Sport}GameMetadataInput` (subtype required)
- [ ] `{Sport}GameMetadataInput` (subtype optional, for updates)
- [ ] `{Sport}ParticipantMetadataInput`
- [ ] Add to `input ParticipantMetadataInput @oneOf`: `{sport}: {Sport}ParticipantMetadataInput`
- [ ] `Create{Sport}GameInput` with metadata field
- [ ] Add to `input CreateGameInput @oneOf`: `{sport}: Create{Sport}GameInput`
- [ ] Add to `input GameMetadataInput @oneOf`: `{sport}: {Sport}GameMetadataInput`
- [ ] Add `{SPORT_VALUE}` to `enum SportType`
- [ ] If stats exist: add stat types, filter input, connection types, save input, and mutations

### 2. TypeScript Enums & Config — `src/lib/constants.ts`

- [ ] Add values to `SportSubtype` enum
- [ ] Add entries to `SportSubtypeConfig` with `participation`, `maxTeamSize` (if team), and `maxParticipants`
- [ ] Add value to `SportType` enum
- [ ] Add entry to `SportTypeConfig` with `subtypes` array and `icon` path
- [ ] Update `getSubtypeFromMetadata()` — add a case to the switch for `"{Sport}GameMetadata"` with the aliased subtype field name (e.g., `{sport}Subtype`)

**Naming conventions:**
- `SportType` values: `SCREAMING_SNAKE_CASE`
- `SportSubtype` values: `SCREAMING_SNAKE_CASE`
- Aliased subtype field: `{sport}Subtype` in camelCase

### 3. TypeScript Types — `src/lib/types/game.ts`

- [ ] Add `{Sport}GameMetadata` interface with `__typename` literal and aliased subtype field
- [ ] Add `{Sport}ParticipantMetadata` interface with `__typename` literal
- [ ] If the scoring model has nested types, add those interfaces too
- [ ] Add to `GameMetadata` union type: `| {Sport}GameMetadata`
- [ ] Add to `ParticipantMetadata` union type: `| {Sport}ParticipantMetadata`
- [ ] Add `Create{Sport}GameInput` interface with `sportType: SportType.{SPORT}` literal and sport-specific metadata
- [ ] Add to `CreateGameInput` union type: `| Create{Sport}GameInput`
- [ ] Add sport key to `UpdateGameInput.metadata`
- [ ] Add sport key to `ParticipantMetadataInput`

**Important patterns:**
- Response types use `field: T | null` for nullable fields (never `field?: T | null`)
- The subtype field is **aliased** due to GraphQL union field conflict resolution: the field name is `{sport}Subtype` which is an alias for the actual GraphQL field `subtype`
- Create inputs use `sportType: SportType.{SPORT}` as a literal discriminant

### 4. GraphQL Fragments — `src/lib/graphql-fragments.ts`

- [ ] Add inline fragment to `gameMetadataFragment.__on` array with `__aliasFor: "subtype"` and sport-specific fields
- [ ] Add inline fragment to `participantMetadataFragment.__on` array with score fields

**Commit message:** `feat: add {sport} sport type — schema, types, constants, fragments`

---

## Commit 2: Theme and visual identity — CSS, translations, icon, display components

This commit gives the sport its visual presence: colors, emoji, accent strips, and translated labels.

### 5. Translations — `messages/en.json`

- [ ] Add to `sports` object: `"{SPORT}": "Display Name"`
- [ ] Add subtype entries to `sportSubtypes` object
- [ ] If the sport has game-specific form fields not covered by existing keys, add them under `game.form`
- [ ] If stats exist: add stat abbreviation keys under `game.stats.{sport}`

**Translation key disambiguation:** If the sport has stats that repeat across sub-categories (e.g., "yards" and "touchdowns" appearing in passing, rushing, and receiving), use disambiguated abbreviations in translation values — e.g., `"PASS YDS"`, `"RUSH YDS"`, `"REC YDS"` instead of just `"YDS"` repeated. Otherwise table column headers become indistinguishable.

### 6. CSS Theme — `src/app/globals.css`

- [ ] Add light-mode and dark-mode CSS variables for `--sport-{sport}` and `--sport-{sport}-foreground`
- [ ] Register them in the `@theme inline` block

### 7. Sport Icon — `public/sports/`

- [ ] Add `{sport}.svg` icon file. Check if one already exists.

### 8. Visual Components

Display config is centralized in `SportTypeConfig` (`as const`). TypeScript will still error if the new sport enum value is missing from the config object, catching omissions at compile time.

- [ ] `src/lib/constants.ts` — add `bgClass`, `fgClass`, `accentClass`, `gradientClass` to the new sport's `SportTypeConfig` entry
- [ ] `src/components/game/sport-icon.tsx` — add SVG paths to the `sportPaths` lookup

**Commit message:** `feat: add {sport} theme — colors, translations, icon, visual components`

---

## Commit 3: Scoring — score display, score form, score block

### 9. Score Display — `src/components/game/score/game-score.tsx`

- [ ] Add a case to the `switch (sportType)` statement. Reuse `SimpleScore` for simple numeric scores, or create a new component for unique scoring structures.

### 10. Score Form — `src/components/game/scoreboard/`

- [ ] Create `{sport}-score-form.tsx` following the pattern of existing score forms in that directory.

### 11. Score Block — `src/components/game/game-score-block.tsx`

- [ ] Add a case to `renderScoreForm()` switch and import the new form

**Commit message:** `feat: add {sport} scoring — display, form, score block`

---

## Commit 4: Game forms — create and update flows

### 12. Game Forms

**Create form — `src/components/game/create-game-form.tsx`:**
- [ ] Add a branch in `onSubmit` for the new sport type
- [ ] Add advanced option form fields if the sport has unique configuration

**Update form — `src/components/game/update-game-form.tsx`:**
- [ ] Update `buildDefaultValues()` for the new metadata type
- [ ] Add a branch in the metadata change detection and `input.metadata` construction
- [ ] Add advanced option form fields if needed

**Form schema — `src/components/game/game-form-fields.tsx`:**
- [ ] Add new form fields to schemas/interfaces if the sport introduces fields not covered by existing ones
- [ ] Add cross-field `.refine()` if the sport shares a field with another sport but with different valid values

**Server actions — `src/app/[locale]/game/actions.ts`:**

This is a commonly missed step. The server actions build the actual GraphQL mutation inputs.

- [ ] **`createGame`**: Update `sportKey` type assertion to include the new sport. Add metadata field checks. **Important**: enum-valued fields must be wrapped in `new EnumType(value)`.
- [ ] **`updateGame`**: Add a branch for the new sport's metadata.

**Commit message:** `feat: add {sport} game forms — create and update`

---

## Commit 5: Stats (if applicable)

Per-player stats are a standalone feature that not all sports need. Keep this in its own commit so it can be skipped or deferred.

### Determine the stat model

Check the schema for how stats are structured:

- **Single-category** (one type per player per game): 1 type file, 1 table, 1 form, 1 action file
- **Multi-category** (multiple independent stat types per player per game): 1 type file (all categories), N tables, N forms, 1 action file (N*2 functions)

The instructions below use `{Category}` as a placeholder. For single-category sports, there's just one category. For multi-category, repeat table/form/action steps for each category.

### 13a. TypeScript Types — `src/lib/types/stats/{sport}.ts`

Follow existing patterns in `src/lib/types/stats/`. For each stat category, create 3 interfaces:
- [ ] `*Node extends StatsNode` — response type, stat fields `number | null`
- [ ] `Save*Input extends SaveStatsInput` — single-save, stat fields `number | null` optional
- [ ] `Save*Data` — bulk-save data with `playerId: number`, stat fields `number | null` optional

### 13b. Server Actions — `src/app/[locale]/game/{sport}-stats-actions.ts`

Create a **separate file** for the sport's stats actions (do NOT add to `actions.ts`). Follow existing `*-stats-actions.ts` patterns (e.g., `basketball-stats-actions.ts`).

For each stat category, create:
- [ ] A `STAT_FIELDS` const array
- [ ] A `buildStatFields(data)` helper
- [ ] A `RESPONSE_FIELDS` const for GraphQL selection
- [ ] A save-single function
- [ ] A save-bulk function

**Critical naming convention:** The GraphQL schema defines **union types** named `Save*Result` and **success member types** named `Save*Response`. Always use `*Response` (the concrete success member) for both `__typeName` in `__on` fragments and as the argument to `extractMutationResult`. Using the `*Result` union name will cause silent failures.

### 13c. Translation Keys — `messages/en.json`

- [ ] Add stat abbreviation keys under `game.stats.{sport}`
- [ ] For multi-category sports, add section label keys under `game.stats.{sport}.sections`
- [ ] Add combined-column header keys if needed (e.g., `"fieldGoals": "FG"` for a FGM/FGA column)
- [ ] Add keys for client-side computed columns (e.g., `"completionPercentage": "CMP%"`)

### 13d. Table Components — `src/components/game/{sport}-{category}-stats-table.tsx`

Follow the existing stats table pattern. One table per stat category. Each needs:
- [ ] `HIGHLIGHTABLE_STATS` for leader highlighting
- [ ] `computeMaxStats()`, `statCellClass`, `sortableHeader` helpers
- [ ] Add-player controls and edit pencil button
- [ ] Sticky first column for player name

**Combined made/attempted columns** (like FG made/attempted): Use a `madeAttemptedColumn` helper showing "3/5" format. Use a **separate translation key** for the combined header — don't reuse the "made" key or the header says "FGM" for a cell showing "3/5".

**Client-side computed columns** (percentages, averages, totals): These do NOT exist in the GraphQL schema. Use `id` (not `accessorKey`) with a custom `cell` renderer. Always guard division-by-zero:

```tsx
{
  id: "completionPercentage",
  header: t("completionPercentage"),
  cell: ({ row }) => {
    const made = row.original.completions;
    const att = row.original.passAttempts;
    if (made == null || att == null || att === 0) {
      return <span className="tabular-nums">-</span>;
    }
    return (
      <span className="tabular-nums">
        {format.number(made / att, { style: "percent", maximumFractionDigits: 1 })}
      </span>
    );
  },
}
```

### 13e. Form Components — `src/components/game/{sport}-{category}-stats-form.tsx`

Follow the existing stats form pattern. One form per stat category. Each is a Dialog with:
- [ ] `STAT_FIELDS` array, `buildDefaultValues()`, `buildInput()`
- [ ] TanStack Form with `FormTextField` for each stat
- [ ] For forms with many fields, group into sections with headers

### 13f. Orchestrator — `src/components/game/game-stats.tsx`

This component gates which sports show stats. Read the current implementation to understand the existing guard condition and rendering pattern.

- [ ] Add the new sport to the allowed sports guard
- [ ] Add optional props for the new sport's stat arrays
- [ ] For multi-category sports: render category sections with `TypographyH4` headers, **hiding sections when no stats exist** (`stats && stats.length > 0`) to avoid empty-state noise
- [ ] Ensure `basketballStats` prop is optional (with `?? []` fallback) — it's basketball-specific and shouldn't be required for other sports
- [ ] Use `groupByTeam()` to group stats by team

### 13g. Game Detail Page — `src/app/[locale]/game/[id]/page.tsx`

- [ ] Import the sport's stat node types
- [ ] Add `let` declarations for stat arrays (initialized to `[]`)
- [ ] Add a fetch block guarded by sport type and not-scheduled status
- [ ] For multi-category sports, use `Promise.all` for parallel queries
- [ ] Query fields must match schema exactly — do NOT include computed fields
- [ ] Pass stat arrays to `<GameDetailClient>`

### 13h. Client Wrapper — `src/components/game/live/game-detail-client.tsx`

- [ ] Add optional props for the stat arrays
- [ ] Pass them through to `<GameStats>`

**Note:** Stats are static props, not managed by the live reducer. The existing `initialBasketballStats` prop feeds the basketball WebSocket live reducer — it will be `[]` for non-basketball games. No reducer changes needed.

**Commit message:** `feat: add {sport} stats — types, table, form, actions, page wiring`

---

## Commit 6: Tests and verification

### 14. Tests

- [ ] Update `__tests__/components/game/sport-badge.test.tsx` — add a test case for the new sport
- [ ] Update any test fixtures that create game objects to include the new sport
- [ ] Add tests for the new score form component
- [ ] Run `npm test` and `npm run build` to verify everything compiles

### 15. Verify

- [ ] `npm run build` — TypeScript compilation catches missing `Record<SportType, ...>` entries
- [ ] `npm run lint` — catches lint violations
- [ ] `npm test` — ensures existing tests pass

**Commit message:** `test: add {sport} tests and verify build`

---

## Architecture Notes

**Why subtype fields are aliased in TypeScript:**
GraphQL union types can have fields with the same name (`subtype`) but different enum types across members. When querying all members of the `GameMetadata` union in one query, these conflict. The codebase resolves this by aliasing each to `{sport}Subtype` using `json-to-graphql-query`'s `__aliasFor` directive. The `getSubtypeFromMetadata()` function in `constants.ts` normalizes these back to a single `SportSubtype` value.

**Scoring model pattern:**
The participant metadata follows a `@oneOf` input pattern in GraphQL — exactly one sport key is provided. In TypeScript, `ParticipantMetadataInput` has optional keys for each sport. The score form components produce the right key for their sport type.

**Simple vs. complex scoring:**
If the new sport uses a simple numeric score, most of the score infrastructure can be reused — `SimpleScore` for display and a basic two-field form. Only create new components if the scoring model is structurally different from existing ones.

**Stats action file convention:**
Each sport gets its own server action file for stats (e.g., `{sport}-stats-actions.ts`), NOT added to the main `actions.ts`. This keeps files focused and avoids one massive file.

**Multi-category stats:**
Sports with multiple independent stat categories (like football's offensive/defensive/special teams) get one table + form per category. The orchestrator renders each category as a collapsible section with a heading, hiding empty sections. Each category has its own pair of server action functions (save single + bulk).
