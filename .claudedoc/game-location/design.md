# Game Location -- Design

## 1. Architecture Overview

The feature breaks into four concerns:

1. **Geocoding API route** -- a Next.js route handler that proxies requests to Nominatim, with provider abstraction and rate limiting.
2. **Reusable location autocomplete component** -- a client component that calls the API route, manages its own dropdown state, and follows the WAI-ARIA combobox pattern.
3. **Game form integration** -- wiring the autocomplete into the existing create/update game forms and server actions.
4. **Location display** -- rendering location data on the game detail page and updating the game card display logic.

---

## 2. File Structure

New files to create:

```
src/
  app/
    api/
      geocode/
        search/
          route.ts                        # GET handler -- geocoding proxy
  lib/
    geocoding/
      types.ts                            # Shared types: GeocodeSuggestion, NominatimResponse
      geocode-provider.ts                 # GeocodingProvider interface
      nominatim-provider.ts               # Nominatim implementation
      rate-limiter.ts                     # Token-bucket rate limiter (1 req/s)
    types/
      location.ts                         # LocationValue, LocationInput TS types
    location-utils.ts                     # formatAddress(), formatLocationShort()
  components/
    location/
      location-autocomplete.tsx           # Reusable client component
      use-location-search.ts              # Custom hook -- debounced fetch logic
```

Files to modify:

```
src/components/game/game-form-fields.tsx  # Add location to form schemas/values
src/components/game/create-game-form.tsx  # Add location field between startDate and advanced options
src/components/game/update-game-form.tsx  # Add location field with pre-population and clear
src/components/game/game-detail-header.tsx # Pass location to UpdateGameForm
src/components/game/game-card.tsx         # Update location display logic
src/app/[locale]/game/[id]/page.tsx       # Add location to query; render in Schedule card
src/app/[locale]/game/actions.ts          # Add location to create/update mutations
src/app/[locale]/games/page.tsx           # Add location to games list query
src/app/[locale]/feed/actions.ts          # Update feed location query fields
src/lib/types/game.ts                     # Add location fields to GameNode, GameDetail, CreateGameInput, UpdateGameInput
src/lib/types/feed.ts                     # Update FeedLocation type
src/lib/graphql-fragments.ts              # Add locationFragment
messages/en.json                          # Add i18n keys
```

---

## 3. Geocoding API Route

### 3.1 Provider Abstraction

**`/home/kevinlee/workspace/playground/playground-web-client/src/lib/geocoding/types.ts`**

```typescript
/**
 * A standardized geocoding suggestion returned by the API route.
 * Intentionally aligned with the backend LocationInput shape
 * so the frontend can pass it through with minimal transformation.
 */
export interface GeocodeSuggestion {
  /** Unique identifier for this suggestion (used as React key / ARIA option id) */
  id: string;
  /** Human-readable formatted address for display */
  displayName: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

/** The JSON shape returned by GET /api/geocode/search */
export interface GeocodeSearchResponse {
  suggestions: GeocodeSuggestion[];
}
```

**`/home/kevinlee/workspace/playground/playground-web-client/src/lib/geocoding/geocode-provider.ts`**

```typescript
import type { GeocodeSuggestion } from "./types";

export interface GeocodingProvider {
  search(query: string, limit: number): Promise<GeocodeSuggestion[]>;
}
```

**`/home/kevinlee/workspace/playground/playground-web-client/src/lib/geocoding/nominatim-provider.ts`**

Implements `GeocodingProvider`. Calls `https://nominatim.openstreetmap.org/search` with:
- `q` = search text
- `format=jsonv2`
- `addressdetails=1`
- `limit=5`
- `User-Agent: PlaygroundWebClient/1.0`

Nominatim response typing (relevant fields):

```typescript
interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}
```

Mapping logic:
- `street`: concatenate `house_number` and `road` with a space when both present; use `road` alone if no `house_number`; omit if neither present.
- `city`: first non-nullish of `city`, `town`, `village`, `municipality`.
- `state`: `state` if present.
- `postalCode`: `postcode` if present.
- `country`: `country` (full name). **Filter out** results where `country` is falsy.
- `coordinates`: parse `lat`/`lon` to `parseFloat`.
- `id`: use `place_id` converted to string.
- `displayName`: build from available parts: `[street, city, state, postalCode, country]` joined with `", "`, filtering out undefined parts. Use this instead of Nominatim's `display_name` because Nominatim's format is verbose and includes extraneous detail.

### 3.2 Rate Limiter

**`/home/kevinlee/workspace/playground/playground-web-client/src/lib/geocoding/rate-limiter.ts`**

A simple **token bucket** rate limiter scoped to the Node.js process. Since the API route handler runs in the same Node process, a module-level singleton is sufficient. No external dependencies.

**Known limitation (serverless deployments):** In production deployments on platforms like Vercel, API routes may run in separate serverless function instances. Each instance has its own `RateLimiter` singleton, so the Nominatim rate limit of 1 request/second is not enforced across instances. With N concurrent instances, the actual rate could reach N requests/second. For now this is an acceptable risk because: (a) Nominatim is a temporary provider before migrating to a paid service, (b) the client-side 500ms debounce already spaces requests well apart for each user, and (c) casual usage is unlikely to trigger multiple concurrent instances. For a production deployment with high traffic, a shared rate limiter using Redis or a similar external store would be needed.

```typescript
/**
 * Token-bucket rate limiter.
 * Allows `capacity` requests, refilling 1 token per `refillIntervalMs`.
 * For Nominatim: capacity=1, refillIntervalMs=1000.
 *
 * NOTE: This rate limiter is per-process. In serverless environments with
 * multiple concurrent instances, the effective rate limit is multiplied
 * by the number of instances. See design doc section 3.2 for details.
 */
export class RateLimiter {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillIntervalMs: number,
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  tryAcquire(): boolean {
    this.refill();
    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }
    return false;
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const newTokens = Math.floor(elapsed / this.refillIntervalMs);
    if (newTokens > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + newTokens);
      this.lastRefill = now;
    }
  }
}
```

**Design decision: Return 429 immediately rather than delay.** Delaying requests in the API route would hold server resources and queue up under load. A 429 is cleaner -- the client already debounces at 500ms and the user simply gets the error state (which the requirements already handle). Under normal single-user usage the 500ms client-side debounce already spaces requests to well over 1 second apart, so 429s should be exceedingly rare.

### 3.3 Route Handler

**`/home/kevinlee/workspace/playground/playground-web-client/src/app/api/geocode/search/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import type { GeocodeSearchResponse } from "@/lib/geocoding/types";
import { NominatimProvider } from "@/lib/geocoding/nominatim-provider";
import { RateLimiter } from "@/lib/geocoding/rate-limiter";

const provider = new NominatimProvider();
const limiter = new RateLimiter(1, 1000);

export async function GET(request: NextRequest): Promise<NextResponse> {
  const q = request.nextUrl.searchParams.get("q");

  if (!q || q.trim().length < 2) {
    return NextResponse.json({ suggestions: [] } satisfies GeocodeSearchResponse);
  }

  if (!limiter.tryAcquire()) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 },
    );
  }

  try {
    const suggestions = await provider.search(q.trim(), 5);
    return NextResponse.json({ suggestions } satisfies GeocodeSearchResponse);
  } catch (error) {
    console.error("Geocoding search failed:", error);
    return NextResponse.json(
      { error: "Geocoding service unavailable" },
      { status: 502 },
    );
  }
}
```

**No authentication required.** The route is a lightweight proxy. The requirements explicitly state this.

**Server-side minimum length check**: the route accepts any query of length >= 2 (a defensive floor), but the client enforces >= 4 characters before making a request. This prevents completely empty queries from reaching Nominatim while not being overly restrictive if the client logic changes.

---

## 4. Location Types

### 4.1 Location Value Type (client-side)

**`/home/kevinlee/workspace/playground/playground-web-client/src/lib/types/location.ts`**

```typescript
/**
 * Represents a selected location value in the frontend.
 * Aligned with the backend LocationInput (minus `name`).
 */
export interface LocationValue {
  address: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  /** Optional because a backend Location may have null coordinates */
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  /** Display string shown in the input field */
  displayName: string;
}

/**
 * Location data as returned by the backend on Game queries.
 * Response type: fields present but nullable per convention.
 */
export interface Location {
  id: string;
  name: string | null;
  address: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  coordinates: {
    latitude: number;
    longitude: number;
  } | null;
}
```

### 4.2 Location Utility Functions

**`/home/kevinlee/workspace/playground/playground-web-client/src/lib/location-utils.ts`**

```typescript
import type { Location } from "@/lib/types/location";

/**
 * Formats a full address for display (e.g., in the autocomplete input
 * or on the game detail page).
 *
 * Example: "123 Main St, Springfield, IL 62701, United States"
 */
export function formatAddress(address: {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
}): string {
  return [address.street, address.city, address.state, address.postalCode, address.country]
    .filter(Boolean)
    .join(", ");
}

/**
 * Short location text for game cards.
 * Priority: "city, state" > "state, country" > "country"
 */
export function formatLocationShort(location: Location): string {
  const { city, state, country } = location.address;
  if (city) {
    return state ? `${city}, ${state}` : city;
  }
  if (state) {
    return `${state}, ${country}`;
  }
  return country;
}

/**
 * Converts a Location (response type) to a LocationValue (form type).
 * Used when pre-populating the update form.
 *
 * Null coordinates are mapped to undefined (omitted) rather than a
 * fallback like (0, 0), to avoid writing bogus data back to the
 * server if the form is re-submitted without changes.
 */
export function locationToValue(location: Location): import("@/lib/types/location").LocationValue {
  return {
    address: {
      street: location.address.street || undefined,
      city: location.address.city || undefined,
      state: location.address.state || undefined,
      postalCode: location.address.postalCode || undefined,
      country: location.address.country,
    },
    coordinates: location.coordinates ?? undefined,
    displayName: formatAddress(location.address),
  };
}
```

---

## 5. Location Autocomplete Component

### 5.1 Custom Hook

**`/home/kevinlee/workspace/playground/playground-web-client/src/components/location/use-location-search.ts`**

A `"use client"` hook that encapsulates debounced fetching.

```typescript
"use client";

import type { GeocodeSuggestion, GeocodeSearchResponse } from "@/lib/geocoding/types";
import { useCallback, useEffect, useRef, useState } from "react";

const DEBOUNCE_MS = 500;
const MIN_CHARS = 4;

interface UseLocationSearchResult {
  suggestions: GeocodeSuggestion[];
  isLoading: boolean;
  error: string | null;
  search: (query: string) => void;
  clearSuggestions: () => void;
}

export function useLocationSearch(): UseLocationSearchResult {
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const clearSuggestions = useCallback(() => {
    setSuggestions([]);
    setError(null);
  }, []);

  const search = useCallback((query: string) => {
    // Cancel any pending debounce
    if (debounceRef.current) clearTimeout(debounceRef.current);
    // Abort any in-flight request
    if (abortRef.current) abortRef.current.abort();

    if (query.length < MIN_CHARS) {
      setSuggestions([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const params = new URLSearchParams({ q: query });
        const response = await fetch(`/api/geocode/search?${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          setError("error");
          setSuggestions([]);
          return;
        }

        const data: GeocodeSearchResponse = await response.json();
        setSuggestions(data.suggestions);
        setError(null);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError("error");
        setSuggestions([]);
      } finally {
        // Only clear loading if this request was not aborted.
        // An aborted request means a newer search call is pending
        // and has already set isLoading=true. Clearing it here would
        // cause the spinner to flicker off during the debounce wait.
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    }, DEBOUNCE_MS);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return { suggestions, isLoading, error, search, clearSuggestions };
}
```

### 5.2 LocationAutocomplete Component

**`/home/kevinlee/workspace/playground/playground-web-client/src/components/location/location-autocomplete.tsx`**

This is a `"use client"` component. It is reusable and **not game-specific**. It implements the WAI-ARIA combobox pattern manually rather than using the existing `@base-ui/react` Combobox because the existing Combobox is designed for static option lists with client-side filtering. The location autocomplete requires **async remote search** with custom debouncing, which does not fit the base-ui Combobox model.

**Component API:**

```typescript
interface LocationAutocompleteProps {
  /** Currently selected location, or null if none */
  value: LocationValue | null;
  /** Called when a location is selected from the dropdown */
  onSelect: (location: LocationValue) => void;
  /** Called when the clear button is clicked */
  onClear: () => void;
  /** Disabled state */
  disabled?: boolean;
}
```

**Implementation details:**

- The component renders a text `<input>` with `role="combobox"`.
- It uses `useLocationSearch()` for debounced API calls.
- A dropdown `<ul role="listbox">` is rendered below the input when suggestions are available, the input has focus, and the query length >= 4.
- Each `<li role="option">` has `aria-selected` for the highlighted item.
- Keyboard navigation: `ArrowDown`/`ArrowUp` move the highlighted index, `Enter` selects, `Escape` closes.
- `aria-activedescendant` on the input points to the highlighted option's `id`.
- `aria-controls` on the input references the listbox `id`.
- When a suggestion is selected:
  - `onSelect` is called with a `LocationValue` constructed from the `GeocodeSuggestion`.
  - The input text is set to the `displayName`.
  - The dropdown closes.
- When the clear button (X icon) is clicked:
  - `onClear` is called.
  - The input text is cleared.
- The clear button is only visible when `value !== null` (a location is selected or pre-populated).
- **Click-outside handler**: The entire component is wrapped in a container `<div>` with a `ref`. A `useEffect` listens for `mousedown` events on `document` when the dropdown is open and closes it if the click target is outside the container. This is essential for mobile devices where the Escape key is unavailable.
- **Animation**: the dropdown uses a CSS transition with `@media (prefers-reduced-motion: reduce)` setting `transition-duration: 0s`.
- **Touch**: each `<li>` option gets `touch-action: manipulation` via Tailwind class `touch-manipulation`.
- **Loading state**: a `Loader2` spinner (from lucide-react) is shown inside the input (in the addon area) while `isLoading` is true.
- **No results**: a non-interactive message appears in the dropdown.
- **Error state**: a non-interactive error message appears in the dropdown.
- Suggestion text is truncated with `truncate` class to prevent layout breakage.

**Click-outside implementation:**

```typescript
const containerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!isOpen) return;

  function handleClickOutside(e: MouseEvent) {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setIsOpen(false);
    }
  }
  document.addEventListener("mousedown", handleClickOutside);
  return () => document.removeEventListener("mousedown", handleClickOutside);
}, [isOpen]);
```

The component wraps everything in `<div ref={containerRef} className="relative">`. Using `mousedown` instead of `click` ensures the dropdown closes before the click event propagates, which prevents issues with other interactive elements (e.g., clicking the submit button while the dropdown is open).

**Styling approach**: Uses the same `InputGroup` / `InputGroupAddon` / `InputGroupInput` components from `@/components/ui/input-group` for visual consistency with other inputs. The dropdown is positioned absolutely below the input group, using a portal is unnecessary for a simple list.

**Why not use the existing shadcn Combobox?** The existing `Combobox` from `@base-ui/react` assumes a static list of options that gets filtered client-side. Our use case requires:
1. Async remote search (API calls on each keystroke)
2. Custom debouncing logic
3. No client-side filtering -- the server returns already-filtered results
4. The options list changes dynamically based on network responses

Building a custom ARIA combobox is the right approach here. It is simpler and more correct than trying to fight the base-ui Combobox's assumptions.

---

## 6. GraphQL Fragment

### `locationFragment` in `/home/kevinlee/workspace/playground/playground-web-client/src/lib/graphql-fragments.ts`

```typescript
/**
 * Location fields fragment for Game queries.
 * Use as: location: locationFragment
 */
export const locationFragment = {
  id: true,
  name: true,
  address: {
    street: true,
    city: true,
    state: true,
    postalCode: true,
    country: true,
  },
  coordinates: {
    latitude: true,
    longitude: true,
  },
};
```

---

## 7. Game Type Updates

### 7.1 `/home/kevinlee/workspace/playground/playground-web-client/src/lib/types/game.ts`

Add `location` to response types:

```typescript
import type { Location } from "@/lib/types/location";

// Add to GameNode:
export interface GameNode {
  // ...existing fields...
  location: Location | null;
}

// Add to GameDetail:
export interface GameDetail {
  // ...existing fields...
  location: Location | null;
}
```

Add `location` to create input types. Since all three sport-specific create inputs have the same optional `location: LocationInput` field, we add it to each:

```typescript
// Add to each Create*GameInput:
export interface CreateBasketballGameInput {
  sportType: SportType.BASKETBALL;
  startDate: string;
  location?: {
    address: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country: string;
    };
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  metadata: { /* ... */ };
}

// Same pattern for CreateTennisGameInput, CreateFootballGameInput
```

Add `location` to `UpdateGameInput`:

```typescript
export interface UpdateGameInput {
  id: number;
  startDate?: string;
  /**
   * PATCH semantics for location:
   * - undefined (omit): no change
   * - null: clear the location
   * - object: set/update the location
   *
   * IMPORTANT: This assumes the backend interprets `location: null` as
   * "clear the location." The schema comment on `metadata` says "If null
   * will not be updated," but requirements state `location: null` should
   * clear. If the backend treats location the same as metadata (null = no-op),
   * a backend change will be needed (e.g., a `clearLocation: Boolean` field).
   * Verify with the backend team before release.
   */
  location?: {
    address: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country: string;
    };
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  } | null;
  metadata?: { /* ... */ };
}
```

### 7.2 `/home/kevinlee/workspace/playground/playground-web-client/src/lib/types/feed.ts`

Update `FeedLocation` to include all address fields (we need `country` for fallback display):

```typescript
export interface FeedLocation {
  name: string | null;
  address: {
    city: string;
    state: string;
    country: string;
  };
}
```

---

## 8. Game Form Integration

### 8.1 Form Schema Updates

**`/home/kevinlee/workspace/playground/playground-web-client/src/components/game/game-form-fields.tsx`**

Add `location` as an optional field to both schemas. Since `LocationValue` is a complex object, we validate it with a Zod object schema that accepts undefined (optional):

```typescript
import type { LocationValue } from "@/lib/types/location";

const locationSchema = z.object({
  address: z.object({
    street: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string(),
  }),
  coordinates: z.object({
    latitude: z.number(),
    longitude: z.number(),
  }).optional(),
  displayName: z.string(),
}).optional();

// Add to createGameFormSchema:
export const createGameFormSchema = z.object({
  // ...existing fields...
  location: locationSchema,
}).refine(/* ...existing refinement... */);

// Add to updateGameFormSchema:
export const updateGameFormSchema = z.object({
  // ...existing fields...
  location: locationSchema.nullable(), // null = clear, undefined = no change
});
```

Add to form value interfaces:

```typescript
export interface CreateGameFormValues {
  // ...existing fields...
  location?: LocationValue;
}

export interface UpdateGameFormValues {
  // ...existing fields...
  location?: LocationValue | null;
}
```

### 8.2 Create Game Form

**`/home/kevinlee/workspace/playground/playground-web-client/src/components/game/create-game-form.tsx`**

Changes:
1. Add `location: undefined as LocationValue | undefined` to `defaultValues`.
2. Add a `form.Field` for `location` between the `startDate` field and the `Collapsible` for advanced options.
3. Inside the field, render the `LocationAutocomplete` component.
4. On `onSelect`: call `field.handleChange(locationValue)`.
5. On `onClear`: call `field.handleChange(undefined)`.
6. In `onSubmit`, if `value.location` is defined, include it in the mutation input.

The field rendering:

```tsx
<form.Field name="location">
  {(field) => (
    <Field>
      <FieldLabel htmlFor="location">
        {t("game.form.location")}
      </FieldLabel>
      <LocationAutocomplete
        value={field.state.value ?? null}
        onSelect={(loc) => field.handleChange(loc)}
        onClear={() => field.handleChange(undefined)}
        disabled={isPending}
      />
    </Field>
  )}
</form.Field>
```

### 8.3 Update Game Form

**`/home/kevinlee/workspace/playground/playground-web-client/src/components/game/update-game-form.tsx`**

Changes:
1. Add `currentLocation?: Location | null` to `UpdateGameFormProps`. The `GameDetailHeader` will pass `game.location`.
2. In `buildDefaultValues`, compute the initial location:
   - If `currentLocation` exists, convert it to `LocationValue` using `locationToValue()`.
   - Otherwise, `undefined`.
3. Cast the default value to `LocationValue | null | undefined` to ensure TanStack Form infers the correct union type for the field, allowing `field.handleChange(null)` without a TypeScript error.
4. Add the `location` field between `startDate` and the `Collapsible`, same as create form.
5. **Tracking "dirty" state for PATCH semantics**: use a `locationDirtyRef` set by the `onSelect`/`onClear` callbacks.

Default value type handling for TanStack Form:

```typescript
function buildDefaultValues(
  currentStartDate: string,
  metadata: GameMetadata,
  currentLocation?: Location | null,
) {
  return {
    // ...existing fields...
    location: (currentLocation
      ? locationToValue(currentLocation)
      : undefined) as LocationValue | null | undefined,
  };
}
```

The explicit cast to `LocationValue | null | undefined` ensures TanStack Form infers the field type as the full union, so that `field.handleChange(null)` (used when clearing) does not produce a TypeScript error. Without this cast, TanStack Form would infer the type from the runtime value (either `LocationValue` or `undefined`), excluding `null` from the allowed types.

Dirty tracking and submit logic:

```typescript
const locationDirtyRef = useRef(false);

// In the field:
<LocationAutocomplete
  value={field.state.value ?? null}
  onSelect={(loc) => {
    field.handleChange(loc);
    locationDirtyRef.current = true;
  }}
  onClear={() => {
    field.handleChange(null);
    locationDirtyRef.current = true;
  }}
  disabled={isPending}
/>

// In onSubmit:
if (locationDirtyRef.current) {
  if (value.location === null || value.location === undefined) {
    // User cleared the location -- send null to clear on backend.
    // IMPORTANT: This assumes the backend treats `location: null` as "clear."
    // See the note on UpdateGameInput in section 7.1 for details.
    mutationInput.location = null;
  } else {
    mutationInput.location = {
      address: value.location.address,
      // Only include coordinates if present (avoids sending bogus data)
      ...(value.location.coordinates && {
        coordinates: value.location.coordinates,
      }),
    };
  }
}
```

### 8.4 Server Action Updates

**`/home/kevinlee/workspace/playground/playground-web-client/src/app/[locale]/game/actions.ts`**

**`createGame`**: When `input.location` is defined, add it to `mutationInput[sportKey]`:

```typescript
const sportInput: Record<string, unknown> = {
  startDate: input.startDate,
  metadata,
};

if (input.location) {
  sportInput.location = {
    address: input.location.address,
    // Only include coordinates if present
    ...(input.location.coordinates && {
      coordinates: input.location.coordinates,
    }),
  };
  // Do NOT include `name` per requirements
}

const mutationInput = { [sportKey]: sportInput };
```

**`updateGame`**: When `input.location` is defined or explicitly `null`:

```typescript
if (input.location !== undefined) {
  // null = clear, object = update
  // IMPORTANT: Assumes backend treats `location: null` as "clear the location."
  // See design doc section 7.1 for the caveat about PATCH semantics.
  mutationInput.location = input.location;
}
```

Note: `json-to-graphql-query` will serialize `null` as `null` in the GraphQL query, which is the correct PATCH semantics for clearing. However, this depends on backend behavior -- see the assumption documented in section 7.1.

### 8.5 GameDetailHeader Pass-Through

**`/home/kevinlee/workspace/playground/playground-web-client/src/components/game/game-detail-header.tsx`**

The `UpdateGameForm` now needs `currentLocation`, so the header passes it:

```tsx
<UpdateGameForm
  gameId={game.id}
  currentStartDate={game.startDate}
  metadata={game.metadata}
  sportType={game.sportType}
  currentLocation={game.location ?? null}
  onSuccess={() => setShowUpdateDialog(false)}
/>
```

---

## 9. GraphQL Query Updates

### 9.1 Game Detail Page Query

**`/home/kevinlee/workspace/playground/playground-web-client/src/app/[locale]/game/[id]/page.tsx`**

Add `location: locationFragment` to the `game` query:

```typescript
import { locationFragment } from "@/lib/graphql-fragments";

const gameResponse = await authQuery({
  game: {
    __args: { id },
    id: true,
    startDate: true,
    endDate: true,
    sportType: true,
    metadata: gameMetadataFragment,
    gameStatus: true,
    location: locationFragment,
    participants: { /* ...existing... */ },
    media: { /* ...existing... */ },
  },
});
```

### 9.2 Games List Page Query

**`/home/kevinlee/workspace/playground/playground-web-client/src/app/[locale]/games/page.tsx`**

Add location to the games list node query (only the fields needed for the game card display):

```typescript
node: {
  // ...existing fields...
  location: {
    name: true,
    address: {
      city: true,
      state: true,
      country: true,
    },
  },
},
```

### 9.3 `loadMoreGames` Server Action

Same as games list -- add `location` to the node selection in `/home/kevinlee/workspace/playground/playground-web-client/src/app/[locale]/game/actions.ts`.

### 9.4 Feed Query

**`/home/kevinlee/workspace/playground/playground-web-client/src/app/[locale]/feed/actions.ts`**

Add `country` to the location address fields:

```typescript
location: {
  name: true,
  address: {
    city: true,
    state: true,
    country: true,
  },
},
```

---

## 10. Location Display

### 10.1 Game Detail Page -- Schedule Card

In `/home/kevinlee/workspace/playground/playground-web-client/src/app/[locale]/game/[id]/page.tsx`, add a location row inside the Schedule card after the end date, conditionally rendered.

The existing Schedule card uses raw `<span>` elements for date display (lines 216-225 of the current file). For consistency within this card, the location row follows the same pattern rather than introducing `TypographyMuted`. However, we use a `<p>` element instead of `<span>` for the location text since it is a block of content:

```tsx
import { MapPin } from "lucide-react";
import { formatAddress } from "@/lib/location-utils";

{/* Inside <CardContent className="space-y-2"> */}
{game.location && (
  <div className="flex items-start gap-2">
    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
    <p className="text-sm text-muted-foreground break-words">
      {formatAddress(game.location.address)}
    </p>
  </div>
)}
```

Using `items-start` + `mt-0.5` on the icon keeps the pin aligned with the first line of text even when the address wraps. `break-words` (Tailwind's `overflow-wrap: break-word`) prevents horizontal overflow. We use `text-sm` to match the existing muted-foreground text size in the schedule card.

**Note on Typography components:** The CLAUDE.md instructions state all text should use Typography components. The existing schedule card predates this convention and uses raw `<span>` elements for the date rows. Ideally, a follow-up PR would migrate all schedule card text to Typography components, but for this feature we match the existing pattern to keep the diff focused. The location text uses `<p>` with the same `text-muted-foreground text-sm` styling that `TypographyMuted` provides.

### 10.2 Game Card -- Updated Display Logic

**`/home/kevinlee/workspace/playground/playground-web-client/src/components/game/game-card.tsx`**

Replace the existing `locationText` computation:

```typescript
import { formatLocationShort } from "@/lib/location-utils";

const locationText = game.location ? formatLocationShort(game.location) : null;
```

The `FeedLocation` and the game card's `location` prop types both need `country` on `address`. Update the `GameCardProps` type:

```typescript
interface GameCardProps {
  game: GameNode & {
    location?: {
      name: string | null;
      address: {
        city: string;
        state: string;
        country: string;
      };
    } | null;
    viewerFriendPlayers?: ViewerFriendPlayers;
  };
}
```

The `formatLocationShort` function accepts a `Location` type. For the game card which may have a partial location (only city/state/country), we create an overload or a simpler inline version that accepts the card's location shape. Given the game card receives a subset of fields, the simplest approach is to inline the logic:

```typescript
function getLocationText(location: { name: string | null; address: { city: string; state: string; country: string } }): string {
  const { city, state, country } = location.address;
  if (city) return state ? `${city}, ${state}` : city;
  if (state) return `${state}, ${country}`;
  return country;
}

const locationText = game.location ? getLocationText(game.location) : null;
```

Add `truncate` and `min-w-0` classes to the location text to prevent layout breakage:

```tsx
{locationText && (
  <TypographyMuted className="flex items-center gap-1 min-w-0">
    <MapPin className="h-4 w-4 shrink-0" />
    <span className="truncate">{locationText}</span>
  </TypographyMuted>
)}
```

---

## 11. i18n Additions

**`/home/kevinlee/workspace/playground/playground-web-client/messages/en.json`**

Add at the top level:

```json
{
  "location": {
    "searchPlaceholder": "Search for an address\u2026",
    "noResults": "No results found",
    "error": "Could not load suggestions. Check your connection and try again.",
    "clear": "Clear location",
    "label": "Location",
    "loading": "Searching\u2026"
  }
}
```

Add inside the existing `"game"` object:

```json
{
  "game": {
    "form": {
      "location": "Location"
    },
    "detail": {
      "location": "Location"
    }
  }
}
```

Note: `game.detail.location` is defined in the requirements. It is used as an `aria-label` on the location row in the schedule card for accessibility:

```tsx
<div className="flex items-start gap-2" aria-label={t("game.detail.location")}>
```

---

## 12. State Management Summary

| Concern | Approach |
|---|---|
| Autocomplete suggestions | Local state in `useLocationSearch` hook |
| Debouncing | `setTimeout` in `useLocationSearch` with cleanup |
| Abort stale requests | `AbortController` in `useLocationSearch`; `finally` block guards against aborted signals |
| Dropdown open/close | Local `isOpen` state in `LocationAutocomplete`, closed via Escape key, selection, or click-outside handler |
| Selected location in form | TanStack Form field state (`field.handleChange`) |
| Dirty tracking (update form) | `useRef<boolean>` set by `onSelect`/`onClear` callbacks |
| Rate limiting | Module-level `RateLimiter` singleton in the API route (per-process; see section 3.2 for serverless caveat) |

---

## 13. Component Hierarchy

```
CreateGameDialog / GameDetailHeader (Dialog for UpdateGameForm)
  CreateGameForm / UpdateGameForm ("use client")
    form.Field name="sportType" (create only)
    form.Field name="subtype" (create only)
    form.Field name="startDate"
    form.Field name="location"
      Field + FieldLabel
        LocationAutocomplete ("use client", reusable)
          <div ref={containerRef}> (click-outside boundary)
            useLocationSearch (custom hook)
            InputGroup + InputGroupInput + InputGroupAddon
            <ul role="listbox"> (dropdown)
              <li role="option"> (per suggestion)
    Collapsible (Advanced Options)
      ...sport-specific fields...
```

```
GameDetailPage (Server Component)
  Schedule Card
    Start Date row
    End Date row (conditional)
    Location row (conditional) -- MapPin icon + formatted address (aria-label)

GameCard ("use client")
  ...existing content...
  Location text (conditional) -- MapPin icon + short format, truncated
```

---

## 14. Alternatives Considered

### 14.1 Using the Existing Base-UI Combobox

**Rejected.** The base-ui `Combobox` component filters options client-side and expects all options to be provided upfront as `ComboboxItem` children. It does not support:
- Async remote search on input change
- Custom debouncing
- Dynamically changing the option list based on network responses

We would have to fight the component's internal state management. A custom ARIA combobox is cleaner and more maintainable.

### 14.2 Delaying Requests Instead of Returning 429

**Rejected.** Queuing requests server-side:
- Holds Node.js event loop resources for potentially many concurrent users
- Creates unpredictable latency for the user
- Adds complexity (queue management, timeout handling)
- The client debounce already spaces requests well apart

Immediate 429 is simpler and the client already handles errors gracefully.

### 14.3 Using Server Actions for Geocoding Instead of API Route

**Rejected.** Server actions are tied to form submissions and use `POST` semantics. The geocoding search is a read-only `GET` request triggered by user input, not a mutation. An API route is the correct Next.js pattern for this use case. Server actions also cannot be called from arbitrary client code with the same ease (they require `"use server"` functions that are invoked like RPCs). While technically possible, it would be an unusual pattern and would make caching harder.

### 14.4 `next/headers` for API Key Security

Noted for future: when migrating to a paid provider (Google Maps, Mapbox), the API key will be read from `process.env` inside the route handler. No additional changes to the architecture are needed -- the `NominatimProvider` would simply be replaced with a `GoogleMapsProvider` or `MapboxProvider` that reads its key from the environment.

---

## 15. Schema Observations

The backend `Address` response type has all fields as `String!` (non-nullable):

```graphql
type Address {
  street: String!
  city: String!
  state: String!
  postalCode: String!
  country: String!
}
```

But `AddressInput` has most fields as nullable:

```graphql
input AddressInput {
  street: String
  city: String
  state: String
  postalCode: String
  country: String!
}
```

This means the backend will store empty strings (or some default) for address fields not provided by Nominatim. The response type `Address` will always have values for all fields (they may be empty strings). Our `formatAddress()` and `formatLocationShort()` functions handle this correctly by filtering out falsy values.

**Note on `LocationInput.name`**: The requirements explicitly state not to send `name`. The `name` field on `LocationInput` is `String` (nullable/optional), so omitting it from the mutation input is safe. The `json-to-graphql-query` library simply will not include it in the generated query.

**Note on `LocationInput.coordinates`**: The field is `CoordinatesInput` (nullable). Since Nominatim always provides coordinates, we always include them when creating from a geocode result. When pre-populating from existing data, if the backend returns `coordinates: null`, we map to `undefined` in `locationToValue()` and conditionally include coordinates in the mutation only when present. This avoids writing bogus `(0, 0)` coordinates.

**Assumption on `location: null` PATCH semantics**: The `UpdateGameInput.location` field is typed as `LocationInput` (nullable, optional). The requirements state that sending `location: null` should clear the location. However, the schema comment on `metadata` says "If null will not be updated," raising a question about whether the backend applies the same semantics to `location`. **This design proceeds with the assumption that `location: null` clears the location**, as stated in the requirements. The implementation should include a code comment marking this assumption for verification with the backend team. If the backend treats `null` as a no-op (same as omitting), a backend change will be needed -- either changing the `location` field's PATCH behavior or adding a separate `clearLocation: Boolean` input field.

No schema changes are needed on the frontend side. The existing backend schema fully supports all requirements, pending verification of the `location: null` clearing behavior.

---

## 16. Implementation Order

1. **Types and utilities**: `src/lib/types/location.ts`, `src/lib/location-utils.ts`
2. **Geocoding infrastructure**: `src/lib/geocoding/types.ts`, `geocode-provider.ts`, `rate-limiter.ts`, `nominatim-provider.ts`
3. **API route**: `src/app/api/geocode/search/route.ts`
4. **Location autocomplete**: `src/components/location/use-location-search.ts`, `location-autocomplete.tsx`
5. **GraphQL fragment**: `src/lib/graphql-fragments.ts` -- add `locationFragment`
6. **Game type updates**: `src/lib/types/game.ts`, `src/lib/types/feed.ts`
7. **Form integration**: `game-form-fields.tsx`, `create-game-form.tsx`, `update-game-form.tsx`
8. **Server action updates**: `src/app/[locale]/game/actions.ts`
9. **Game detail header**: pass location prop
10. **Game detail page**: query + display
11. **Game card**: update display logic
12. **Games list & feed queries**: add location fields
13. **i18n**: `messages/en.json`
