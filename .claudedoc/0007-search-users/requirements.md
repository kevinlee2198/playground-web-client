# Search Users - Requirements

## Overview

This feature allows users to search for other users by name or username. Search is accessible from two locations: a quick-search input in the navbar (with a compact dropdown of top results) and a dedicated search results page with full pagination. Clicking a search result navigates to the user's profile page.

## GraphQL API

The backend already provides a `searchUsers` query with cursor-based pagination:

```graphql
searchUsers(
  input: UserSearchInput!  # { query: String! }
  first: Int
  after: String
  last: Int
  before: String
): UserConnection!
```

The `UserConnection` returns `UserEdge` nodes containing the `User` type (`id`, `username`, `firstName`, `lastName`, `player`, `friendship`).

The backend will be updated to allow unauthenticated access to this query, so search is available to all visitors.

---

## Functional Requirements

### FR-1: Navbar Quick Search

**FR-1.1**: The navbar shall include a search input field that is always visible to all users (authenticated and unauthenticated).

**FR-1.2**: The navbar search shall use search-as-you-type behavior with debouncing (300ms recommended) to avoid excessive API calls.

**FR-1.3**: When the search input is empty, no search request shall be made and no dropdown shall be shown.

**FR-1.4**: When the user types a query, a dropdown shall appear below the search input displaying up to 5 results.

**FR-1.5**: Each result in the navbar dropdown shall display the user's full name (`firstName lastName`) and username.

**FR-1.6**: Clicking a result in the navbar dropdown shall navigate to that user's profile page at `/[locale]/user/[username]`.

**FR-1.7**: The navbar dropdown shall show a "No results found" message when the query returns zero results.

**FR-1.8**: The navbar dropdown shall include a link to the full search results page (e.g., "View all results") that navigates to `/[locale]/search?q={query}`.

**FR-1.9**: Pressing Enter in the navbar search input shall navigate to the dedicated search page at `/[locale]/search?q={query}`.

**FR-1.10**: The dropdown shall close when the user clicks outside of it, presses Escape, or navigates away.

**FR-1.11**: The dropdown shall show a loading indicator while the search request is in flight.

### FR-2: Dedicated Search Page

**FR-2.1**: A dedicated search page shall be accessible at `/[locale]/search`.

**FR-2.2**: The search page shall read the initial query from the `q` URL query parameter.

**FR-2.3**: The search page shall include a search input field with an explicit submit button. The user must click the button or press Enter to execute a search.

**FR-2.4**: The search page shall display results in a list layout, showing each user's full name (`firstName lastName`) and username.

**FR-2.5**: Clicking a result on the search page shall navigate to that user's profile page at `/[locale]/user/[username]`.

**FR-2.6**: The search page shall support pagination via a "Load More" button using cursor-based pagination (`first`/`after`). The initial page size shall be 20 results.

**FR-2.7**: When there are no results, the search page shall display a "No results found" message.

**FR-2.8**: When the page loads without a `q` parameter or with an empty query, no search shall be executed and the page shall display the search input only.

**FR-2.9**: The URL query parameter `q` shall update when the user submits a new search, enabling shareable/bookmarkable search URLs.

### FR-3: Authentication

**FR-3.1**: Search shall be available to all users -- both authenticated and unauthenticated.

**FR-3.2**: For unauthenticated users, use the `query()` GraphQL client function (no auth token).

**FR-3.3**: For authenticated users, use the `authQuery()` GraphQL client function so the backend can potentially personalize results in the future.

### FR-4: Error Handling

**FR-4.1**: Network errors during search shall display an appropriate error message (e.g., "Failed to search. Please try again.").

**FR-4.2**: In the navbar dropdown, errors shall be shown inline within the dropdown.

**FR-4.3**: On the search page, errors shall be shown inline above the results area.

---

## UI/UX Requirements

### UX-1: Navbar Search Component

**UX-1.1**: The search input shall be placed in the navbar, positioned between the navigation links and the auth button area (right-aligned section). Use a search icon (Lucide `Search`) as a visual affordance.

**UX-1.2**: The search input shall use a shadcn/ui `Input` component styled to fit within the navbar height.

**UX-1.3**: The dropdown shall appear directly below the search input, overlaying page content. Use a `Popover` or custom absolutely-positioned container.

**UX-1.4**: Each result row in the dropdown shall display:
- Full name as the primary text
- Username as secondary/muted text (e.g., `@username`)

**UX-1.5**: Result rows shall have hover highlighting and be keyboard-navigable (arrow keys to move, Enter to select).

**UX-1.6**: The dropdown shall have a maximum height with scroll if there are many results (though limited to 5, this is a safety measure).

**UX-1.7**: On mobile viewports, the search input may collapse to just a search icon that expands on tap. This is a progressive enhancement and not strictly required for initial implementation.

### UX-2: Search Page Layout

**UX-2.1**: The search page shall have a prominent search bar at the top with a submit button.

**UX-2.2**: Results shall be displayed in a clean list or card layout below the search bar.

**UX-2.3**: Each result entry shall display:
- Full name as the primary text
- Username as secondary/muted text (e.g., `@username`)

**UX-2.4**: The result entry shall be clickable as a whole (the entire row/card is a link).

**UX-2.5**: A "Load More" button shall appear below the results when `pageInfo.hasNextPage` is true.

**UX-2.6**: The search page shall show a loading skeleton or spinner during the initial search and a loading indicator on the "Load More" button when fetching the next page.

### UX-3: Loading States

**UX-3.1**: Navbar dropdown: show a small spinner or skeleton lines while the debounced search request is pending.

**UX-3.2**: Search page: show skeleton placeholders for results during the initial search.

**UX-3.3**: Search page "Load More" button: show a loading spinner when fetching additional pages.

### UX-4: Empty States

**UX-4.1**: Navbar dropdown with no results: display "No users found" text within the dropdown.

**UX-4.2**: Search page with no results: display a centered "No users found" message.

**UX-4.3**: Search page with no query: display only the search input, no results section.

---

## Technical Requirements

### TR-1: Data Fetching

**TR-1.1**: GraphQL query for search:

```graphql
query {
  searchUsers(input: { query: "..." }, first: 5) {
    edges {
      node {
        id
        username
        firstName
        lastName
      }
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
```

**TR-1.2**: The navbar search shall request `first: 5` results.

**TR-1.3**: The search page shall request `first: 20` results initially and use `after: endCursor` for subsequent pages.

**TR-1.4**: For the navbar, use client-side fetching (the component is interactive and debounced). Call the GraphQL API via a server action or client-side fetch.

**TR-1.5**: For the search page, the initial search can be server-rendered using the `q` query parameter. Subsequent "Load More" fetches shall be client-side.

### TR-2: Component Structure

**TR-2.1**: Create the following new components and pages:

| File | Type | Description |
|------|------|-------------|
| `src/app/[locale]/search/page.tsx` | Page (Server Component) | Dedicated search results page |
| `src/components/search/navbar-search.tsx` | Client Component | Navbar search input with dropdown |
| `src/components/search/search-results-list.tsx` | Client Component | Paginated search results for the search page |
| `src/components/search/user-search-result.tsx` | Component | Single user result row (shared between navbar and page) |
| `src/components/search/actions.ts` | Server Actions | Server actions for executing search queries |

**TR-2.2**: Update `src/components/playground/navbar.tsx` to include the `NavbarSearch` component.

### TR-3: shadcn/ui Components Required

**TR-3.1**: The following shadcn/ui components are expected to be used (add any that are not already installed):
- `Input` - For the search text field
- `Button` - For the submit button on the search page
- `Popover` (or equivalent) - For the navbar search dropdown
- `Skeleton` - For loading states
- `Command` (optional) - Could be used for the navbar search with keyboard navigation (cmdk-based combobox)

### TR-4: Debouncing

**TR-4.1**: The navbar search input shall debounce API calls by 300ms after the user stops typing.

**TR-4.2**: If the user clears the input or the debounced value becomes empty, cancel any pending request and hide the dropdown.

### TR-5: URL and Routing

**TR-5.1**: The search page route shall be `/[locale]/search` with query parameter `q` for the search term.

**TR-5.2**: Use `useRouter` and `useSearchParams` from `@/i18n/navigation` (or Next.js) for managing the search query parameter.

**TR-5.3**: When the user submits a search on the dedicated page, update the URL query parameter using `router.push` or `router.replace` so the URL is bookmarkable.

---

## Internationalization (i18n)

### i18n-1: Translation Keys Required

Add the following keys to `messages/en.json` under a new `search` namespace:

```json
{
  "search": {
    "placeholder": "Search users...",
    "submit": "Search",
    "noResults": "No users found",
    "viewAllResults": "View all results",
    "loading": "Searching...",
    "error": "Failed to search. Please try again.",
    "loadMore": "Load More",
    "title": "Search"
  }
}
```

---

## Security Considerations

### SEC-1: Input Handling

**SEC-1.1**: The search query shall be sanitized before being sent to the API (trim whitespace, no special treatment needed beyond what the GraphQL client handles).

**SEC-1.2**: The `q` query parameter shall be validated and sanitized when read from the URL.

### SEC-2: Rate Limiting

**SEC-2.1**: Client-side debouncing (300ms) provides basic protection against excessive requests. Server-side rate limiting is the backend's responsibility.

---

## Acceptance Criteria

1. A search input is visible in the navbar for all users (authenticated and unauthenticated)
2. Typing in the navbar search input triggers a debounced search and displays up to 5 results in a dropdown
3. The navbar dropdown shows user full name and username for each result
4. Clicking a navbar dropdown result navigates to `/[locale]/user/[username]`
5. Pressing Enter in the navbar search navigates to `/[locale]/search?q={query}`
6. The navbar dropdown shows "No users found" when there are no results
7. The navbar dropdown shows a loading indicator while the search is in progress
8. The dedicated search page at `/[locale]/search` displays a search input with a submit button
9. The search page reads the initial query from the `q` URL parameter
10. Submitting a search on the search page updates the URL `q` parameter
11. The search page shows up to 20 results with a "Load More" button when more results exist
12. Clicking "Load More" fetches and appends the next page of results
13. The search page shows "No users found" when there are no results
14. All user-facing text uses i18n translation keys from the `search` namespace
15. The feature works for both authenticated and unauthenticated users
16. Network errors are displayed gracefully in both the navbar dropdown and the search page

---

## Dependencies

- Existing GraphQL client infrastructure (`query`, `authQuery` from `@/lib/graphql-request`)
- Existing i18n infrastructure (next-intl)
- shadcn/ui components: Input, Button, Popover (or Command), Skeleton
- Navbar component (`src/components/playground/navbar.tsx`) will be modified

---

## Future Extensibility

**FE-1.1**: The `UserSearchInput` schema has commented-out fields (`excludeFriends`, `hasFriendshipStatus`, `hasPlayer`) that could enable filtered search in the future (e.g., "search non-friends only" for friend discovery).

**FE-1.2**: Search results could be extended to show friendship status badges or "Add Friend" quick-actions in the future.

**FE-1.3**: The search could be expanded to search across other entity types (games, players) using a unified search interface.

**FE-1.4**: The navbar search could evolve into a command palette (Cmd+K) experience using the shadcn/ui `Command` component.
