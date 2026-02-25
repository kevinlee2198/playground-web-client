# Game Location -- Requirements

## Overview

Add a location field to the game creation and editing flows, powered by address autocomplete using a server-side geocoding proxy backed by Nominatim (OpenStreetMap data). Location is optional for all games. The autocomplete component should be built as a reusable piece so it can be applied to other entities in the future.

---

## 1. Functional Requirements

### 1.1 Location Autocomplete Field

- A single text input field labeled "Location" appears in both the create game form and the update game form.
- As the user types, address suggestions are fetched from our internal geocoding API route and displayed in a dropdown.
- The user selects a suggestion to populate the location. There is no manual entry of individual address fields (street, city, state, postalCode, country) -- the result is used as-is.
- The `name` field on `LocationInput` is NOT included. Do not send a `name` value to the backend. (The user indicated this field may be removed from the schema in the future.)

### 1.2 Autocomplete Behavior

- **Minimum characters:** Suggestions are not fetched until the user has typed at least 4 characters.
- **Debounce:** Requests from the frontend to the internal API route are debounced. A debounce delay of 500ms should be used on the client side. (The server-side API route separately enforces Nominatim's 1 request per second rate limit -- see section 1.3.)
- **Result limit:** At most 5 suggestions are shown in the dropdown.
- **Selection:** When the user selects a suggestion, the input text is replaced with a formatted display of the selected address (e.g., "123 Main St, Springfield, IL 62701, United States"). The underlying form state stores the structured address fields and coordinates returned by the API route.
- **Keyboard navigation:** The dropdown supports keyboard navigation (arrow keys to move, Enter to select, Escape to dismiss).
- **ARIA combobox pattern:** The autocomplete must follow the WAI-ARIA combobox pattern:
  - The text input must use `role="combobox"` with `aria-expanded` set to `true` when the dropdown is open and `false` when closed.
  - The dropdown list must use `role="listbox"`.
  - Each suggestion item must use `role="option"` with `aria-selected="true"` on the currently highlighted/active item.
  - The input must use `aria-activedescendant` pointing to the `id` of the currently highlighted option, so screen readers track focus without moving DOM focus out of the input.
  - The listbox must be associated with the input via `aria-controls` (on the input, referencing the listbox `id`) so screen readers announce when results appear and change.

### 1.3 Geocoding API Route

The frontend does not call Nominatim directly. Instead, a Next.js API route acts as a server-side proxy between the frontend and the geocoding provider.

**Endpoint:** The API route exposes a search endpoint (e.g., `/api/geocode/search`) that accepts a query string and returns a standardized list of location suggestions.

**Request:** The frontend calls the API route with the search query as a query parameter (e.g., `GET /api/geocode/search?q=Springfield`).

**Response:** The API route returns a JSON response with a standardized format containing a list of location suggestions. Each suggestion includes:
- A display string (for showing in the dropdown)
- Structured address components (street, city, state, postalCode, country)
- Coordinates (latitude, longitude)

**Rationale for the proxy approach:**
- **Provider portability:** When migrating to Google Maps or Mapbox in the future, only the API route implementation changes. The frontend autocomplete component requires zero changes.
- **API key security:** API keys for future paid providers (Google Maps, Mapbox) stay server-side and are never exposed to the browser.
- **Rate limiting:** Nominatim's 1 request per second policy is enforced in a single place on the server, regardless of how many concurrent users are making requests.
- **Identification:** The server-side request to Nominatim can include a proper `User-Agent` header (e.g., `PlaygroundWebClient/1.0`) and/or `email` parameter as required by Nominatim's usage policy, without browser limitations.

**Provider abstraction:** The API route implementation should use an adapter/provider pattern internally so that the Nominatim-specific logic (calling the Nominatim API, parsing its response format) is isolated. Swapping to a different geocoding provider means implementing a new adapter -- the API route handler and the response format it returns to the frontend remain unchanged.

**Rate limiting:** The API route enforces Nominatim's rate limit of at most 1 request per second server-side. If a request arrives while the rate limit would be exceeded, the API route should either delay the request or return an appropriate response (e.g., HTTP 429 Too Many Requests). The design agent determines the specific rate-limiting approach.

**Nominatim request details (server-side):**
- The API route calls `https://nominatim.openstreetmap.org/search`.
- Required query parameters sent to Nominatim: `q` (search text), `format=jsonv2`, `addressdetails=1` (to get structured address components), `limit=5`.
- A `User-Agent` header identifying the application (e.g., `PlaygroundWebClient/1.0`) must be included in the server-side request to Nominatim.

### 1.4 Mapping Nominatim Response to Standardized Format

The Nominatim `addressdetails` response contains fields like `road`, `house_number`, `city`/`town`/`village`, `state`, `postcode`, `country`, `country_code`, along with `lat` and `lon` on the top-level result.

The API route maps these to the standardized response format. The mapping is:

| Standardized field          | Nominatim source                                                       |
|-----------------------------|------------------------------------------------------------------------|
| `address.street`            | Combine `house_number` + `road` (if present)                           |
| `address.city`              | First non-null of: `city`, `town`, `village`, `municipality`           |
| `address.state`             | `state`                                                                |
| `address.postalCode`        | `postcode`                                                             |
| `address.country`           | `country` (full name) or derive from `country_code`                    |
| `coordinates.latitude`      | `lat` (parse to float)                                                 |
| `coordinates.longitude`     | `lon` (parse to float)                                                 |

- `address.country` is the only required field on the backend's `AddressInput`. If the Nominatim result does not include a country, the suggestion should be excluded from results returned by the API route.
- All other address fields (`street`, `city`, `state`, `postalCode`) are optional on `AddressInput` and should be included only when available from the Nominatim response.
- Coordinates are always available from Nominatim and should always be included.

The standardized response format returned by the API route aligns directly with the backend's `LocationInput` structure, so the frontend can pass the selected suggestion through to the GraphQL mutation with minimal transformation.

### 1.5 Create Game Flow

- The location field appears in the create game form, below the start date field and above the advanced options collapsible.
- Location is optional. The user can submit the form without selecting a location.
- When a location is selected, it is included in the `CreateGameInput` sent to the `createGame` mutation as the `location` field on the sport-specific input (e.g., `CreateBasketballGameInput.location`).

### 1.6 Update Game Flow

- The location field appears in the update game form, below the start date field and above the advanced options collapsible.
- If the game already has a location, the field is pre-populated with a formatted display of the existing address.
- The user can:
  - **Change** the location by typing a new query and selecting a different suggestion.
  - **Clear** the location by clicking a clear/remove button on the field. The clear button must have an `aria-label` using the `location.clear` translation key ("Clear location"). This sends `location: null` to the backend via `updateGame` to remove the location (PATCH semantics: `null` clears the value).
- If the user does not interact with the location field, it is omitted from the update input (PATCH semantics: `undefined` means no change).
- The clear button should only appear when a location is currently set (either pre-populated from existing data or newly selected).

### 1.7 Location Display -- Game Detail Page

- The game detail page (`/game/[id]`) displays the location inside the existing "Schedule" card, as a new row below the start/end dates.
- Format: A MapPin icon followed by the formatted address string.
- Long addresses must wrap gracefully using word-break or overflow-wrap to prevent horizontal overflow within the card layout.
- If the game has no location, the location row is simply not rendered.
- The game detail page query must be updated to fetch `location` data (address fields and coordinates).

### 1.8 Location Display -- Game Card

- The game card component already displays location when present, using `location.name` or falling back to `city, state`. Since we are not populating `name`, the display logic should be updated:
  - Primary display: `city, state` (e.g., "Springfield, IL").
  - If `city` is not available, fall back to `state, country`.
  - If neither city nor state is available, show `country`.
- The location text should be truncated with an ellipsis if it exceeds the available space, to prevent layout breakage on narrow cards.
- No other changes to the game card are needed.

---

## 2. User Experience

### 2.1 Autocomplete Input States

- **Empty / idle:** Placeholder text reads something like "Search for an address\u2026" (translated).
- **Typing (fewer than 4 characters):** No dropdown appears. No network request is made.
- **Typing (4+ characters, waiting for debounce):** No dropdown yet. Optionally show a subtle loading indicator after a brief delay.
- **Loading:** A loading indicator (e.g., spinner) appears in the dropdown or the input to show that results are being fetched.
- **Results returned:** A dropdown list shows up to 5 formatted address suggestions. Each suggestion shows a display string for the address. Long suggestion text should be truncated (single-line truncation with ellipsis) to prevent layout breakage in the dropdown.
- **No results:** The dropdown shows a "No results found" message (translated).
- **Selected:** The input shows the formatted address. A clear button (X icon) appears at the end of the input to allow removing the selection. The clear button must have an `aria-label` using the `location.clear` translation key ("Clear location").
- **Error (API failure):** The dropdown shows a "Could not load suggestions. Check your connection and try again." message (translated). The user can still submit the form without a location.

### 2.2 Form Placement

In both create and update game forms, the location field appears:
1. After the start date field
2. Before the advanced options collapsible section

### 2.3 Reusability

The location autocomplete component should be designed as a generic, reusable component that is not game-specific. It should:
- Accept callbacks for when a location is selected or cleared
- Manage its own autocomplete/dropdown state
- Call the internal geocoding API route -- it has no knowledge of which geocoding provider is being used on the server
- Be usable in any form context, not just game forms

### 2.4 Animation

- Any dropdown open/close animations must honor the `prefers-reduced-motion` media query. When the user prefers reduced motion, animations should be disabled or replaced with an instant show/hide transition.

### 2.5 Touch

- Dropdown suggestion items should use `touch-action: manipulation` to eliminate the 300ms double-tap-to-zoom delay on mobile devices, ensuring taps feel immediate.

---

## 3. Security

- The user must be authenticated to create or update a game (existing requirement -- no change).
- The geocoding API route does not require authentication. It is a lightweight proxy that performs address search only.
- Responses from the geocoding API route are rendered as text content only -- they must not be rendered as raw HTML.
- No sensitive data is sent to Nominatim (just the user's search text for geocoding).
- API keys for future paid geocoding providers (Google Maps, Mapbox) are stored as server-side environment variables and are never exposed to the browser.
- The `User-Agent` and/or `email` parameter sent to Nominatim from the API route should use a project-level contact address, not any user's personal information.

---

## 4. Internationalization (i18n)

New translation keys are needed. All values below are for the `en` locale.

| Key | Value |
|-----|-------|
| `location.searchPlaceholder` | `"Search for an address\u2026"` |
| `location.noResults` | `"No results found"` |
| `location.error` | `"Could not load suggestions. Check your connection and try again."` |
| `location.clear` | `"Clear location"` |
| `location.label` | `"Location"` |
| `location.loading` | `"Searching\u2026"` |
| `game.form.location` | `"Location"` |
| `game.detail.location` | `"Location"` |

---

## 5. Error Handling

| Scenario | User experience |
|----------|-----------------|
| Geocoding API route returns an error (due to Nominatim failure, network issue, or internal error) | Dropdown shows translated error message ("Could not load suggestions. Check your connection and try again."). User can still submit the form without a location. |
| Geocoding API route returns HTTP 429 (rate limited) | Same as above -- dropdown shows the error message. The client debounce (500ms) makes this unlikely under normal usage. |
| Geocoding API route returns empty results | Dropdown shows "No results found" message. User can still submit the form without a location. |
| Nominatim response is missing required `country` field on a suggestion | The API route excludes that suggestion from its response. If all suggestions are excluded, the API route returns an empty list, and the frontend shows "No results found." |
| Backend `createGame` or `updateGame` mutation returns an error related to location | The existing form error handling displays the server error message (no special location-specific error handling needed). |
| User submits form while autocomplete dropdown is open | Dropdown is dismissed. The currently selected location (if any) is used. If no location was selected, the form submits without a location. |

---

## 6. Relevant Backend Operations

The following existing GraphQL operations are relevant to this feature:

- `createGame` -- Creates a game. Each sport-specific input variant (`CreateBasketballGameInput`, `CreateFootballGameInput`, `CreateTennisGameInput`) already accepts an optional `location: LocationInput` field.
- `updateGame` -- Updates a game. The `UpdateGameInput` already accepts an optional `location: LocationInput` field. Sending `null` clears the location (PATCH semantics).
- `game` (query) -- Fetches a single game by ID. The `Game` type includes `location: Location` which has `id`, `name`, `address` (street, city, state, postalCode, country), and `coordinates` (latitude, longitude).
- `games` (query) -- Fetches a paginated list of games. Same `location` field available on each `Game` node.

**Schema gaps:** None identified. The backend schema fully supports all requirements described in this document.

---

## 7. Scope

### In Scope

- Location autocomplete component (reusable, not game-specific)
- Next.js API route for geocoding proxy (`/api/geocode/search` or similar)
- Geocoding provider abstraction at the API route level (adapter pattern for Nominatim, designed to allow future swap to Google Maps / Mapbox with zero frontend changes)
- Server-side rate limiting to comply with Nominatim usage policy
- Integration of location autocomplete into the create game form
- Integration of location autocomplete into the update game form, with pre-population of existing location and ability to clear
- Location display on the game detail page (inside the Schedule card)
- Update game card location display logic (remove reliance on `name` field)
- Fetching location data in game detail page query
- New i18n translation keys
- ARIA combobox pattern for autocomplete accessibility
- Touch and animation accessibility (prefers-reduced-motion, touch-action)

### Out of Scope

- Map display or map-based location picker
- Location-based game search or filtering
- Location for entities other than games (the component is reusable, but integration with other entities is future work)
- Location `name` field input (user does not enter a location name)
- Manual address entry as fallback
- Reverse geocoding (converting coordinates to address)
- Geolocation API (detecting user's current location)
- Authentication on the geocoding API route
