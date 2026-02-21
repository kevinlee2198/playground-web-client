# Home Page Activity Feed -- Design Document

## 1. Schema Analysis and API Concerns

### Available Schema

The `friendsActivityFeed` query already exists in the schema and returns `GameConnection!`, which contains `GameEdge` -> `Game` nodes. The `Game` type includes `viewerFriendPlayers: ViewerFriendPlayers!` with `nodes: [Player!]!` and `totalCount: Int!`.

### Schema Gap: Player.user is Missing

The requirements assume that `Player` has a `user: User` field to access `displayName` and `profilePicture`. The current schema defines `Player` as:

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
```

There is no `user` field on `Player`. The `User` type has `player: Player` (a forward reference), but the reverse link does not exist in the schema.

**Impact**: Without `Player.user`, we cannot show profile pictures or `displayName` for friend players in the feed. We must design around this.

**Recommendation to backend team**: Add `user: User` field to the `Player` type. This is a natural bidirectional relationship and enables the feed card to display friend avatars and display names. Until this field is added, the feed card will use `firstName` and `lastName` from the `Player` type directly for name display, and render initial-based avatar fallbacks instead of profile pictures.

**Design approach**: Define the types with an optional `user` field so the component gracefully degrades. When the backend adds the field, the query and component will pick it up without structural changes. The friend context line will use `player.firstName + player.lastName` as the display name, falling back to `player.user.displayName` when available.

### viewerFriendPlayers Returns Player[], not a Connection

`ViewerFriendPlayers` uses a flat `nodes: [Player!]!` array (capped at 10 by the server), not a `Connection`. This is intentional -- the UI only needs a handful of friend names/avatars. No pagination is needed here.

---

## 2. Type Definitions

### File: `/home/kevinlee/workspace/playground/playground-web-client/src/lib/types/feed.ts`

```typescript
import type { SportType, GameStatus } from "@/lib/constants";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import type { GameMetadata, GameParticipant } from "@/lib/types/game";

/**
 * Minimal user info nested inside a Player for feed display.
 * May be null if the Player is not linked to a User account,
 * or if the backend has not yet added the Player.user field.
 */
export interface FeedPlayerUser {
  id: string;
  displayName: string;
  profilePicture: FeedProfilePicture | null;
}

/**
 * Profile picture for feed display.
 * We only need the thumbnailUrl for the avatar.
 */
export interface FeedProfilePicture {
  __typename: "ImageResource";
  thumbnailUrl: string | null;
}

/**
 * Player node returned within viewerFriendPlayers.
 * Extends the basic player info with an optional user reference.
 */
export interface FeedPlayerNode {
  id: number;
  firstName: string;
  lastName: string;
  user: FeedPlayerUser | null;
}

/**
 * The viewer's friends who are players in a game.
 * nodes is capped at 10 by the server.
 */
export interface ViewerFriendPlayers {
  nodes: FeedPlayerNode[];
  totalCount: number;
}

/**
 * Location info for feed cards.
 */
export interface FeedLocation {
  name: string | null;
  address: {
    city: string;
    state: string;
  };
}

/**
 * Game node returned from the friendsActivityFeed query.
 * Extends GameNode with location and viewerFriendPlayers.
 */
export interface FeedGameNode {
  id: number;
  startDate: string;
  endDate: string | null;
  sportType: SportType;
  metadata: GameMetadata;
  gameStatus: GameStatus;
  location: FeedLocation | null;
  participants: {
    edges: Edge<GameParticipant>[];
  };
  viewerFriendPlayers: ViewerFriendPlayers;
}

/**
 * The shape returned by the loadFeedGames server action.
 */
export interface FeedGamesResult {
  edges: Edge<FeedGameNode>[];
  pageInfo: PageInfo;
}
```

### Design Decisions on Types

- `FeedGameNode` is intentionally a separate type from `GameNode` rather than extending it. This avoids coupling the feed's data shape to the games list page. The feed requires `location` and `viewerFriendPlayers` which `GameNode` does not have. Creating a union or intersection would introduce unnecessary complexity.
- `FeedPlayerNode.user` is typed as `T | null` (response type convention) to handle the case where the `Player.user` field does not exist in the schema yet. When the backend adds it, the query will request it and the field will be populated.
- `FeedProfilePicture` is minimal -- only `thumbnailUrl` is needed for avatar display, avoiding the full `Resource` type.

---

## 3. GraphQL Query Structure

### Fragment for Feed Query

Add to `/home/kevinlee/workspace/playground/playground-web-client/src/lib/graphql-fragments.ts`:

```typescript
/**
 * Fragment for viewerFriendPlayers on feed game nodes.
 * Fetches friend player names. The user sub-selection is included
 * but will only return data once Player.user is added to the backend schema.
 */
export const viewerFriendPlayersFragment = {
  nodes: {
    id: true,
    firstName: true,
    lastName: true,
    // Uncomment when Player.user field is added to the backend schema:
    // user: {
    //   id: true,
    //   displayName: true,
    //   profilePicture: {
    //     __on: [
    //       {
    //         __typeName: "ImageResource",
    //         thumbnailUrl: true,
    //       },
    //     ],
    //   },
    // },
  },
  totalCount: true,
};
```

### Feed Query Object (json-to-graphql-query)

Used in both the page component and the server action:

```typescript
const feedQueryFields = {
  friendsActivityFeed: {
    __args: {
      first: 10,
      // after: cursor  -- added for pagination
    },
    edges: {
      cursor: true,
      node: {
        id: true,
        startDate: true,
        endDate: true,
        sportType: true,
        gameStatus: true,
        metadata: gameMetadataFragment,
        location: {
          name: true,
          address: {
            city: true,
            state: true,
          },
        },
        participants: {
          __args: { first: 10 },
          edges: {
            node: participantNodeFragment,
          },
        },
        viewerFriendPlayers: viewerFriendPlayersFragment,
      },
    },
    pageInfo: {
      hasNextPage: true,
      endCursor: true,
    },
  },
};
```

---

## 4. Component Hierarchy

```
src/app/[locale]/page.tsx (Server Component)
  |-- Auth check: unauthenticated -> ComponentExample (existing stub)
  |-- Auth check: authenticated -> feed layout
      |-- Header: "Activity Feed" title + CreateGameDialog
      |-- Empty state (if 0 edges) -> Empty component
      |-- Error state (if query fails) -> error card with retry
      |-- ActivityFeed (Client Component) -- infinite scroll wrapper
          |-- ActivityFeedCard (Client Component) -- individual feed card
              |-- FriendAvatars (Client Component) -- stacked avatar group
              |-- Sport info (icon, subtype badge, status badge)
              |-- Participants & GameScore (reused)
              |-- Date & Location
```

### Why Each Component is Server or Client

| Component | Type | Reason |
|---|---|---|
| `page.tsx` | Server | Auth check, initial data fetch, SSR |
| `loading.tsx` | Server | Static skeleton, no interactivity |
| `ActivityFeed` | Client | IntersectionObserver for infinite scroll, manages edge state |
| `ActivityFeedCard` | Client | Uses `useFormatter` for date formatting, `useTranslations` for i18n |
| `FriendAvatars` | Client | Uses Avatar (client component), useTranslations |

Note: `ActivityFeedCard` and `FriendAvatars` could technically be server components if we used `format.dateTime` from `next-intl/server` and passed pre-formatted strings down. However, since they are rendered inside the `ActivityFeed` client component (which manages state for infinite scroll), they must also be client components. This is consistent with how `GameCard` is a client component inside `GameInfiniteList`.

---

## 5. File-by-File Implementation Plan

### 5.1. `/home/kevinlee/workspace/playground/playground-web-client/src/lib/types/feed.ts` (NEW)

**Purpose**: Type definitions for feed data structures.

**Contents**: As specified in Section 2 above.

**Dependencies**: Imports from `@/lib/constants`, `@/lib/graphql-connection`, `@/lib/types/game`.

---

### 5.2. `/home/kevinlee/workspace/playground/playground-web-client/src/lib/graphql-fragments.ts` (MODIFY)

**Purpose**: Add `viewerFriendPlayersFragment` for reuse in feed queries.

**Changes**: Append the `viewerFriendPlayersFragment` export as specified in Section 3.

---

### 5.3. `/home/kevinlee/workspace/playground/playground-web-client/src/app/[locale]/feed/actions.ts` (NEW)

**Purpose**: Server action for loading feed games (initial and paginated).

```typescript
"use server";

import type { Edge, PageInfo } from "@/lib/graphql-connection";
import {
  gameMetadataFragment,
  participantNodeFragment,
  viewerFriendPlayersFragment,
} from "@/lib/graphql-fragments";
import { authQuery } from "@/lib/graphql-request";
import type { FeedGameNode } from "@/lib/types/feed";

/**
 * Load games for the activity feed.
 * Used by both the initial server-side render (page.tsx) and
 * client-side infinite scroll (ActivityFeed).
 *
 * @param first - Number of items to fetch (default 10)
 * @param after - Cursor for pagination (omit for first page)
 * @returns edges + pageInfo, or null on error
 */
export async function loadFeedGames(
  first: number = 10,
  after?: string,
): Promise<{ edges: Edge<FeedGameNode>[]; pageInfo: PageInfo } | null> {
  try {
    const args: Record<string, unknown> = { first };
    if (after) {
      args.after = after;
    }

    const response = await authQuery({
      friendsActivityFeed: {
        __args: args,
        edges: {
          cursor: true,
          node: {
            id: true,
            startDate: true,
            endDate: true,
            sportType: true,
            gameStatus: true,
            metadata: gameMetadataFragment,
            location: {
              name: true,
              address: {
                city: true,
                state: true,
              },
            },
            participants: {
              __args: { first: 10 },
              edges: {
                node: participantNodeFragment,
              },
            },
            viewerFriendPlayers: viewerFriendPlayersFragment,
          },
        },
        pageInfo: {
          hasNextPage: true,
          endCursor: true,
        },
      },
    });

    return response.data?.friendsActivityFeed ?? null;
  } catch (error) {
    console.error("Failed to load feed games:", error);
    return null;
  }
}
```

**Design Decisions**:
- Single function for both initial load and pagination (consistent with `loadMoreGames` pattern but simpler since there are no filters/sort params).
- Returns `null` on error rather than throwing, matching the existing pattern in `game/actions.ts`.
- The `first` parameter defaults to 10 per requirements but can be overridden.

---

### 5.4. `/home/kevinlee/workspace/playground/playground-web-client/src/components/feed/friend-avatars.tsx` (NEW)

**Purpose**: Displays stacked friend avatar group with summary text.

```
Props:
  - friends: FeedPlayerNode[]
  - totalCount: number
  - sportType: SportType

Renders:
  - AvatarGroup with up to 3 avatars (to avoid visual clutter)
  - Each Avatar shows:
    - AvatarImage with friend's profilePicture thumbnailUrl (when available)
    - AvatarFallback with initials (first letter of firstName + lastName)
  - Summary text: "{name1}, {name2}, and {N} others played {sportType}"
```

**Component**: `"use client"` -- uses `useTranslations`.

**Logic for summary text**:

```typescript
function getFriendsSummary(
  friends: FeedPlayerNode[],
  totalCount: number,
  sportLabel: string,
  t: ReturnType<typeof useTranslations>,
): string {
  const getName = (p: FeedPlayerNode) =>
    p.user?.displayName ?? `${p.firstName} ${p.lastName}`;

  // Branch on friends.length (not totalCount) for array safety
  if (friends.length === 0) {
    return `${t("feed.youPlayed")} ${sportLabel}`;
  }
  if (friends.length === 1) {
    const othersCount = totalCount - 1;
    if (othersCount > 0) {
      const othersText = othersCount === 1 ? t("feed.other") : t("feed.others");
      return `${getName(friends[0])} ${t("feed.and")} ${othersCount} ${othersText} ${t("feed.played")} ${sportLabel}`;
    }
    return `${getName(friends[0])} ${t("feed.played")} ${sportLabel}`;
  }
  // 2+ friends in array
  const othersCount = totalCount - 2;
  if (othersCount > 0) {
    const othersText = othersCount === 1 ? t("feed.other") : t("feed.others");
    return `${getName(friends[0])}, ${getName(friends[1])}, ${t("feed.and")} ${othersCount} ${othersText} ${t("feed.played")} ${sportLabel}`;
  }
  return `${getName(friends[0])} ${t("feed.and")} ${getName(friends[1])} ${t("feed.played")} ${sportLabel}`;
}
```

**Avatar initials helper**:
```typescript
function getInitials(player: FeedPlayerNode): string {
  return `${player.firstName.charAt(0)}${player.lastName.charAt(0)}`.toUpperCase();
}
```

**Why limit displayed avatars to 3**: More than 3 stacked avatars becomes visually noisy. The text summary communicates the full count. This follows the Strava pattern.

---

### 5.5. `/home/kevinlee/workspace/playground/playground-web-client/src/components/feed/activity-feed-card.tsx` (NEW)

**Purpose**: Individual feed card representing a game with friend context.

```
Props:
  - game: FeedGameNode

Structure (top to bottom inside a Card):
  1. FriendAvatars section (friend context)
  2. Sport info row: sport icon + subtype badge + status badge
  3. Participants & Score: reuse existing participant display logic + GameScore
  4. Date & Location footer

Click behavior: entire card links to /game/{id}
```

**Component**: `"use client"` -- uses `useFormatter`, `useTranslations`, renders client sub-components.

**Layout approach**:
- Wrap entire card in `<Link href={/game/${game.id}}>` (same pattern as `GameCard`)
- Use `Card` with vertical padding. No `CardHeader`/`CardContent` split -- use a simpler single-content layout for the social feed style.
- Visually distinct from `GameCard`: more vertical, single-column optimized, with the friend context as the primary visual element at the top.

**Detailed rendering**:

```tsx
<Link href={`/game/${game.id}`} className="block">
  <Card className="hover:bg-muted/50 transition-colors">
    <CardContent className="space-y-3 p-4 sm:p-6">
      {/* 1. Friend context */}
      <FriendAvatars
        friends={game.viewerFriendPlayers.nodes}
        totalCount={game.viewerFriendPlayers.totalCount}
        sportType={game.sportType}
      />

      {/* 2. Sport info */}
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
          <Image
            src={getSportIconPath(game.sportType)}
            alt={t(`sports.${game.sportType}`)}
            width={20}
            height={20}
            className="h-5 w-5"
          />
        </div>
        <Badge variant="outline">
          {t(`sportSubtypes.${getSubtypeFromMetadata(game.metadata)}`)}
        </Badge>
        <Badge variant={GameStatusBadgeVariant[game.gameStatus]}>
          {t(`game.status.${snakeToCamel(game.gameStatus.toLowerCase())}`)}
        </Badge>
      </div>

      {/* 3. Participants & Score */}
      <div className="space-y-1">
        <TypographySmall>{participantsDisplay}</TypographySmall>
        <GameScore sportType={game.sportType} participants={participants} />
      </div>

      {/* 4. Date & Location */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {formattedDate}
        </span>
        {locationText && (
          <span className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {locationText}
          </span>
        )}
      </div>
    </CardContent>
  </Card>
</Link>
```

**Location display logic**:
```typescript
const locationText = game.location
  ? game.location.name ?? `${game.location.address.city}, ${game.location.address.state}`
  : null;
```

**Participant display**: Reuse the same logic as `GameCard` -- extract to a shared utility function or duplicate inline (given it is small). Prefer duplication over abstraction here since the feed card may diverge in display style from the game card in the future.

---

### 5.6. `/home/kevinlee/workspace/playground/playground-web-client/src/components/feed/activity-feed.tsx` (NEW)

**Purpose**: Infinite scroll wrapper for the feed, managing pagination state.

```
Props:
  - initialEdges: Edge<FeedGameNode>[]
  - initialPageInfo: PageInfo

State:
  - edges: Edge<FeedGameNode>[] (accumulated)
  - pageInfo: PageInfo (current cursor state)
  - isPending: boolean (via useTransition)

Behavior:
  - IntersectionObserver on a sentinel div at bottom
  - Calls loadFeedGames(10, endCursor) when sentinel enters viewport
  - Appends new edges to state
  - Shows Loader2 spinner during loading
  - Shows "You're all caught up!" when !hasNextPage
```

**Component**: `"use client"` -- manages state, uses IntersectionObserver.

**Implementation follows `GameInfiniteList` pattern exactly**, with these differences:
- No `filters` or `sort` props (feed has no filtering/sorting)
- No reset logic for filter changes (feed does not have URL-based filter state)
- Calls `loadFeedGames` instead of `loadMoreGames`
- Renders `ActivityFeedCard` instead of `GameCard`
- Single-column layout instead of grid: `<div className="space-y-4">` instead of grid

```tsx
"use client";

import { loadFeedGames } from "@/app/[locale]/feed/actions";
import type { Edge, PageInfo } from "@/lib/graphql-connection";
import type { FeedGameNode } from "@/lib/types/feed";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { ActivityFeedCard } from "./activity-feed-card";
import { TypographyMuted } from "@/components/ui/typography";

interface ActivityFeedProps {
  initialEdges: Edge<FeedGameNode>[];
  initialPageInfo: PageInfo;
}

export function ActivityFeed({ initialEdges, initialPageInfo }: ActivityFeedProps) {
  const t = useTranslations();
  const [edges, setEdges] = useState(initialEdges);
  const [pageInfo, setPageInfo] = useState(initialPageInfo);
  const [isPending, startTransition] = useTransition();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  // Ref-based guard to prevent duplicate loads from rapid IntersectionObserver callbacks
  const isLoadingRef = useRef(false);

  const loadMore = useCallback(() => {
    if (!pageInfo.hasNextPage || isLoadingRef.current || !pageInfo.endCursor) return;
    isLoadingRef.current = true;

    startTransition(async () => {
      try {
        const result = await loadFeedGames(10, pageInfo.endCursor!);
        if (result?.edges && result?.pageInfo) {
          setEdges((prev) => [...prev, ...result.edges]);
          setPageInfo(result.pageInfo);
        }
      } finally {
        isLoadingRef.current = false;
      }
    });
  }, [pageInfo]);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "100px" },
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => observerRef.current?.disconnect();
  }, [loadMore]);

  return (
    <>
      <div className="space-y-4">
        {edges.map((edge) => (
          <ActivityFeedCard key={edge.node.id} game={edge.node} />
        ))}
      </div>

      <div
        ref={loadMoreRef}
        className="mt-8 flex h-10 items-center justify-center"
      >
        {isPending && (
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        )}
        {!pageInfo.hasNextPage && edges.length > 0 && (
          <TypographyMuted>{t("feed.endOfFeed")}</TypographyMuted>
        )}
      </div>
    </>
  );
}
```

---

### 5.7. `/home/kevinlee/workspace/playground/playground-web-client/src/app/[locale]/page.tsx` (MODIFY)

**Purpose**: Update home page to show activity feed for authenticated users.

```tsx
import { loadFeedGames } from "@/app/[locale]/feed/actions";
import { ComponentExample } from "@/components/component-example";
import { ActivityFeed } from "@/components/feed/activity-feed";
import { CreateGameDialog } from "@/components/game/create-game-dialog";
import { buttonVariants } from "@/components/ui/button-variants";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { TypographyH1 } from "@/components/ui/typography";
import { Link } from "@/i18n/navigation";
import { auth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { getTranslations } from "next-intl/server";
import { headers } from "next/headers";

export default async function HomePage() {
  const session = await auth.api.getSession({ headers: await headers() });

  // Unauthenticated: show current stub
  if (!session?.user) {
    return <ComponentExample />;
  }

  const t = await getTranslations();

  // Fetch initial feed data
  const feedData = await loadFeedGames(10);

  // Error state
  if (!feedData) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-8">
        <div className="rounded-lg border border-destructive bg-destructive/10 p-6 text-center">
          <p className="text-lg font-semibold text-destructive">
            {t("feed.error")}
          </p>
          <Link
            href="/"
            className={cn(buttonVariants({ variant: "outline" }), "mt-4")}
          >
            {t("feed.retry")}
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <TypographyH1 className="text-3xl">{t("feed.title")}</TypographyH1>
        <CreateGameDialog />
      </div>

      {/* Feed content */}
      {feedData.edges.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>{t("feed.empty.title")}</EmptyTitle>
            <EmptyDescription>{t("feed.empty.description")}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ActivityFeed
          initialEdges={feedData.edges}
          initialPageInfo={feedData.pageInfo}
        />
      )}
    </main>
  );
}
```

**Design Decisions**:
- `max-w-2xl` for the centered single-column layout (matches requirements and the Strava-like feed aesthetic).
- Auth branching happens first, before any data fetching, to avoid unnecessary work for unauthenticated users.
- Uses `loadFeedGames` server action for initial data too. This keeps the query definition in one place. The alternative would be to inline the `authQuery` call in the page component (like the games page does), but centralizing reduces duplication since the same query shape is needed for pagination.
- No player profile check (unlike the games page). The feed should work even without a player profile -- you can still see your friends' games. If this is undesirable, it can be added later.

---

### 5.8. Loading State

**Note**: We intentionally do NOT create a `src/app/[locale]/loading.tsx` file. A `loading.tsx` at the `[locale]` level would act as a Suspense boundary for ALL routes under `[locale]`, showing feed-specific skeletons when navigating to unrelated pages like `/games` or `/player`.

Instead, the page component handles loading implicitly through Next.js server-side rendering — the initial data fetch completes before the page renders. For client-side navigation, the browser shows the previous page until the new page is ready (standard Next.js behavior for Server Components without a loading boundary).

If a loading skeleton is desired in the future, use an inline `<Suspense>` boundary wrapping an async child component within `page.tsx`.

---

### 5.9. `/home/kevinlee/workspace/playground/playground-web-client/messages/en.json` (MODIFY)

Add the `feed` namespace. See Section 7 for the exact keys.

---

## 6. i18n Keys

Add to `/home/kevinlee/workspace/playground/playground-web-client/messages/en.json` at the top level:

```json
{
  "feed": {
    "title": "Activity Feed",
    "played": "played",
    "and": "and",
    "other": "other",
    "others": "others",
    "youPlayed": "You played",
    "endOfFeed": "You're all caught up!",
    "error": "Failed to load activity feed",
    "retry": "Try again",
    "empty": {
      "title": "No activity yet",
      "description": "When you and your friends play games, they'll show up here."
    }
  }
}
```

**Notes**:
- `feed.error` was added (not in original requirements) for the error state in the page component.
- All text strings in components will be accessed via `t("feed.xxx")` using the `useTranslations()` or `getTranslations()` hooks.

---

## 7. Styling Approach

### Overall Layout
- `max-w-2xl mx-auto px-4 py-8` on the `<main>` element for a narrow, centered column.
- Feed cards stack vertically with `space-y-4` gap.

### Feed Card (`ActivityFeedCard`)
- Uses `Card` component with `CardContent` only (no `CardHeader` split).
- `p-4 sm:p-6` padding for responsive feel.
- `space-y-3` for vertical spacing between sections.
- `hover:bg-muted/50 transition-colors` for hover effect (same as `GameCard`).
- No `hover:scale` transform -- the feed card is wider and scaling would feel jarring.

### Friend Avatars Section
- `AvatarGroup` component with up to 3 `Avatar` components (default size, 32px).
- Summary text as `TypographySmall` in `text-muted-foreground`.
- Layout: `flex items-center gap-3` for avatars + text in a row.

### Sport Info Row
- `flex items-center gap-2` for horizontal alignment.
- Sport icon in a smaller circle (`h-8 w-8`) than the `GameCard` (`h-10 w-10`) -- the feed card is denser.
- `Badge variant="outline"` for subtype, mapped variant for status.

### Participants & Score
- `TypographySmall` for participant names.
- `GameScore` component reused as-is.

### Date & Location Footer
- `flex items-center gap-4 text-sm text-muted-foreground`.
- `Calendar` icon for date, `MapPin` icon for location.
- Both from `lucide-react`.

### Loading Skeleton
- Mirrors the feed card structure with `Skeleton` components.
- 4 skeleton cards (fewer than the games page's 6, since feed cards are taller).

### Responsive Behavior
- The `max-w-2xl` container is naturally responsive -- it takes full width on mobile and caps at 672px on larger screens.
- Card padding switches from `p-4` to `p-6` at the `sm` breakpoint.
- No multi-column layout -- single column at all breakpoints (intentional for a social feed).

---

## 8. Data Flow Summary

```
1. User navigates to / (home page)
2. Server Component (page.tsx):
   a. Check auth session
   b. If unauthenticated -> render ComponentExample (current stub)
   c. If authenticated -> call loadFeedGames(10)
   d. Handle error/empty states server-side
   e. Pass initialEdges + initialPageInfo to ActivityFeed client component
3. ActivityFeed (Client Component):
   a. Renders ActivityFeedCard for each edge
   b. IntersectionObserver on sentinel div
   c. When sentinel intersects viewport, calls loadFeedGames(10, endCursor) server action
   d. Appends new edges to state
   e. Updates pageInfo
   f. Repeats until hasNextPage is false
```

---

## 9. shadcn/ui Components Used

All components below are already installed in the project:

| Component | Source | Usage |
|---|---|---|
| `Card`, `CardContent` | `@/components/ui/card` | Feed card wrapper |
| `Badge` | `@/components/ui/badge` | Sport subtype and game status |
| `Avatar`, `AvatarImage`, `AvatarFallback`, `AvatarGroup` | `@/components/ui/avatar` | Friend profile pictures |
| `Skeleton` | `@/components/ui/skeleton` | Loading state |
| `Button` (via `CreateGameDialog`) | `@/components/ui/button` | Create Game CTA |
| `Empty`, `EmptyHeader`, `EmptyTitle`, `EmptyDescription` | `@/components/ui/empty` | Empty state |

No new shadcn/ui components need to be installed.

---

## 10. Implementation Order

1. `src/lib/types/feed.ts` -- Types first, no dependencies
2. `src/lib/graphql-fragments.ts` -- Add `viewerFriendPlayersFragment`
3. `src/app/[locale]/feed/actions.ts` -- Server action (depends on types + fragments)
4. `src/components/feed/friend-avatars.tsx` -- Leaf component, no feed-specific dependencies
5. `src/components/feed/activity-feed-card.tsx` -- Depends on `FriendAvatars`, types
6. `src/components/feed/activity-feed.tsx` -- Depends on `ActivityFeedCard`, server action
7. `messages/en.json` -- Add i18n keys (can be done at any point, but needed before components render)
8. `src/app/[locale]/page.tsx` -- Wire everything together (depends on all above)

---

## 11. Alternative Approaches and Trade-offs

### Alternative 1: Inline Query in page.tsx Instead of Server Action for Initial Load

**Approach**: Call `authQuery(...)` directly in page.tsx for the initial render, only use the server action for pagination.

**Pros**: Slightly more explicit; matches the pattern used in `games/page.tsx`.

**Cons**: Duplicates the query shape between page.tsx and the server action. If the feed query fields change, you must update two places.

**Decision**: Use the server action for both. The minor indirection is worth the DRY benefit. The `loadFeedGames` function has no side effects and is a pure data fetch, so there is no concern about server action semantics being misused.

### Alternative 2: Extend GameNode Instead of Creating FeedGameNode

**Approach**: Add `location` and `viewerFriendPlayers` as optional fields on `GameNode`.

**Pros**: Fewer types to maintain. Could reuse `GameCard` with minor modifications.

**Cons**: Pollutes `GameNode` with fields only relevant to the feed. Makes the type less precise -- `viewerFriendPlayers` would be typed as optional even though it is always present in feed responses. Violates the principle that response types should reflect what the server actually returns.

**Decision**: Separate `FeedGameNode` type. Clean separation of concerns.

### Alternative 3: ICU Message Format for Friend Summary

**Approach**: Use a single ICU message with `{count, plural, ...}` for the friend summary string.

**Pros**: More i18n-friendly for languages with complex pluralization rules.

**Cons**: The message format would be complex and hard to read. The current approach with concatenation works well for English. If full i18n support is needed later, this can be refactored. The pattern used here (name-based concatenation) is the same approach used by Strava, Facebook, and other social feeds.

**Decision**: Simple concatenation for now. The `others` pluralization is trivial in English.

---

## 12. Risks and Open Questions

### Risk: Player.user Field Not in Schema

The biggest risk is that `Player` does not have a `user` field. The design handles this by making `user` nullable in `FeedPlayerNode` and using `firstName`/`lastName` as the primary name source. Profile picture avatars will show initial-based fallbacks until the backend adds the field.

**Action item**: Request backend team to add `user: User` field to the `Player` type. This unblocks profile picture display in the feed.

### Risk: viewerFriendPlayers Returns Empty for User's Own Games

If the current user plays a game alone (no friends in the game), `viewerFriendPlayers.totalCount` will be 0 and `nodes` will be empty. The `friendsActivityFeed` query presumably still includes these games (since the user is a participant).

**Handling**: The `FriendAvatars` component handles this with the "You played {sport}" fallback text. No avatars are shown in this case.

### Open Question: Should Unauthenticated Home Page Change?

The requirements say to keep the current stub. However, a more useful unauthenticated landing page could drive sign-ups. This is deferred per requirements.

### Open Question: Feed Includes User's Own Games?

The `friendsActivityFeed` description says "games that the current user and their friends participate in." This implies the user's own games appear even without friends. The card handles this case, but it should be confirmed with the backend team whether solo games (no friends) appear in the feed.
