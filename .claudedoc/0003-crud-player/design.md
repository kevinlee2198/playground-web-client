# Player Profile CRUD - Design Document

## Overview

This document outlines the technical design for the Player Profile CRUD feature based on the requirements in `requirements.md`. The feature enables authenticated users to create and manage their player profile at `/[locale]/player`.

---

## Component Architecture

### Component Hierarchy

```
src/app/[locale]/player/
  page.tsx                      # Server component - auth check, data fetching
  actions.ts                    # Server actions for create/update mutations
  loading.tsx                   # Loading skeleton for page

src/components/player/
  player-profile-card.tsx       # Client - orchestrates view/edit modes
  player-view.tsx               # Client - displays player data
  player-form.tsx               # Client - create/edit form
  player-onboarding-banner.tsx  # Client - banner for users without player
  player-required-modal.tsx     # Client - reusable modal for gating features
  unit-toggle.tsx               # Client - metric/imperial toggle

src/lib/
  unit-conversion.ts            # Pure functions for height/weight conversion

src/hooks/
  use-unit-preference.ts        # Custom hook for localStorage unit preference
```

### Component Details

| Component | Type | Description |
|-----------|------|-------------|
| `page.tsx` | Server | Auth guard, fetches `me` and `currentPlayer`, renders appropriate component |
| `actions.ts` | Server Actions | `createPlayer()` and `updatePlayer()` mutations |
| `loading.tsx` | Server | Skeleton UI during page load |
| `PlayerProfileCard` | Client | Container managing view/edit state, coordinates child components |
| `PlayerView` | Client | Displays player information with unit conversion |
| `PlayerForm` | Client | react-hook-form based form for create/edit with Zod validation |
| `PlayerOnboardingBanner` | Client | Dismissible banner shown on home page for users without a player |
| `PlayerRequiredModal` | Client | Dialog shown when player-gated features are accessed |
| `UnitToggle` | Client | Toggle switch for metric/imperial preference |

---

## Data Flow

### Page Load Flow

```
User visits /player
       |
       v
page.tsx (Server)
  |-- Check auth (redirect if not authenticated)
  |-- Fetch { me, currentPlayer } via authQuery
  |-- Pass data to PlayerProfileCard
       |
       v
PlayerProfileCard (Client)
  |-- If no player: render PlayerForm (create mode)
  |-- If player exists: render PlayerView (view mode)
       |-- User clicks Edit: render PlayerForm (edit mode)
```

### Create/Update Flow

```
User fills PlayerForm
       |
       v
Form validates with Zod
       |
       v
Convert imperial units to metric (if applicable)
       |
       v
Call server action (createPlayer or updatePlayer)
       |
       v
Server action calls authMutate
       |
       v
On success: return new player data
       |
       v
PlayerProfileCard updates state, switches to view mode
       |
       v
Toast notification confirms success
```

---

## GraphQL Operations

### Query: Fetch Current User and Player

Used in `page.tsx` to load initial data.

```typescript
// src/app/[locale]/player/page.tsx
const playerPageQuery = {
  me: {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
  },
  currentPlayer: {
    id: true,
    firstName: true,
    lastName: true,
    age: true,
    height: true,
    weight: true,
    biography: true,
  },
};
```

### Mutation: Create Player

```typescript
// src/app/[locale]/player/actions.ts
export async function createPlayer(input: CreatePlayerInput) {
  const response = await authMutate({
    createPlayer: {
      __args: { input },
      player: {
        id: true,
        firstName: true,
        lastName: true,
        age: true,
        height: true,
        weight: true,
        biography: true,
      },
    },
  });
  // Handle response...
}
```

### Mutation: Update Player

```typescript
// src/app/[locale]/player/actions.ts
export async function updatePlayer(input: UpdatePlayerInput) {
  const response = await authMutate({
    updatePlayer: {
      __args: { input },
      player: {
        id: true,
        firstName: true,
        lastName: true,
        age: true,
        height: true,
        weight: true,
        biography: true,
      },
    },
  });
  // Handle response...
}
```

---

## TypeScript Types

### Player Types

```typescript
// src/lib/types/player.ts
export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  age?: number | null;
  height?: number | null;     // stored in cm
  weight?: number | null;     // stored in kg
  biography?: string | null;
}

export interface CreatePlayerInput {
  firstName: string;
  lastName: string;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  biography?: string | null;
}

export interface UpdatePlayerInput {
  id: string;
  firstName?: string;
  lastName?: string;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  biography?: string | null;
}

export type UnitPreference = "metric" | "imperial";

export interface HeightImperial {
  feet: number;
  inches: number;
}
```

---

## Form Handling and Validation

### Zod Schema

```typescript
// src/components/player/player-form.tsx
import { z } from "zod";

// Word count helper
const countWords = (text: string): number => {
  if (!text.trim()) return 0;
  return text.trim().split(/\s+/).length;
};

// Create mode schema (firstName/lastName required)
export const createPlayerSchema = z.object({
  firstName: z
    .string()
    .min(1, "player.validation.firstNameRequired")
    .max(255, "player.validation.firstNameMaxLength"),
  lastName: z
    .string()
    .min(1, "player.validation.lastNameRequired")
    .max(255, "player.validation.lastNameMaxLength"),
  age: z
    .number()
    .positive("player.validation.agePositive")
    .int()
    .nullable()
    .optional(),
  // Height fields depend on unit preference
  heightCm: z
    .number()
    .positive("player.validation.heightPositive")
    .nullable()
    .optional(),
  heightFeet: z.number().min(0).int().nullable().optional(),
  heightInches: z.number().min(0).max(11).nullable().optional(),
  weightKg: z
    .number()
    .positive("player.validation.weightPositive")
    .nullable()
    .optional(),
  weightLbs: z
    .number()
    .positive("player.validation.weightPositive")
    .nullable()
    .optional(),
  biography: z
    .string()
    .refine((val) => !val || countWords(val) <= 1000, {
      message: "player.validation.biographyMaxWords",
    })
    .nullable()
    .optional(),
});

// Update mode schema (firstName/lastName optional)
export const updatePlayerSchema = createPlayerSchema.partial({
  firstName: true,
  lastName: true,
});

export type CreatePlayerFormValues = z.infer<typeof createPlayerSchema>;
export type UpdatePlayerFormValues = z.infer<typeof updatePlayerSchema>;
```

### Form Component Structure

```typescript
// src/components/player/player-form.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useUnitPreference } from "@/hooks/use-unit-preference";

interface PlayerFormProps {
  mode: "create" | "edit";
  initialData?: Player | null;
  userDefaults?: { firstName: string; lastName: string };
  onSubmit: (data: CreatePlayerInput | UpdatePlayerInput) => Promise<void>;
  onCancel?: () => void;
}

export function PlayerForm({
  mode,
  initialData,
  userDefaults,
  onSubmit,
  onCancel,
}: PlayerFormProps) {
  const t = useTranslations();
  const [unitPreference] = useUnitPreference();

  const form = useForm({
    resolver: zodResolver(mode === "create" ? createPlayerSchema : updatePlayerSchema),
    defaultValues: {
      firstName: initialData?.firstName ?? userDefaults?.firstName ?? "",
      lastName: initialData?.lastName ?? userDefaults?.lastName ?? "",
      age: initialData?.age ?? null,
      // Convert stored cm to display units
      heightCm: unitPreference === "metric" ? initialData?.height ?? null : null,
      heightFeet: unitPreference === "imperial" ? /* convert */ null : null,
      heightInches: unitPreference === "imperial" ? /* convert */ null : null,
      weightKg: unitPreference === "metric" ? initialData?.weight ?? null : null,
      weightLbs: unitPreference === "imperial" ? /* convert */ null : null,
      biography: initialData?.biography ?? null,
    },
  });

  // ... form implementation
}
```

---

## State Management

### PlayerProfileCard State

```typescript
// src/components/player/player-profile-card.tsx
"use client";

interface PlayerProfileCardProps {
  initialPlayer: Player | null;
  userDefaults: { firstName: string; lastName: string };
}

export function PlayerProfileCard({
  initialPlayer,
  userDefaults,
}: PlayerProfileCardProps) {
  const [player, setPlayer] = useState<Player | null>(initialPlayer);
  const [mode, setMode] = useState<"view" | "edit">(
    initialPlayer ? "view" : "create"
  );
  const [isPending, startTransition] = useTransition();

  const handleCreate = async (data: CreatePlayerInput) => {
    startTransition(async () => {
      const result = await createPlayer(data);
      if (result.success) {
        setPlayer(result.player);
        setMode("view");
        toast.success(/* success message */);
      } else {
        toast.error(/* error message */);
      }
    });
  };

  const handleUpdate = async (data: UpdatePlayerInput) => {
    startTransition(async () => {
      const result = await updatePlayer(data);
      if (result.success) {
        setPlayer(result.player);
        setMode("view");
        toast.success(/* success message */);
      } else {
        toast.error(/* error message */);
      }
    });
  };

  // Render based on mode...
}
```

### Unit Preference Hook

```typescript
// src/hooks/use-unit-preference.ts
"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "playerUnitPreference";
const DEFAULT_PREFERENCE = "imperial";

export type UnitPreference = "metric" | "imperial";

export function useUnitPreference(): [
  UnitPreference,
  (preference: UnitPreference) => void
] {
  const [preference, setPreference] = useState<UnitPreference>(DEFAULT_PREFERENCE);
  const [isHydrated, setIsHydrated] = useState(false);

  // Read from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "metric" || stored === "imperial") {
      setPreference(stored);
    }
    setIsHydrated(true);
  }, []);

  // Persist to localStorage
  const updatePreference = (newPreference: UnitPreference) => {
    setPreference(newPreference);
    localStorage.setItem(STORAGE_KEY, newPreference);
  };

  return [preference, updatePreference];
}
```

### Onboarding Banner Dismissed State

```typescript
// src/components/player/player-onboarding-banner.tsx
const DISMISSED_KEY = "playerOnboardingDismissed";

export function PlayerOnboardingBanner() {
  const [isDismissed, setIsDismissed] = useState(true); // SSR safe default

  useEffect(() => {
    const dismissed = localStorage.getItem(DISMISSED_KEY) === "true";
    setIsDismissed(dismissed);
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setIsDismissed(true);
  };

  if (isDismissed) return null;
  // ... render banner
}
```

---

## Unit Conversion Utilities

```typescript
// src/lib/unit-conversion.ts

// Height: cm <-> ft/in
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = cm / 2.54;
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  // Handle edge case where inches rounds to 12
  if (inches === 12) {
    return { feet: feet + 1, inches: 0 };
  }
  return { feet, inches };
}

export function feetInchesToCm(feet: number, inches: number): number {
  const totalInches = feet * 12 + inches;
  return totalInches * 2.54;
}

// Weight: kg <-> lbs
const LBS_PER_KG = 2.20462;

export function kgToLbs(kg: number): number {
  return kg * LBS_PER_KG;
}

export function lbsToKg(lbs: number): number {
  return lbs / LBS_PER_KG;
}

// Formatting helpers
export function formatHeightMetric(cm: number): string {
  return `${Math.round(cm)} cm`;
}

export function formatHeightImperial(cm: number): string {
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}'${inches}"`;
}

export function formatWeightMetric(kg: number): string {
  return `${Math.round(kg)} kg`;
}

export function formatWeightImperial(kg: number): string {
  return `${Math.round(kgToLbs(kg))} lbs`;
}
```

---

## Server Actions

```typescript
// src/app/[locale]/player/actions.ts
"use server";

import { authMutate } from "@/lib/graphql-request";
import { revalidatePath } from "next/cache";

interface CreatePlayerInput {
  firstName: string;
  lastName: string;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  biography?: string | null;
}

interface UpdatePlayerInput {
  id: string;
  firstName?: string;
  lastName?: string;
  age?: number | null;
  height?: number | null;
  weight?: number | null;
  biography?: string | null;
}

interface PlayerActionResult {
  success: boolean;
  player?: Player;
  error?: string;
}

export async function createPlayer(
  input: CreatePlayerInput
): Promise<PlayerActionResult> {
  try {
    const response = await authMutate({
      createPlayer: {
        __args: { input },
        player: {
          id: true,
          firstName: true,
          lastName: true,
          age: true,
          height: true,
          weight: true,
          biography: true,
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    revalidatePath("/player");
    return {
      success: true,
      player: response.data.createPlayer.player,
    };
  } catch {
    return { success: false, error: "Failed to create player" };
  }
}

export async function updatePlayer(
  input: UpdatePlayerInput
): Promise<PlayerActionResult> {
  try {
    // Build input object with only changed fields
    const mutationInput: Record<string, unknown> = { id: input.id };

    // Only include fields that are explicitly provided
    if (input.firstName !== undefined) mutationInput.firstName = input.firstName;
    if (input.lastName !== undefined) mutationInput.lastName = input.lastName;
    if ("age" in input) mutationInput.age = input.age;
    if ("height" in input) mutationInput.height = input.height;
    if ("weight" in input) mutationInput.weight = input.weight;
    if ("biography" in input) mutationInput.biography = input.biography;

    const response = await authMutate({
      updatePlayer: {
        __args: { input: mutationInput },
        player: {
          id: true,
          firstName: true,
          lastName: true,
          age: true,
          height: true,
          weight: true,
          biography: true,
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    revalidatePath("/player");
    return {
      success: true,
      player: response.data.updatePlayer.player,
    };
  } catch {
    return { success: false, error: "Failed to update player" };
  }
}
```

---

## Page Implementation

```typescript
// src/app/[locale]/player/page.tsx
import { auth } from "@/lib/auth";
import { authQuery } from "@/lib/graphql-request";
import { redirect } from "@/i18n/navigation";
import { headers } from "next/headers";
import { PlayerProfileCard } from "@/components/player/player-profile-card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Player Profile | Playground",
  description: "Manage your player profile",
};

export default async function PlayerPage() {
  // Auth check
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/"); // Or to sign-in page
  }

  // Fetch data
  const response = await authQuery({
    me: {
      id: true,
      firstName: true,
      lastName: true,
    },
    currentPlayer: {
      id: true,
      firstName: true,
      lastName: true,
      age: true,
      height: true,
      weight: true,
      biography: true,
    },
  });

  const user = response.data?.me;
  const player = response.data?.currentPlayer;

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <PlayerProfileCard
        initialPlayer={player}
        userDefaults={{
          firstName: user.firstName,
          lastName: user.lastName,
        }}
      />
    </main>
  );
}
```

```typescript
// src/app/[locale]/player/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function PlayerLoading() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-48" />
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-10 w-32" />
        </CardContent>
      </Card>
    </main>
  );
}
```

---

## Navbar Integration

Update the navbar to include a "Player" link for authenticated users.

```typescript
// src/components/playground/navbar.tsx (modifications)

// The navbar is currently a server component but uses useTranslations which
// suggests it may need to check auth status. Since AuthButton already handles
// the client-side auth check, we can follow the same pattern.

// Option 1: Keep as server component, add Player link
// This requires checking session on the server for each navbar render.

// Option 2: Create NavbarLinks as a client component
// This is cleaner and avoids server-side auth check on every page load.

// Recommended: Create a new NavbarAuthLinks client component
```

```typescript
// src/components/playground/navbar-auth-links.tsx (new file)
"use client";

import { Link } from "@/i18n/navigation";
import { useSession } from "@/lib/auth-client";
import { useTranslations, useLocale } from "next-intl";
import { NavigationMenuItem, NavigationMenuLink } from "../ui/navigation-menu";
import { TypographyP } from "../ui/typography";

export function NavbarAuthLinks() {
  const { data: session } = useSession();
  const t = useTranslations();
  const locale = useLocale();

  if (!session?.user) return null;

  return (
    <NavigationMenuItem>
      <NavigationMenuLink asChild>
        <Link
          href="/player"
          className="px-4 py-2 text-sm font-medium transition-colors hover:text-primary"
        >
          <TypographyP>{t("header.player")}</TypographyP>
        </Link>
      </NavigationMenuLink>
    </NavigationMenuItem>
  );
}
```

---

## shadcn/ui Components Required

### Already Available

- `Button` - `/src/components/ui/button.tsx`
- `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter`, `CardAction` - `/src/components/ui/card.tsx`
- `Input` - `/src/components/ui/input.tsx`
- `Textarea` - `/src/components/ui/textarea.tsx`
- `Label` - `/src/components/ui/label.tsx`
- `Form`, `FormField`, `FormItem`, `FormLabel`, `FormControl`, `FormMessage`, `FormDescription` - `/src/components/ui/form.tsx`
- `Skeleton` - `/src/components/ui/skeleton.tsx`
- `Badge` - `/src/components/ui/badge.tsx`
- `Tooltip` - `/src/components/ui/tooltip.tsx`

### Need to Add

```bash
npx shadcn@latest add dialog
npx shadcn@latest add switch
npx shadcn@latest add alert
```

- `Dialog` - For PlayerRequiredModal
- `Switch` - For UnitToggle (metric/imperial)
- `Alert` - For error states and onboarding banner

---

## i18n Keys

Add to `messages/en.json`:

```json
{
  "header": {
    "home": "Home",
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
      "in": "in"
    },
    "actions": {
      "edit": "Edit",
      "save": "Save",
      "cancel": "Cancel",
      "create": "Create Player",
      "saving": "Saving..."
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
    "success": {
      "created": "Player profile created successfully",
      "updated": "Player profile updated successfully"
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

## Error Handling Strategy

### Query Errors (Page Load)

```typescript
// src/app/[locale]/player/page.tsx
export default async function PlayerPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    redirect("/");
  }

  const response = await authQuery(playerPageQuery);

  // Handle query errors
  if (response.errors?.length > 0) {
    return <PlayerErrorState error={response.errors[0].message} />;
  }

  // ...
}
```

### Mutation Errors (Create/Update)

Handled in server actions, returned to client components via result object, displayed using `toast.error()`.

### Network Errors

Caught in try/catch blocks in server actions, return generic error message.

---

## Alternative Approaches Considered

### 1. React Query vs useState + Server Actions

**Chosen: useState + Server Actions**

**Trade-offs:**
- Server Actions integrate better with Next.js App Router
- No additional dependency (react-query)
- Simpler mental model for mutations
- Server Actions provide automatic form handling benefits

**Alternative would provide:**
- Automatic cache invalidation
- Optimistic updates
- Background refetching

For a single-resource CRUD page, server actions are simpler and sufficient.

### 2. Single Form Component vs Separate Create/Edit Forms

**Chosen: Single `PlayerForm` component with `mode` prop**

**Trade-offs:**
- DRY - shared validation and UI
- Mode-specific logic is minimal (required vs optional fields)
- Easier to maintain consistency

**Alternative would provide:**
- Cleaner separation of concerns
- Potentially simpler individual components

### 3. Unit Toggle: Per-field vs Global

**Chosen: Global toggle with localStorage persistence**

**Trade-offs:**
- Users set preference once, applies everywhere
- Consistent experience across sessions
- Simpler UI (one toggle, not per-field)

**Alternative (per-field) would provide:**
- More granular control
- Better for users who prefer different units for height vs weight

### 4. Navbar Link: Server Auth Check vs Client Component

**Chosen: Client component (`NavbarAuthLinks`)**

**Trade-offs:**
- Avoids server-side auth check on every page load
- Consistent with existing `AuthButton` pattern
- May show flash before auth loads (mitigated by skeleton)

**Alternative (server component) would provide:**
- No flash, links present immediately if authenticated
- Requires passing session through props or fetching on every page

---

## API Suggestions / Improvements

### Current Schema Assessment

The GraphQL schema adequately supports all required operations:
- `currentPlayer` query returns the authenticated user's player (or null)
- `me` query provides user defaults for name fields
- `createPlayer` and `updatePlayer` mutations match requirements
- `UpdatePlayerInput` supports partial updates via omitted fields

### Potential Improvements

1. **Combine `me` and `currentPlayer` into single query field**
   ```graphql
   type CurrentUser {
     id: ID!
     firstName: String!
     lastName: String!
     email: String!
     player: Player  # Already exists, good!
   }
   ```
   The schema already has `CurrentUser.player`, so we can simplify our query:
   ```typescript
   const playerPageQuery = {
     me: {
       id: true,
       firstName: true,
       lastName: true,
       player: {
         id: true,
         firstName: true,
         lastName: true,
         age: true,
         height: true,
         weight: true,
         biography: true,
       },
     },
   };
   ```
   This is actually the better approach - use `me.player` instead of separate `currentPlayer`.

2. **Sport Preferences (Future)**
   The schema will need:
   ```graphql
   type Player {
     # existing fields...
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

   input CreatePlayerInput {
     # existing fields...
     sportPreferences: [SportPreferenceInput!]
   }

   input SportPreferenceInput {
     sport: SportType!
     skillLevel: SkillLevel!
   }
   ```

---

## File Structure Summary

```
src/
  app/
    [locale]/
      player/
        page.tsx              # Server component - main page
        actions.ts            # Server actions for mutations
        loading.tsx           # Loading skeleton
  components/
    player/
      player-profile-card.tsx # Client - view/edit orchestrator
      player-view.tsx         # Client - display player info
      player-form.tsx         # Client - create/edit form
      player-onboarding-banner.tsx  # Client - onboarding prompt
      player-required-modal.tsx     # Client - gating modal
      unit-toggle.tsx         # Client - metric/imperial toggle
    playground/
      navbar.tsx              # Updated - import NavbarAuthLinks
      navbar-auth-links.tsx   # New - auth-aware navigation
  hooks/
    use-unit-preference.ts    # Custom hook for unit preference
  lib/
    unit-conversion.ts        # Pure conversion functions
    types/
      player.ts               # Player TypeScript types
messages/
  en.json                     # Updated with player translations
```

---

## Implementation Order

1. **Infrastructure**
   - Add shadcn/ui components (dialog, switch, alert)
   - Create `src/lib/unit-conversion.ts`
   - Create `src/hooks/use-unit-preference.ts`
   - Create `src/lib/types/player.ts`
   - Update `messages/en.json` with i18n keys

2. **Core Components**
   - Create `src/components/player/unit-toggle.tsx`
   - Create `src/components/player/player-form.tsx`
   - Create `src/components/player/player-view.tsx`
   - Create `src/components/player/player-profile-card.tsx`

3. **Page and Actions**
   - Create `src/app/[locale]/player/actions.ts`
   - Create `src/app/[locale]/player/page.tsx`
   - Create `src/app/[locale]/player/loading.tsx`

4. **Navbar Integration**
   - Create `src/components/playground/navbar-auth-links.tsx`
   - Update `src/components/playground/navbar.tsx`

5. **Supplementary Components**
   - Create `src/components/player/player-onboarding-banner.tsx`
   - Create `src/components/player/player-required-modal.tsx`

6. **Testing and Polish**
   - Verify all validation scenarios
   - Test unit conversion edge cases
   - Test localStorage persistence
   - Responsive design verification

---

## Sport Preferences Placeholder

Per requirements, sport preferences are blocked on API support. The design includes placeholder components that can be implemented once the API is ready:

```typescript
// src/components/player/sport-preferences-editor.tsx (placeholder)
"use client";

interface SportPreferencesEditorProps {
  value: SportPreference[];
  onChange: (preferences: SportPreference[]) => void;
}

export function SportPreferencesEditor({
  value,
  onChange,
}: SportPreferencesEditorProps) {
  // TODO: Implement when API supports sport preferences
  return null;
}
```

```typescript
// src/components/player/sport-preferences-display.tsx (placeholder)
interface SportPreferencesDisplayProps {
  preferences: SportPreference[];
}

export function SportPreferencesDisplay({
  preferences,
}: SportPreferencesDisplayProps) {
  // TODO: Implement when API supports sport preferences
  if (!preferences.length) return null;
  return null;
}
```

---

## Acceptance Criteria Mapping

| AC # | Requirement | Implementation |
|------|-------------|----------------|
| 1 | Navigate to `/[locale]/player` via navbar | `NavbarAuthLinks` component |
| 2 | Users without player see create form | `PlayerProfileCard` mode logic |
| 3 | Create player with valid names | `PlayerForm` with Zod validation |
| 4 | Switch to view after create | `PlayerProfileCard` state management |
| 5 | Users with player see view mode | `PlayerView` component |
| 6 | Edit button switches to edit mode | `PlayerProfileCard` mode toggle |
| 7 | Update player information | `updatePlayer` server action |
| 8 | Switch to view after update | `PlayerProfileCard` state management |
| 9 | Cancel edit discards changes | Form reset on cancel |
| 10 | Validation prevents invalid submission | Zod schema + react-hook-form |
| 11 | Biography word count | `PlayerForm` word counter UI |
| 12 | Loading states | `loading.tsx` + button states |
| 13 | Error messages | Toast notifications |
| 14 | Onboarding banner | `PlayerOnboardingBanner` |
| 15 | Player required modal | `PlayerRequiredModal` |
| 16 | i18n translation keys | `messages/en.json` updates |
| 17 | Responsive design | Tailwind responsive classes |
| 18 | Metric/imperial toggle | `UnitToggle` + `useUnitPreference` |
| 19 | Unit preference persists | localStorage in hook |
| 20 | Correct unit conversion | `unit-conversion.ts` utilities |
| 21 | Name pre-population in create | Pass `userDefaults` prop |
| 22 | Dismissible banner | localStorage in banner component |
