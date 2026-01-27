# Player Profile CRUD - Requirements

## Overview

This document defines the requirements for the Player Profile feature, which allows authenticated users to create and manage their player representation. A player profile is required for users to participate in sport events/games within the application.

---

## Background and Context

### Problem Statement

Users need a player representation to participate in sport events and games. Without a player profile, users cannot:
- Join games as participants (via TeamInstance or IndividualParticipant)
- Have their game statistics tracked
- Be visible to other users seeking teammates

### Key Relationships (from GraphQL Schema)

- `CurrentUser.player: Player` - Optional field; null if no player exists
- `User.player: Player` - Public view of a user's player profile
- `Player` is referenced by `TeamInstance.players` and `IndividualParticipant.player`
- Players are identified in `GameFilterInput.playerId` for game queries

### Relevant GraphQL Operations

**Query:**
```graphql
currentPlayer: Player  # Get the player for the current logged-in user
```

**Mutations:**
```graphql
createPlayer(input: CreatePlayerInput!): CreatePlayerResponse!
updatePlayer(input: UpdatePlayerInput!): UpdatePlayerResponse!
```

**Types:**
```graphql
type Player implements Node {
  id: ID!
  firstName: String!
  lastName: String!
  age: Int
  height: Float
  weight: Float
  biography: String
}

input CreatePlayerInput {
  firstName: String!
  lastName: String!
  age: Int
  height: Float
  weight: Float
  biography: String
}

input UpdatePlayerInput {
  id: ID!
  firstName: String    # Omit to leave unchanged
  lastName: String     # Omit to leave unchanged
  age: Int             # Set to null to clear value
  height: Float        # Set to null to clear value
  weight: Float        # Set to null to clear value
  biography: String    # Set to null to clear value
}
```

---

## Functional Requirements

### FR-1: Player Page

**FR-1.1**: The player profile page shall be accessible at route `/[locale]/player`.

**FR-1.2**: The page shall be accessible via a navbar link labeled "Player" (visible to authenticated users).

**FR-1.3**: The page shall require authentication. Unauthenticated users shall be redirected to sign in.

**FR-1.4**: The page shall display different content based on whether the user has an existing player profile:
- If player exists: Display view mode with player information
- If no player exists: Display create player form

### FR-2: View Mode

**FR-2.1**: View mode shall display the following player fields:
| Field | Display Label | Required | Notes |
|-------|--------------|----------|-------|
| firstName | First Name | Yes | Always displayed |
| lastName | Last Name | Yes | Always displayed |
| age | Age | No | Leave blank if null |
| height | Height | No | Leave blank if null, display with user's selected unit (cm or ft/in) |
| weight | Weight | No | Leave blank if null, display with user's selected unit (kg or lbs) |
| biography | Biography | No | Leave blank if null |
| sportPreferences | Sport Preferences | No | *(Future - blocked on API)* Display list of sports with skill levels; hide section if none selected |

**FR-2.2**: Empty optional fields shall display as blank (not "N/A" or similar placeholder text).

**FR-2.3**: View mode shall include an "Edit" button that switches to edit mode.

### FR-3: Edit Mode (Update)

**FR-3.1**: Edit mode shall be accessible by clicking the "Edit" button in view mode.

**FR-3.2**: Edit mode shall pre-populate form fields with current player data.

**FR-3.3**: Edit mode shall include:
- "Save" button to submit changes
- "Cancel" button to discard changes and return to view mode

**FR-3.4**: Upon successful update, the page shall automatically switch back to view mode with updated data.

**FR-3.5**: The `updatePlayer` mutation shall only include fields that have been modified (partial update).

### FR-4: Create Mode

**FR-4.1**: Create mode shall be displayed when the authenticated user has no existing player profile (`currentPlayer` returns null).

**FR-4.2**: Create mode shall display a form with all player fields.

**FR-4.3**: Upon successful creation, the page shall automatically switch to view mode displaying the newly created player.

**FR-4.4**: In create mode, the firstName and lastName fields shall be pre-populated with the user's firstName and lastName from their account (`CurrentUser.firstName`, `CurrentUser.lastName`). Users can modify these values before submission.

### FR-5: Form Fields and Validation

**FR-5.1**: Field specifications:

| Field | Type | Required | Validation | UI Component |
|-------|------|----------|------------|--------------|
| firstName | string | Yes (create), No (update) | 1-255 characters | Text input |
| lastName | string | Yes (create), No (update) | 1-255 characters | Text input |
| age | integer | No | Greater than 0 | Number input |
| height | float | No | Greater than 0 | Number input |
| weight | float | No | Greater than 0 | Number input |
| biography | string | No | Max 1,000 words | Textarea |

**FR-5.2**: Validation errors shall be displayed inline below each field.

**FR-5.3**: The form shall not submit if validation fails.

**FR-5.4**: For the biography field, display a word count indicator showing current words / 1,000 max.

### FR-5.5: Height/Weight Unit Selection

**FR-5.5.1**: Users shall be able to toggle between metric and imperial units for height and weight fields.

**FR-5.5.2**: Unit options:
| Field | Metric | Imperial |
|-------|--------|----------|
| Height | Centimeters (cm) | Feet and Inches (ft/in) |
| Weight | Kilograms (kg) | Pounds (lbs) |

**FR-5.5.3**: The backend API accepts metric units only (cm for height, kg for weight). The frontend shall convert imperial inputs to metric before sending to the API.

**FR-5.5.4**: The unit preference shall be stored locally (localStorage) and persist across sessions.

**FR-5.5.5**: Default unit preference shall be imperial.

**FR-5.5.6**: When displaying height/weight in view mode, values shall be converted from metric (stored) to the user's selected unit preference.

### FR-5.6: Sport Preferences and Skill Levels *(Future - blocked on API)*

**FR-5.6.1**: Users shall be able to select which sports they are interested in playing from the available sport types:
- Basketball
- Football
- Tennis

**FR-5.6.2**: For each selected sport, users shall be able to specify their skill level:
| Level | Description |
|-------|-------------|
| Beginner | New to the sport, learning fundamentals |
| Intermediate | Comfortable with basics, developing skills |
| Advanced | Strong skills, experienced player |
| Competitive | High-level play, competitive experience |

**FR-5.6.3**: Users can select multiple sports, each with its own skill level.

**FR-5.6.4**: Sport preferences are optional - users can create a player profile without selecting any sports.

**FR-5.6.5**: **API Status**: The backend API does not currently support sport preferences. API schema will be updated to include this field. Implementation of this feature is blocked until API support is added.

**FR-5.6.6**: Expected API data structure (for future schema update):
```graphql
type Player implements Node {
  # ... existing fields ...
  sportPreferences: [SportPreference!]
}

type SportPreference {
  sport: SportType!
  skillLevel: SkillLevel!
}

enum SkillLevel {
  BEGINNER
  INTERMEDIATE
  ADVANCED
  COMPETITIVE
}
```

### FR-6: Onboarding and Prompts

**FR-6.1**: Users without a player profile shall see a prompt/banner encouraging them to create one. This banner should appear on relevant pages (e.g., dashboard/home page when authenticated).

**FR-6.2**: After account creation (first sign-in), users shall see a prompt encouraging them to create their player profile. Users shall NOT be automatically redirected to the player creation page.

**FR-6.3**: The onboarding prompt shall clearly communicate why a player profile is needed ("Create your player profile to join games and track your stats").

### FR-7: Player Required Modal

**FR-7.1**: When a user without a player profile attempts to access a feature that requires one (e.g., joining a game), a modal shall be displayed.

**FR-7.2**: The modal shall:
- Explain that a player profile is required for the action
- Provide a button/link to navigate to the player creation page
- Include a "Cancel" or close button to dismiss the modal

**FR-7.3**: The modal component shall be reusable across different features that require a player.

### FR-8: Error Handling

**FR-8.1**: Network errors during create/update shall display an error message to the user.

**FR-8.2**: If `currentPlayer` query fails, display an error state with a retry option.

**FR-8.3**: Server-side validation errors shall be mapped to appropriate form fields when possible.

### FR-9: Scope Exclusions

**FR-9.1**: Delete player functionality is explicitly **not in scope** for this feature.

**FR-9.2**: Player profile pictures are not in scope.

---

## UI/UX Requirements

### UX-1: Page Layout

**UX-1.1**: The player page shall follow the existing application layout with navbar and footer.

**UX-1.2**: The page shall use a card-based layout for the player profile form/display.

**UX-1.3**: Responsive design:
- Desktop: Centered card with reasonable max-width
- Mobile: Full-width card with appropriate padding

### UX-2: View Mode Layout

**UX-2.1**: Display player name prominently as a heading.

**UX-2.2**: Display physical attributes (age, height, weight) in a grid or inline format.

**UX-2.3**: Display biography in a separate section below attributes.

**UX-2.4**: Position the "Edit" button in the top-right corner of the card or below the content.

### UX-3: Edit/Create Mode Layout

**UX-3.1**: Form fields shall be arranged in a logical order:
1. First Name, Last Name (side by side on desktop, stacked on mobile)
2. Age, Height, Weight (in a row on desktop, stacked on mobile)
3. Sport Preferences (full width, expandable section) - *Future: blocked on API*
4. Biography (full width)
5. Action buttons (Save/Cancel for edit, Create for create mode)

**UX-3.2**: The biography textarea shall have a visible word count indicator.

**UX-3.3**: Required fields shall be marked with an asterisk (*) or "Required" label.

### UX-4: Mode Toggle

**UX-4.1**: Switching between view and edit mode shall be smooth without full page reload.

**UX-4.2**: When canceling edit mode, restore the original values (discard unsaved changes).

### UX-5: Loading States

**UX-5.1**: Display a skeleton loader while fetching player data on initial page load.

**UX-5.2**: Display a loading indicator on the Save/Create button while mutation is in progress.

**UX-5.3**: Disable form inputs and buttons during mutation to prevent double submission.

### UX-6: Onboarding Banner

**UX-6.1**: The onboarding banner should be visually distinct (e.g., highlighted card, different background color).

**UX-6.2**: Include a clear call-to-action button: "Create Player Profile".

**UX-6.3**: The banner shall be dismissible. Users can close it without creating a player profile. The dismissed state shall be stored in localStorage and persist across sessions.

### UX-7: Sport Preferences UI *(Future - blocked on API)*

**UX-7.1**: In edit/create mode, sport preferences shall be displayed as a list with:
- Each row showing: Sport dropdown | Skill level dropdown | Remove button
- "Add Sport" button below the list to add new entries
- Sports already selected should be disabled in the dropdown to prevent duplicates

**UX-7.2**: In view mode, sport preferences shall be displayed as:
- Section header: "Sport Preferences"
- Each sport shown as a badge/chip with the sport name and skill level (e.g., "Basketball - Intermediate")
- If no sports selected, hide the section entirely

**UX-7.3**: Skill level selection should show the skill description as helper text or tooltip.

### UX-8: Player Required Modal

**UX-7.1**: Use shadcn/ui Dialog component for the modal.

**UX-7.2**: Modal content:
- Title: "Player Profile Required"
- Description: Explain why a player profile is needed
- Primary action: "Create Player Profile" (navigates to /player)
- Secondary action: "Cancel" (closes modal)

---

## Technical Requirements

### TR-1: Data Fetching

**TR-1.1**: Use server components for initial data fetch of `currentPlayer`.

**TR-1.2**: Use `authQuery` from the GraphQL client (authentication required).

**TR-1.3**: GraphQL query for fetching current player and user info (for name defaults):

```graphql
query {
  me {
    id
    firstName
    lastName
  }
  currentPlayer {
    id
    firstName
    lastName
    age
    height
    weight
    biography
  }
}
```

**TR-1.4**: GraphQL mutation for creating a player:

```graphql
mutation CreatePlayer($input: CreatePlayerInput!) {
  createPlayer(input: $input) {
    player {
      id
      firstName
      lastName
      age
      height
      weight
      biography
    }
  }
}
```

**TR-1.5**: GraphQL mutation for updating a player:

```graphql
mutation UpdatePlayer($input: UpdatePlayerInput!) {
  updatePlayer(input: $input) {
    player {
      id
      firstName
      lastName
      age
      height
      weight
      biography
    }
  }
}
```

### TR-2: Component Structure

**TR-2.1**: Create the following components:

| Component | Path | Type | Description |
|-----------|------|------|-------------|
| Player Page | `src/app/[locale]/player/page.tsx` | Server | Main player page |
| PlayerProfileCard | `src/components/player/player-profile-card.tsx` | Client | View/Edit mode container |
| PlayerForm | `src/components/player/player-form.tsx` | Client | Create/Edit form |
| PlayerView | `src/components/player/player-view.tsx` | Client | View mode display |
| PlayerOnboardingBanner | `src/components/player/player-onboarding-banner.tsx` | Client | Onboarding prompt |
| PlayerRequiredModal | `src/components/player/player-required-modal.tsx` | Client | Modal for requiring player |
| UnitToggle | `src/components/player/unit-toggle.tsx` | Client | Metric/Imperial unit toggle |
| SportPreferencesEditor | `src/components/player/sport-preferences-editor.tsx` | Client | *(Future)* Add/edit sport preferences with skill levels |
| SportPreferencesDisplay | `src/components/player/sport-preferences-display.tsx` | Client | *(Future)* View mode display of sport preferences |

**TR-2.2**: Update the navbar component to include a "Player" link for authenticated users.

### TR-3: Form Handling

**TR-3.1**: Use a form library (react-hook-form recommended) for form state management and validation.

**TR-3.2**: Use Zod for schema validation matching the GraphQL input types.

**TR-3.3**: Implement word count validation for biography (count words by splitting on whitespace).

### TR-4: State Management

**TR-4.1**: Use React state for managing view/edit mode toggle.

**TR-4.2**: Use React Query or similar for caching and refetching player data after mutations.

**TR-4.3**: After successful create/update, invalidate and refetch the `currentPlayer` query.

### TR-5: Authentication

**TR-5.1**: The player page must verify authentication before rendering.

**TR-5.2**: Use the existing auth patterns: `auth.api.getSession({ headers: await headers() })` for server components.

**TR-5.3**: Redirect unauthenticated users to sign-in page.

### TR-6: shadcn/ui Components Required

**TR-6.1**: Ensure the following shadcn/ui components are available:
- `Card` - For profile card layout
- `Button` - For actions
- `Input` - For text fields
- `Textarea` - For biography
- `Label` - For form labels
- `Dialog` - For player required modal
- `Skeleton` - For loading states
- `Toggle` or `Switch` - For metric/imperial unit toggle
- `Select` - For sport and skill level dropdowns
- `Badge` - For displaying sport/skill tags in view mode
- Form components if using shadcn/ui form integration

### TR-7: Navbar Integration

**TR-7.1**: Add "Player" link to navbar, visible only to authenticated users.

**TR-7.2**: Use the existing navbar structure and styling patterns.

### TR-8: Unit Conversion Utilities

**TR-8.1**: Create utility functions for height/weight unit conversions:

```typescript
// Height conversions
cmToFeetInches(cm: number): { feet: number; inches: number }
feetInchesToCm(feet: number, inches: number): number

// Weight conversions
kgToLbs(kg: number): number
lbsToKg(lbs: number): number
```

**TR-8.2**: Store unit preference in localStorage with key `playerUnitPreference` and value `"metric"` or `"imperial"`.

**TR-8.3**: Create a custom hook `useUnitPreference()` to manage unit preference state and localStorage sync.

### TR-9: Sport Preferences (Future API Integration)

**TR-9.1**: Sport preferences feature is **blocked** until API schema is updated to support it.

**TR-9.2**: Once API support is available, sport preferences will be:
- Fetched as part of the `currentPlayer` query
- Updated via `createPlayer` and `updatePlayer` mutations

**TR-9.3**: TypeScript types to be created when implementing:

```typescript
interface SportPreference {
  sport: 'BASKETBALL' | 'FOOTBALL' | 'TENNIS';
  skillLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'COMPETITIVE';
}
```

**TR-9.4**: UI components (`SportPreferencesEditor`, `SportPreferencesDisplay`) should be designed and ready for implementation once API is available.

---

## Internationalization (i18n)

### i18n-1: Translation Keys

Add the following keys to `messages/en.json`:

```json
{
  "header": {
    "player": "Player"
  },
  "player": {
    "title": "Player Profile",
    "createTitle": "Create Player Profile",
    "editTitle": "Edit Player Profile",
    "form": {
      "firstName": "First Name",
      "lastName": "Last Name",
      "age": "Age",
      "height": "Height",
      "weight": "Weight",
      "biography": "Biography",
      "biographyWordCount": "{count} / 1,000 words",
      "required": "Required"
    },
    "units": {
      "metric": "Metric",
      "imperial": "Imperial",
      "cm": "cm",
      "kg": "kg",
      "lbs": "lbs",
      "ft": "ft",
      "in": "in",
      "heightMetric": "{value} cm",
      "heightImperial": "{feet}' {inches}\"",
      "weightMetric": "{value} kg",
      "weightImperial": "{value} lbs"
    },
    "sports": {
      "title": "Sport Preferences",
      "description": "Select the sports you play and your skill level",
      "addSport": "Add Sport",
      "removeSport": "Remove",
      "selectSport": "Select a sport",
      "selectSkillLevel": "Select skill level",
      "noSportsSelected": "No sports selected",
      "types": {
        "BASKETBALL": "Basketball",
        "FOOTBALL": "Football",
        "TENNIS": "Tennis"
      },
      "skillLevels": {
        "BEGINNER": "Beginner",
        "INTERMEDIATE": "Intermediate",
        "ADVANCED": "Advanced",
        "COMPETITIVE": "Competitive"
      },
      "skillDescriptions": {
        "BEGINNER": "New to the sport, learning fundamentals",
        "INTERMEDIATE": "Comfortable with basics, developing skills",
        "ADVANCED": "Strong skills, experienced player",
        "COMPETITIVE": "High-level play, competitive experience"
      }
    },
    "actions": {
      "edit": "Edit",
      "save": "Save",
      "cancel": "Cancel",
      "create": "Create Player"
    },
    "validation": {
      "firstNameRequired": "First name is required",
      "firstNameMaxLength": "First name must be 255 characters or less",
      "lastNameRequired": "Last name is required",
      "lastNameMaxLength": "Last name must be 255 characters or less",
      "agePositive": "Age must be greater than 0",
      "heightPositive": "Height must be greater than 0",
      "weightPositive": "Weight must be greater than 0",
      "biographyMaxWords": "Biography must be 1,000 words or less"
    },
    "onboarding": {
      "title": "Create Your Player Profile",
      "description": "Create your player profile to join games and track your stats.",
      "cta": "Create Player Profile",
      "dismiss": "Dismiss"
    },
    "modal": {
      "title": "Player Profile Required",
      "description": "You need a player profile to perform this action. Create your profile to join games and participate in events.",
      "create": "Create Player Profile",
      "cancel": "Cancel"
    },
    "errors": {
      "loadError": "Failed to load player profile",
      "createError": "Failed to create player profile",
      "updateError": "Failed to update player profile",
      "retry": "Retry"
    }
  }
}
```

---

## Security Considerations

### SEC-1: Authentication

**SEC-1.1**: All player operations (view own, create, update) require authentication.

**SEC-1.2**: The `currentPlayer` query returns only the authenticated user's player data.

**SEC-1.3**: The `createPlayer` mutation creates a player linked to the authenticated user.

**SEC-1.4**: The `updatePlayer` mutation should only allow users to update their own player (server-side enforcement).

### SEC-2: Input Validation

**SEC-2.1**: Validate all inputs client-side for UX, but rely on server-side validation for security.

**SEC-2.2**: Sanitize biography input to prevent XSS (server-side responsibility, but display safely on client).

---

## Acceptance Criteria

1. Authenticated users can navigate to `/[locale]/player` via navbar link
2. Users without a player see the create player form
3. Users can create a player with valid firstName and lastName (required fields)
4. After successful creation, the page switches to view mode showing the new player
5. Users with an existing player see the view mode with their player data
6. Users can click "Edit" to switch to edit mode with pre-populated form
7. Users can update their player information
8. After successful update, the page switches back to view mode with updated data
9. Users can cancel edit mode and discard changes
10. Form validation prevents submission with invalid data
11. Biography field shows word count and enforces 1,000 word limit
12. Loading states are displayed during data fetching and mutations
13. Error messages are displayed when operations fail
14. Onboarding banner appears for users without a player profile
15. Player required modal can be triggered by other features
16. All user-facing text uses i18n translation keys
17. Page is responsive on desktop and mobile
18. Users can toggle between metric and imperial units for height/weight
19. Unit preference persists across sessions (localStorage)
20. Height/weight values are converted correctly between metric and imperial
21. In create mode, firstName and lastName are pre-populated from user's account
22. Onboarding banner can be dismissed and dismissal state persists
23. *(Future - blocked on API)* Users can add sport preferences with skill levels
24. *(Future - blocked on API)* Users can select multiple sports, each with its own skill level
25. *(Future - blocked on API)* Sport preferences are displayed in view mode with skill level badges

---

## Dependencies

- shadcn/ui components: Card, Button, Input, Textarea, Label, Dialog, Skeleton, Toggle/Switch, Select, Badge
- Existing GraphQL client infrastructure (`authQuery`, `authMutate`)
- Existing authentication infrastructure (Better Auth)
- Existing i18n infrastructure (next-intl)
- Form library: react-hook-form (recommended)
- Validation library: Zod

---

## Resolved Decisions

The following questions have been resolved:

1. **Post-registration redirect**: Users see a **prompt** on their dashboard after account creation. No automatic redirect to player creation page. *(See FR-6.2)*

2. **Player name vs User name**: Player firstName/lastName **default to user's account name** in create mode only. Users can modify before submission. *(See FR-4.4)*

3. **Height/Weight units**: Users can **toggle between metric and imperial** units. Backend accepts metric only (cm/kg); frontend converts as needed. *(See FR-5.5)*

4. **Onboarding banner persistence**: Banner is **dismissible**. Dismissed state persists in localStorage. *(See UX-6.3)*

5. **Sport preferences**: Users can select **preferred sports with skill level per sport**. Feature blocked until API schema is updated to support it. *(See FR-5.6, TR-9)*
