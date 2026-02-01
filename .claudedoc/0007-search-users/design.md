# Search Users - Design Document

## Overview

This document describes the technical design for the Search Users feature, which adds a navbar quick-search with a dropdown and a dedicated `/[locale]/search` page with paginated results.

---

## 1. Component Architecture

### New Files

| File | Type | Description |
|------|------|-------------|
| `src/components/search/navbar-search.tsx` | Client Component | Search input in navbar with debounced dropdown |
| `src/components/search/search-results-list.tsx` | Client Component | Paginated results list for the dedicated search page |
| `src/components/search/user-search-result.tsx` | Shared Component (Server-compatible) | Single user result row used by both navbar dropdown and search page |
| `src/components/search/actions.ts` | Server Actions | `searchUsers` and `searchUsersLoadMore` server actions |
| `src/app/[locale]/search/page.tsx` | Page (Server Component) | Dedicated search results page |
| `src/lib/types/user.ts` | Types | User search result types |

### Modified Files

| File | Change |
|------|--------|
| `src/components/playground/navbar.tsx` | Add `<NavbarSearch />` between nav links and auth button |
| `messages/en.json` | Add `search` namespace with all i18n keys |

### Component Hierarchy

```
navbar.tsx (client)
  +-- NavbarSearch (client)
        +-- Input (search field)
        +-- Popover (dropdown container)
              +-- UserSearchResult (per result row)
              +-- "View all results" link
              +-- Loading / Empty / Error states

search/page.tsx (server)
  +-- SearchResultsList (client)
        +-- Input + Button (search form)
        +-- UserSearchResult (per result row)
        +-- "Load More" Button
        +-- Loading / Empty / Error states
```

---

## 2. TypeScript Type Definitions

### `src/lib/types/user.ts`

```typescript
/** A user as returned from the searchUsers query */
export interface UserSearchNode {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
}

/** Result shape returned by the searchUsers server action */
export interface SearchUsersResult {
  success: boolean;
  edges?: UserSearchEdge[];
  pageInfo?: SearchPageInfo;
  error?: string;
}

export interface UserSearchEdge {
  cursor: string;
  node: UserSearchNode;
}

export interface SearchPageInfo {
  hasNextPage: boolean;
  endCursor: string | null;
}
```

Note: These types follow the project convention of `T | null` for nullable response fields and `T?` for optional input fields. The `UserSearchNode` intentionally omits `player` and `friendship` since the search results only need identity fields.

---

## 3. GraphQL Query Definitions

### Search users query object (json-to-graphql-query format)

```typescript
function buildSearchUsersQuery(searchQuery: string, first: number, after?: string) {
  const args: Record<string, unknown> = {
    input: { query: searchQuery },
    first,
  };
  if (after) {
    args.after = after;
  }

  return {
    searchUsers: {
      __args: args,
      edges: {
        cursor: true,
        node: {
          id: true,
          username: true,
          firstName: true,
          lastName: true,
        },
      },
      pageInfo: {
        hasNextPage: true,
        endCursor: true,
      },
    },
  };
}
```

This query shape is used by both the navbar (with `first: 5`) and the search page (with `first: 20`).

---

## 4. Server Actions

### `src/components/search/actions.ts`

```typescript
"use server";

import { auth } from "@/lib/auth";
import { authQuery, query } from "@/lib/graphql-request";
import type { SearchUsersResult } from "@/lib/types/user";
import { headers } from "next/headers";

/**
 * Search for users. Uses authQuery when authenticated, query when not.
 * This server action is called from both the navbar dropdown and the search page.
 */
export async function searchUsers(
  searchQuery: string,
  first: number,
  after?: string
): Promise<SearchUsersResult> {
  const trimmed = searchQuery.trim();
  if (!trimmed) {
    return { success: true, edges: [], pageInfo: { hasNextPage: false, endCursor: null } };
  }

  try {
    const queryObj = buildSearchUsersQuery(trimmed, first, after);

    // Check if user is authenticated
    const reqHeaders = await headers();
    const session = await auth.api.getSession({ headers: reqHeaders });
    const isAuthenticated = !!session?.user?.id;

    const response = isAuthenticated
      ? await authQuery(queryObj)
      : await query(queryObj);

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    const data = response.data?.searchUsers;
    return {
      success: true,
      edges: data?.edges ?? [],
      pageInfo: data?.pageInfo ?? { hasNextPage: false, endCursor: null },
    };
  } catch {
    return { success: false, error: "Failed to search. Please try again." };
  }
}
```

Design decision: A single `searchUsers` server action handles both the navbar and the search page. The `first` parameter differentiates the two use cases (5 vs 20). The `after` parameter enables cursor-based pagination for "Load More". This avoids duplicating the GraphQL query logic.

The auth-vs-unauth branching follows the same pattern used in `src/app/[locale]/user/[username]/page.tsx` where `authQuery` or `query` is chosen based on session presence.

---

## 5. Component Specifications

### 5.1 NavbarSearch (`src/components/search/navbar-search.tsx`)

**Directive:** `"use client"`

**Props:** None (self-contained)

**Responsibilities:**
- Renders a search `Input` with a `Search` (Lucide) icon
- Debounces input by 300ms before calling the `searchUsers` server action with `first: 5`
- Manages a Popover dropdown that shows results, loading, empty, and error states
- On Enter keypress, navigates to `/search?q={query}` using `useRouter` from `@/i18n/navigation`
- On result click, navigates to `/user/{username}` using `Link` from `@/i18n/navigation`
- Dropdown includes a "View all results" footer link to `/search?q={query}`
- Dropdown closes on Escape, click-outside (handled by Popover), or navigation

**State:**
- `inputValue: string` -- controlled input value
- `debouncedValue: string` -- debounced version (300ms)
- `isOpen: boolean` -- popover open state
- `isPending: boolean` -- via `useTransition` for the server action call
- `results: UserSearchEdge[]` -- current search results
- `error: string | null` -- error message if search failed

**Debouncing approach:** Use a `useEffect` with a `setTimeout`/`clearTimeout` pattern on `inputValue` to produce `debouncedValue`. When `debouncedValue` changes and is non-empty, call the server action inside a `startTransition`. This is simpler than adding a library dependency and follows React 19 patterns.

**Keyboard navigation (UX-1.5):** Track a `highlightedIndex` state. Arrow keys increment/decrement the index, Enter on a highlighted item navigates to that user. This is a progressive enhancement built with simple `onKeyDown` handling on the input.

**Component sketch:**

```tsx
"use client";

import { searchUsers } from "@/components/search/actions";
import { Input } from "@/components/ui/input";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { Link, useRouter } from "@/i18n/navigation";
import type { UserSearchEdge } from "@/lib/types/user";
import { Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, useTransition } from "react";
import { UserSearchResult } from "./user-search-result";

export function NavbarSearch() {
  const t = useTranslations("search");
  const router = useRouter();

  const [inputValue, setInputValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<UserSearchEdge[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  // Debounce input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(inputValue.trim()), 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Fetch results when debounced value changes
  useEffect(() => {
    if (!debouncedValue) {
      setResults([]);
      setIsOpen(false);
      setError(null);
      return;
    }

    startTransition(async () => {
      const result = await searchUsers(debouncedValue, 5);
      if (result.success) {
        setResults(result.edges ?? []);
        setError(null);
      } else {
        setResults([]);
        setError(result.error ?? t("error"));
      }
      setIsOpen(true);
      setHighlightedIndex(-1);
    });
  }, [debouncedValue]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      if (highlightedIndex >= 0 && highlightedIndex < results.length) {
        router.push(`/user/${results[highlightedIndex].node.username}`);
      } else if (inputValue.trim()) {
        router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`);
      }
      setIsOpen(false);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(prev - 1, -1));
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverAnchor asChild>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={t("placeholder")}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => { if (debouncedValue && results.length > 0) setIsOpen(true); }}
            className="h-9 w-48 pl-8 lg:w-64"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent align="start" className="w-80 p-0">
        {/* Loading */}
        {isPending && /* spinner or skeleton */}
        {/* Error */}
        {error && /* error message */}
        {/* Results */}
        {!isPending && !error && results.length === 0 && /* "No users found" */}
        {!isPending && !error && results.map((edge, index) => (
          <UserSearchResult
            key={edge.node.id}
            user={edge.node}
            isHighlighted={index === highlightedIndex}
          />
        ))}
        {/* "View all results" link */}
        {!isPending && debouncedValue && /* Link to /search?q=... */}
      </PopoverContent>
    </Popover>
  );
}
```

### 5.2 UserSearchResult (`src/components/search/user-search-result.tsx`)

**Directive:** None needed (can work as server or client component; will be used inside client components so it will be client-rendered regardless)

**Props:**

```typescript
interface UserSearchResultProps {
  user: UserSearchNode;
  isHighlighted?: boolean;
}
```

**Responsibilities:**
- Renders a single search result row as a `Link` to `/user/{username}`
- Shows full name (`firstName lastName`) as primary text
- Shows `@username` as muted secondary text
- Applies highlight styling when `isHighlighted` is true

**Component sketch:**

```tsx
import { Link } from "@/i18n/navigation";
import type { UserSearchNode } from "@/lib/types/user";
import { cn } from "@/lib/utils";

interface UserSearchResultProps {
  user: UserSearchNode;
  isHighlighted?: boolean;
}

export function UserSearchResult({ user, isHighlighted }: UserSearchResultProps) {
  return (
    <Link
      href={`/user/${user.username}`}
      className={cn(
        "flex flex-col px-4 py-2.5 transition-colors hover:bg-muted",
        isHighlighted && "bg-muted"
      )}
    >
      <span className="text-sm font-medium">
        {user.firstName} {user.lastName}
      </span>
      <span className="text-xs text-muted-foreground">@{user.username}</span>
    </Link>
  );
}
```

### 5.3 Search Page (`src/app/[locale]/search/page.tsx`)

**Directive:** None (Server Component)

**Props:** Standard Next.js page props with `searchParams`

**Responsibilities:**
- Reads the `q` parameter from URL search params
- If `q` is present and non-empty, performs an initial server-side search with `first: 20`
- Passes initial results to `SearchResultsList` client component
- Handles errors from the initial fetch

**Component sketch:**

```tsx
import { searchUsers } from "@/components/search/actions";
import { SearchResultsList } from "@/components/search/search-results-list";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Search | Playground",
  description: "Search for users on Playground",
};

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SearchPage({ searchParams }: PageProps) {
  const queryParams = await searchParams;
  const t = await getTranslations("search");

  const q = typeof queryParams.q === "string" ? queryParams.q.trim() : "";

  let initialResult = null;
  if (q) {
    initialResult = await searchUsers(q, 20);
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="mb-6 text-3xl font-bold tracking-tight">{t("title")}</h1>
      <SearchResultsList
        initialQuery={q}
        initialEdges={initialResult?.edges ?? null}
        initialPageInfo={initialResult?.pageInfo ?? null}
        initialError={initialResult?.success === false ? initialResult.error : null}
      />
    </main>
  );
}
```

### 5.4 SearchResultsList (`src/components/search/search-results-list.tsx`)

**Directive:** `"use client"`

**Props:**

```typescript
interface SearchResultsListProps {
  initialQuery: string;
  initialEdges: UserSearchEdge[] | null;
  initialPageInfo: SearchPageInfo | null;
  initialError: string | null | undefined;
}
```

**Responsibilities:**
- Renders a search form (Input + Button) at the top
- On form submit, calls `searchUsers` server action with `first: 20` and updates URL via `router.replace` with new `q` param
- Displays results using `UserSearchResult` components
- Shows a "Load More" `Button` when `pageInfo.hasNextPage` is true
- "Load More" calls `searchUsers` with `after: endCursor` and appends results
- Manages loading, empty, and error states

**State:**
- `query: string` -- current input value (initialized from `initialQuery`)
- `edges: UserSearchEdge[]` -- accumulated result edges
- `pageInfo: SearchPageInfo | null` -- current page info for cursor pagination
- `error: string | null` -- error message
- `isSearching: boolean` -- via `useTransition` for initial/new searches
- `isLoadingMore: boolean` -- via `useTransition` for load-more pagination

**URL synchronization:** When the user submits a new search, use `router.replace(/search?q=${encodeURIComponent(query)})` from `@/i18n/navigation` to update the URL without adding a history entry. This makes the URL bookmarkable/shareable per FR-2.9.

**Component sketch:**

```tsx
"use client";

import { searchUsers } from "@/components/search/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/navigation";
import type { SearchPageInfo, UserSearchEdge } from "@/lib/types/user";
import { Loader2, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { UserSearchResult } from "./user-search-result";

export function SearchResultsList({
  initialQuery,
  initialEdges,
  initialPageInfo,
  initialError,
}: SearchResultsListProps) {
  const t = useTranslations("search");
  const router = useRouter();

  const [query, setQuery] = useState(initialQuery);
  const [edges, setEdges] = useState<UserSearchEdge[]>(initialEdges ?? []);
  const [pageInfo, setPageInfo] = useState<SearchPageInfo | null>(initialPageInfo);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [hasSearched, setHasSearched] = useState(!!initialQuery);
  const [isSearching, startSearch] = useTransition();
  const [isLoadingMore, startLoadMore] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = query.trim();
    if (!trimmed) return;

    router.replace(`/search?q=${encodeURIComponent(trimmed)}`);

    startSearch(async () => {
      const result = await searchUsers(trimmed, 20);
      setHasSearched(true);
      if (result.success) {
        setEdges(result.edges ?? []);
        setPageInfo(result.pageInfo ?? null);
        setError(null);
      } else {
        setEdges([]);
        setPageInfo(null);
        setError(result.error ?? t("error"));
      }
    });
  }

  function handleLoadMore() {
    if (!pageInfo?.endCursor) return;
    startLoadMore(async () => {
      const result = await searchUsers(query.trim(), 20, pageInfo.endCursor!);
      if (result.success) {
        setEdges((prev) => [...prev, ...(result.edges ?? [])]);
        setPageInfo(result.pageInfo ?? null);
      } else {
        setError(result.error ?? t("error"));
      }
    });
  }

  return (
    <div>
      {/* Search form */}
      <form onSubmit={handleSubmit} className="mb-8 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("placeholder")}
            className="pl-9"
          />
        </div>
        <Button type="submit" disabled={isSearching}>
          {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : t("submit")}
        </Button>
      </form>

      {/* Error */}
      {error && <div className="mb-4 ...text-destructive...">{error}</div>}

      {/* Loading skeleton for initial search */}
      {isSearching && <SearchSkeleton />}

      {/* Results */}
      {!isSearching && hasSearched && edges.length === 0 && !error && (
        <p className="text-center text-muted-foreground">{t("noResults")}</p>
      )}

      {!isSearching && edges.length > 0 && (
        <div className="divide-y rounded-lg border">
          {edges.map((edge) => (
            <UserSearchResult key={edge.node.id} user={edge.node} />
          ))}
        </div>
      )}

      {/* Load More */}
      {!isSearching && pageInfo?.hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={handleLoadMore} disabled={isLoadingMore}>
            {isLoadingMore ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {t("loadMore")}
          </Button>
        </div>
      )}
    </div>
  );
}
```

---

## 6. Data Flow

### Navbar Quick Search Flow

```
User types in NavbarSearch input
  --> useEffect debounces (300ms) --> debouncedValue updates
  --> useEffect triggers startTransition(searchUsers(debouncedValue, 5))
  --> Server action checks auth, calls query() or authQuery()
  --> Results returned to client, popover opens with results
  --> User clicks result --> Link navigates to /user/{username}
  --> User presses Enter --> router.push(/search?q={query})
```

### Search Page Flow

```
Browser navigates to /search?q=foo
  --> Server Component reads q from searchParams
  --> Server calls searchUsers("foo", 20) directly (server action called server-side)
  --> Passes initialEdges/initialPageInfo to SearchResultsList
  --> SearchResultsList renders results
  --> User clicks "Load More"
  --> startTransition(searchUsers("foo", 20, endCursor))
  --> Appends new edges, updates pageInfo
  --> User submits new search
  --> router.replace updates URL, startTransition(searchUsers(newQuery, 20))
  --> Replaces edges with new results
```

### Auth Flow

```
Server action: searchUsers()
  --> Read session from headers via auth.api.getSession()
  --> If session exists: authQuery(queryObj) -- includes Bearer token
  --> If no session: query(queryObj) -- no auth header
```

This matches the existing pattern in `src/app/[locale]/user/[username]/page.tsx` (lines 141-143).

---

## 7. State Management

### NavbarSearch State (Client)

All state is local to the `NavbarSearch` component using `useState` and `useTransition`. No global state or context is needed. The component is self-contained.

| State | Type | Purpose |
|-------|------|---------|
| `inputValue` | `string` | Controlled input value |
| `debouncedValue` | `string` | Debounced search term (300ms) |
| `isOpen` | `boolean` | Popover open/closed |
| `results` | `UserSearchEdge[]` | Current dropdown results |
| `error` | `string \| null` | Error message |
| `isPending` | `boolean` | From `useTransition` |
| `highlightedIndex` | `number` | Keyboard nav index (-1 = none) |

### SearchResultsList State (Client)

| State | Type | Purpose |
|-------|------|---------|
| `query` | `string` | Current search input |
| `edges` | `UserSearchEdge[]` | Accumulated result edges |
| `pageInfo` | `SearchPageInfo \| null` | Cursor pagination info |
| `error` | `string \| null` | Error message |
| `hasSearched` | `boolean` | Whether a search has been executed |
| `isSearching` | `boolean` | From `useTransition` (new search) |
| `isLoadingMore` | `boolean` | From `useTransition` (load more) |

---

## 8. Navbar Integration

The `NavbarSearch` component will be inserted into the existing `navbar.tsx` between the `NavigationMenu` and the auth button `<div className="ml-auto">`.

```tsx
// In navbar.tsx, after </NavigationMenu> and before <div className="ml-auto">
<div className="ml-auto flex items-center gap-4">
  <NavbarSearch />
  <AuthButton />
</div>
```

The current `<div className="ml-auto">` wrapping only `<AuthButton />` will be updated to contain both the search and the auth button in a flex row. This keeps the search input right-aligned alongside the auth controls.

---

## 9. i18n Integration

### Keys to add to `messages/en.json`

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

### Usage

- `NavbarSearch`: `useTranslations("search")` (client component)
- `SearchResultsList`: `useTranslations("search")` (client component)
- `search/page.tsx`: `getTranslations("search")` (server component)

---

## 10. shadcn/ui Components

### Already installed (no action needed)

- `Input` -- search text fields
- `Button` -- submit and load more buttons
- `Popover` (+ `PopoverAnchor`, `PopoverContent`) -- navbar search dropdown
- `Skeleton` -- loading placeholders

### No new shadcn/ui components need to be installed

The requirements suggest `Command` (cmdk) as optional. I recommend **against** using `Command` for the initial implementation because:

1. `Command` is designed for command palettes with static item lists, not async search-as-you-type. Wiring async results into cmdk requires fighting its controlled state model.
2. The Popover + manual keyboard nav approach is simpler, easier to maintain, and gives full control over the loading/error/empty states.
3. `Command` can be adopted later as a progressive enhancement (FE-1.4) when evolving toward a Cmd+K palette.

---

## 11. Alternative Approaches and Trade-offs

### Alternative 1: Client-side fetch instead of server actions for navbar search

**Approach:** Have the navbar search call the GraphQL endpoint directly from the client using a client-side fetch helper.

**Trade-offs:**
- Pro: Avoids server round-trip latency for the server action serialization
- Con: Requires exposing the GraphQL endpoint URL to the client (`NEXT_PUBLIC_SERVER_URL` is already public, so this is feasible)
- Con: Auth token management from the client is more complex; the existing `authQuery` / `query` functions use `headers()` from `next/headers` which is server-only
- Con: Breaks the established pattern in this codebase where all GraphQL calls go through server actions or server components

**Recommendation:** Use server actions. The added latency is minimal (same-machine hop) and it maintains consistency with the rest of the codebase. The debounce already batches requests, so the extra round-trip is not noticeable.

### Alternative 2: Server-rendered search page with no client state

**Approach:** Make the search page fully server-rendered. Each search or "Load More" click navigates to a new URL (e.g., `/search?q=foo&after=cursor`), causing a full page re-render.

**Trade-offs:**
- Pro: Simpler -- no client state management, pure server components
- Pro: Every state is in the URL, making it perfectly bookmarkable
- Con: "Load More" would replace results instead of appending, which is a worse UX
- Con: Each search triggers a full navigation/re-render, losing scroll position
- Con: Does not match the existing pattern used in `GameInfiniteList`

**Recommendation:** Use the hybrid approach described in this design (server-rendered initial load, client-side pagination). This matches the existing `GameInfiniteList` pattern.

### Alternative 3: Single searchUsers action vs separate navbar/page actions

**Approach:** Create separate server actions for navbar search and page search.

**Trade-offs:**
- Pro: Each action can be optimized independently
- Con: Duplicates the GraphQL query logic

**Recommendation:** Use a single `searchUsers(query, first, after?)` action. The `first` parameter differentiates the two callers. This avoids duplication and is easier to maintain.

---

## 12. API Feedback

### Auth behavior

The backend allows unauthenticated access to `searchUsers`. When an authenticated user searches, the backend weights friends higher in results. This is why the server action checks for a session and uses `authQuery` (with Bearer token) when authenticated and `query` (no auth) when not — it's not just future-proofing, it actively improves result relevance for logged-in users.

### Suggestion: Consider adding a `totalCount` field to `UserConnection`

Currently, `UserConnection` only has `edges` and `pageInfo`. Adding `totalCount` would allow the search page to display "Showing X of Y results" which is a common and useful UX pattern. This is not required for the initial implementation but would be a nice enhancement.

### Current schema is sufficient

The `searchUsers` query with `UserSearchInput { query: String! }`, cursor-based pagination (`first`/`after`/`last`/`before`), and `UserConnection` return type provides everything needed for this feature. No schema changes are required on the client side.

---

## 13. Security Considerations

- **Input sanitization:** The server action trims whitespace from the query. The GraphQL client (via `json-to-graphql-query`) handles proper escaping of string values in the query, preventing injection.
- **URL parameter validation:** The `q` search param is validated as a string and trimmed before use. Non-string values (arrays) are ignored.
- **No sensitive data exposure:** Search results only include public user fields (`id`, `username`, `firstName`, `lastName`). No private fields like `email` are returned.
- **Rate limiting:** Client-side debouncing (300ms) limits request frequency. Server-side rate limiting is the backend's responsibility.
