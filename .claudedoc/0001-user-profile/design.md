# User Profile Page - Technical Design

## Overview

This document provides the implementation design for the User Profile Page feature. The design follows the existing codebase patterns and architecture established in the Next.js 16 application.

---

## 1. Schema Analysis

### 1.1 User Type Hierarchy

The GraphQL schema defines two user types:

**User** - For viewing other users (public profiles):
```graphql
type User implements Node {
  id: ID!
  firstName: String!
  lastName: String!
  player: Player
  friendship: Friendship  # Relationship with current authenticated user
}
```

**CurrentUser** - For the authenticated user's own data (includes private fields):
```graphql
type CurrentUser implements Node {
  id: ID!
  firstName: String!
  lastName: String!
  email: String!  # Private field
  player: Player
}
```

### 1.2 Query Endpoints

- `user(id: ID!)` returns `User` - use for viewing other users' profiles
- `me` returns `CurrentUser!` - use for viewing own profile (includes email)

### 1.3 Friendship System

The `friendship` field on `User` returns the relationship between the current authenticated user and the profile owner:

```graphql
type Friendship implements Node {
  id: ID!
  requester: User!
  addressee: User!
  status: FriendshipStatus!  # PENDING, ACCEPTED, DECLINED, BLOCKED
  createdDate: DateTime!
}
```

### 1.4 Game Participants (Polymorphic)

Games use a polymorphic `participants` field that returns `GameParticipantConnection`:

```graphql
interface GameParticipant implements Node {
  id: ID!
}

type TeamInstance implements Node & GameParticipant {
  id: ID!
  name: String!
  description: String
  players: [Player!]!
  attributes: JSON!
}

type IndividualParticipant implements Node & GameParticipant {
  id: ID!
  player: Player
}
```

Use `__typename` to discriminate between participant types.

---

## 2. Component Architecture

### 2.1 File Structure

```
src/
  app/
    [locale]/
      user/
        [id]/
          page.tsx           # Main profile page (server component)
          loading.tsx        # Loading skeleton for page
          not-found.tsx      # 404 page for invalid user IDs or blocked
          actions.ts         # Server actions for mutations and pagination
  components/
    profile/
      profile-header.tsx     # Profile header with avatar, name, bio (server component)
      player-stats.tsx       # Player statistics display (server component)
      game-history.tsx       # Game history list (client component for pagination)
      game-card.tsx          # Individual game entry, clickable (client component)
      friend-actions.tsx     # Friend action buttons (client component for mutations)
    playground/
      user-avatar-menu.tsx   # Navbar avatar dropdown (client component)
```

### 2.2 Component Hierarchy

```
page.tsx (Server)
  |-- ProfileHeader (Server)
  |     |-- Avatar (from shadcn/ui)
  |     |-- FriendActions (Client) - for non-own profiles
  |     |-- MessageButton (Client) - disabled when not friends
  |     |-- EditProfileButton - for own profile (placeholder)
  |
  |-- PlayerStats (Server)
  |     |-- Card (from shadcn/ui)
  |
  |-- GameHistory (Client)
        |-- GameCard (Client, clickable)
              |-- Badge (from shadcn/ui)
              |-- Card (from shadcn/ui)
```

---

## 3. Detailed Component Specifications

### 3.1 Profile Page (`src/app/[locale]/user/[id]/page.tsx`)

**Type**: Server Component

**Responsibilities**:
- Fetch user data via `user(id)` query (returns `User` with `friendship` field)
- Handle 404 when user not found
- Handle 404 when current user is blocked by profile owner
- Compose ProfileHeader, PlayerStats, and GameHistory components
- Pass initial games data to GameHistory for hydration

**Props**:
```typescript
interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}
```

**Data Fetching Strategy**:

For authenticated users viewing another profile, use `authQuery` to get friendship data:
```typescript
import { authQuery, query } from "@/lib/graphql-request";

// Authenticated request to get friendship status
const userResponse = await authQuery({
  user: {
    __args: { id: userId },
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
    friendship: {
      id: true,
      status: true,
      requester: { id: true },
      addressee: { id: true },
      createdDate: true,
    },
  },
});
```

For unauthenticated users, use `query` (friendship will be null):
```typescript
const userResponse = await query({
  user: {
    __args: { id: userId },
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
    // friendship field will be null for unauthenticated requests
  },
});
```

**Games Query with Polymorphic Participants**:
```typescript
const gamesQuery = {
  games: {
    __args: {
      input: { playerId: playerId },
      sort: [{ field: "START_DATE", direction: "DESC" }],
      first: 10,
    },
    edges: {
      cursor: true,
      node: {
        id: true,
        startDate: true,
        endDate: true,
        sportType: true,
        sportSubtype: true,
        gameStatus: true,
        participants: {
          __args: { first: 10 },
          edges: {
            node: {
              __typename: true,
              __on: {
                TeamInstance: {
                  id: true,
                  name: true,
                  players: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
                IndividualParticipant: {
                  id: true,
                  player: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            },
          },
        },
      },
    },
    pageInfo: {
      hasNextPage: true,
      endCursor: true,
    },
  },
};
```

**Block Detection and 404 Handling**:
```typescript
import { notFound } from "next/navigation";

// In page component
const user = userResponse.data?.user;

if (!user) {
  notFound();
}

// Check if blocked - if current user is the addressee of a BLOCKED friendship
const friendship = user.friendship;
if (friendship?.status === "BLOCKED" && friendship.addressee.id === currentUserId) {
  // Profile owner blocked the current user - show 404 to hide the block
  notFound();
}
```

**Implementation**:
```typescript
import { auth } from "@/lib/auth";
import { authQuery, query } from "@/lib/graphql-request";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ProfileHeader } from "@/components/profile/profile-header";
import { PlayerStats } from "@/components/profile/player-stats";
import { GameHistory } from "@/components/profile/game-history";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ locale: string; id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id: userId } = await params;
  const response = await query({
    user: { __args: { id: userId }, firstName: true, lastName: true }
  });
  const user = response.data?.user;

  return {
    title: user ? `${user.firstName} ${user.lastName} | Playground` : "Profile | Playground",
    description: user ? `View ${user.firstName}'s profile on Playground` : "User profile",
  };
}

export default async function UserProfilePage({ params }: PageProps) {
  const { locale, id: userId } = await params;
  const t = await getTranslations({ locale });

  // Get current user session
  const session = await auth.api.getSession({ headers: await headers() });
  const currentUserId = session?.user?.id;
  const isAuthenticated = !!currentUserId;
  const isOwnProfile = currentUserId === userId;

  // Fetch user data - use authQuery if authenticated to get friendship data
  const userResponse = isAuthenticated
    ? await authQuery(buildUserQuery(userId))
    : await query(buildUserQuery(userId));

  const user = userResponse.data?.user;

  if (!user) {
    notFound();
  }

  // Check for BLOCKED status - show 404 to hide the block
  const friendship = user.friendship;
  if (
    friendship?.status === "BLOCKED" &&
    friendship.addressee.id === currentUserId
  ) {
    notFound();
  }

  const player = user.player;

  // Fetch games if player exists
  let initialGames = null;
  if (player) {
    const gamesResponse = await query(buildGamesQuery(player.id));
    initialGames = gamesResponse.data?.games;
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <ProfileHeader
        user={user}
        friendship={friendship}
        currentUserId={currentUserId}
        isOwnProfile={isOwnProfile}
        isAuthenticated={isAuthenticated}
      />

      {player && <PlayerStats player={player} />}

      <GameHistory
        playerId={player?.id}
        initialGames={initialGames}
      />
    </main>
  );
}
```

### 3.2 Profile Header (`src/components/profile/profile-header.tsx`)

**Type**: Server Component (contains client component children)

**Responsibilities**:
- Display user avatar with initials fallback
- Show user's full name
- Display player biography excerpt (if available)
- Render FriendActions component for friend-related buttons
- Render Message button (disabled when not friends)
- Show Edit Profile placeholder for own profile

**Props**:
```typescript
interface ProfileHeaderProps {
  user: {
    id: string;
    firstName: string;
    lastName: string;
    player?: {
      biography?: string | null;
    } | null;
  };
  friendship?: {
    id: string;
    status: "PENDING" | "ACCEPTED" | "DECLINED" | "BLOCKED";
    requester: { id: string };
    addressee: { id: string };
  } | null;
  currentUserId?: string | null;
  isOwnProfile: boolean;
  isAuthenticated: boolean;
}
```

**Implementation**:
```typescript
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { getTranslations } from "next-intl/server";
import { UserPen, MessageCircle } from "lucide-react";
import { FriendActions } from "./friend-actions";
import Link from "next/link";

export async function ProfileHeader({
  user,
  friendship,
  currentUserId,
  isOwnProfile,
  isAuthenticated,
}: ProfileHeaderProps) {
  const t = await getTranslations("profile");

  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
  const fullName = `${user.firstName} ${user.lastName}`;

  const isFriends = friendship?.status === "ACCEPTED";

  return (
    <section className="mb-8">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
        {/* Large Avatar */}
        <Avatar className="h-24 w-24 text-2xl sm:h-32 sm:w-32">
          <AvatarImage src={undefined} alt={fullName} />
          <AvatarFallback className="text-2xl font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>

        {/* User Info */}
        <div className="flex flex-1 flex-col items-center gap-4 text-center sm:items-start sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight">{fullName}</h1>

          {user.player?.biography && (
            <p className="max-w-2xl text-muted-foreground">
              {user.player.biography}
            </p>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            {isOwnProfile ? (
              <Button variant="outline" asChild>
                <Link href="/settings/profile">
                  <UserPen className="mr-2 h-4 w-4" />
                  {t("editProfile")}
                </Link>
              </Button>
            ) : (
              <>
                {/* Friend Actions - only show when authenticated */}
                {isAuthenticated && (
                  <FriendActions
                    userId={user.id}
                    friendship={friendship}
                    currentUserId={currentUserId!}
                  />
                )}

                {/* Message Button - requires friends */}
                {isAuthenticated && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <Button
                            variant="outline"
                            disabled={!isFriends}
                          >
                            <MessageCircle className="mr-2 h-4 w-4" />
                            {t("message")}
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!isFriends && (
                        <TooltipContent>
                          <p>{t("messageFriendsOnly")}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
```

### 3.3 Friend Actions (`src/components/profile/friend-actions.tsx`)

**Type**: Client Component

**Responsibilities**:
- Display appropriate friend action button based on friendship status
- Handle `sendFriendRequest` mutation for sending friend requests
- Handle `acceptFriendRequest` mutation for accepting requests
- Show loading states during mutations
- Display toast notifications for success/error

**Props**:
```typescript
interface FriendActionsProps {
  userId: string;
  friendship?: {
    id: string;
    status: "PENDING" | "ACCEPTED" | "DECLINED" | "BLOCKED";
    requester: { id: string };
    addressee: { id: string };
  } | null;
  currentUserId: string;
}
```

**Friend Action Logic**:

| Friendship State | Current User Role | UI Display |
|-----------------|-------------------|------------|
| null | N/A | "Add Friend" button |
| PENDING | requester | "Friend Request Pending" (disabled) |
| PENDING | addressee | "Accept Friend Request" button |
| ACCEPTED | either | "Friends" status indicator |
| DECLINED | N/A | "Add Friend" button (can re-request) |
| BLOCKED | addressee | 404 (handled at page level) |

**Implementation**:
```typescript
"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { UserPlus, UserCheck, Clock, Loader2 } from "lucide-react";
import { sendFriendRequest, acceptFriendRequest } from "@/app/[locale]/user/[id]/actions";
import { toast } from "sonner";

interface FriendActionsProps {
  userId: string;
  friendship?: {
    id: string;
    status: "PENDING" | "ACCEPTED" | "DECLINED" | "BLOCKED";
    requester: { id: string };
    addressee: { id: string };
  } | null;
  currentUserId: string;
}

export function FriendActions({ userId, friendship, currentUserId }: FriendActionsProps) {
  const t = useTranslations("profile.friends");
  const [isPending, startTransition] = useTransition();
  const [localFriendship, setLocalFriendship] = useState(friendship);

  const status = localFriendship?.status;
  const isRequester = localFriendship?.requester.id === currentUserId;
  const isAddressee = localFriendship?.addressee.id === currentUserId;

  const handleAddFriend = () => {
    startTransition(async () => {
      const result = await sendFriendRequest(userId);
      if (result.success) {
        setLocalFriendship(result.friendship);
        toast.success(t("requestSent"));
      } else {
        toast.error(t("error"));
      }
    });
  };

  const handleAcceptRequest = () => {
    startTransition(async () => {
      const result = await acceptFriendRequest(localFriendship!.requester.id);
      if (result.success) {
        setLocalFriendship(result.friendship);
        toast.success(t("requestAccepted"));
      } else {
        toast.error(t("error"));
      }
    });
  };

  // No friendship or declined - show Add Friend
  if (!status || status === "DECLINED") {
    return (
      <Button onClick={handleAddFriend} disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UserPlus className="mr-2 h-4 w-4" />
        )}
        {t("addFriend")}
      </Button>
    );
  }

  // Pending - current user sent the request
  if (status === "PENDING" && isRequester) {
    return (
      <Button variant="secondary" disabled>
        <Clock className="mr-2 h-4 w-4" />
        {t("pending")}
      </Button>
    );
  }

  // Pending - current user received the request
  if (status === "PENDING" && isAddressee) {
    return (
      <Button onClick={handleAcceptRequest} disabled={isPending}>
        {isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <UserCheck className="mr-2 h-4 w-4" />
        )}
        {t("acceptRequest")}
      </Button>
    );
  }

  // Accepted - show friends status
  if (status === "ACCEPTED") {
    return (
      <Button variant="outline" disabled>
        <UserCheck className="mr-2 h-4 w-4" />
        {t("friends")}
      </Button>
    );
  }

  return null;
}
```

### 3.4 Server Actions (`src/app/[locale]/user/[id]/actions.ts`)

**Type**: Server Actions

**Responsibilities**:
- Handle friend mutations securely on the server
- Handle game pagination

**Implementation**:
```typescript
"use server";

import { authMutate, query } from "@/lib/graphql-request";
import { revalidatePath } from "next/cache";

export async function sendFriendRequest(userId: string) {
  try {
    const response = await authMutate({
      sendFriendRequest: {
        __args: { input: { userId } },
        friendship: {
          id: true,
          status: true,
          requester: { id: true },
          addressee: { id: true },
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return { success: true, friendship: response.data.sendFriendRequest.friendship };
  } catch (error) {
    return { success: false, error: "Failed to send friend request" };
  }
}

export async function acceptFriendRequest(requesterId: string) {
  try {
    const response = await authMutate({
      acceptFriendRequest: {
        __args: { input: { requesterId } },
        friendship: {
          id: true,
          status: true,
          requester: { id: true },
          addressee: { id: true },
        },
      },
    });

    if (response.errors?.length > 0) {
      return { success: false, error: response.errors[0].message };
    }

    return { success: true, friendship: response.data.acceptFriendRequest.friendship };
  } catch (error) {
    return { success: false, error: "Failed to accept friend request" };
  }
}

export async function loadMoreGames(playerId: string, after: string) {
  const response = await query({
    games: {
      __args: {
        input: { playerId },
        sort: [{ field: "START_DATE", direction: "DESC" }],
        first: 10,
        after,
      },
      edges: {
        cursor: true,
        node: {
          id: true,
          startDate: true,
          endDate: true,
          sportType: true,
          sportSubtype: true,
          gameStatus: true,
          participants: {
            __args: { first: 10 },
            edges: {
              node: {
                __typename: true,
                __on: {
                  TeamInstance: {
                    id: true,
                    name: true,
                    players: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                  IndividualParticipant: {
                    id: true,
                    player: {
                      id: true,
                      firstName: true,
                      lastName: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      pageInfo: {
        hasNextPage: true,
        endCursor: true,
      },
    },
  });

  return response.data?.games;
}
```

### 3.5 Player Stats (`src/components/profile/player-stats.tsx`)

**Type**: Server Component

**Responsibilities**:
- Display player physical attributes (age, height, weight)
- Format height and weight with units
- Hide section gracefully if no data

**Props**:
```typescript
interface PlayerStatsProps {
  player: {
    age?: number | null;
    height?: number | null; // in cm
    weight?: number | null; // in kg
  };
}
```

**Implementation**:
```typescript
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getTranslations } from "next-intl/server";

interface PlayerStatsProps {
  player: {
    age?: number | null;
    height?: number | null;
    weight?: number | null;
  };
}

export async function PlayerStats({ player }: PlayerStatsProps) {
  const t = await getTranslations("profile.stats");

  const hasAnyStats = player.age || player.height || player.weight;

  if (!hasAnyStats) {
    return null; // UX-4.2: Hide section when no data
  }

  // Format height (assuming cm, convert to feet/inches for display)
  const formatHeight = (cm: number | null | undefined): string | null => {
    if (!cm) return null;
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  };

  // Format weight (assuming kg)
  const formatWeight = (kg: number | null | undefined): string | null => {
    if (!kg) return null;
    return `${Math.round(kg)} kg`;
  };

  return (
    <section className="mb-8">
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            {player.age && (
              <StatItem label={t("age")} value={`${player.age} ${t("years")}`} />
            )}
            {player.height && (
              <StatItem label={t("height")} value={formatHeight(player.height)!} />
            )}
            {player.weight && (
              <StatItem label={t("weight")} value={formatWeight(player.weight)!} />
            )}
          </div>
        </CardContent>
      </Card>
    </section>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-center">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
    </div>
  );
}
```

### 3.6 Game History (`src/components/profile/game-history.tsx`)

**Type**: Client Component (for pagination interactivity)

**Responsibilities**:
- Display list of games
- Handle pagination (Load More button)
- Show empty state when no games
- Show loading state during pagination

**Props**:
```typescript
interface GameHistoryProps {
  playerId?: string | null;
  initialGames?: {
    edges: Array<{
      cursor: string;
      node: GameNode;
    }>;
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string | null;
    };
  } | null;
}

interface GameNode {
  id: string;
  startDate: string;
  endDate?: string | null;
  sportType: "BASKETBALL" | "FOOTBALL" | "TENNIS";
  sportSubtype: "FIVE_ON_FIVE" | "THREE_ON_THREE" | "FLAG_FOOTBALL" | "AMERICAN_FOOTBALL" | "SINGLES" | "DOUBLES";
  gameStatus: "SCHEDULED" | "IN_PROGRESS" | "COMPLETE";
  participants: {
    edges: Array<{
      node: TeamInstanceNode | IndividualParticipantNode;
    }>;
  };
}

interface TeamInstanceNode {
  __typename: "TeamInstance";
  id: string;
  name: string;
  players: Array<{ id: string; firstName: string; lastName: string }>;
}

interface IndividualParticipantNode {
  __typename: "IndividualParticipant";
  id: string;
  player: { id: string; firstName: string; lastName: string } | null;
}
```

**Implementation**:
```typescript
"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { GameCard } from "./game-card";
import { Loader2 } from "lucide-react";
import { loadMoreGames } from "@/app/[locale]/user/[id]/actions";

export function GameHistory({ playerId, initialGames }: GameHistoryProps) {
  const t = useTranslations("profile.games");
  const [isPending, startTransition] = useTransition();

  const [games, setGames] = useState(initialGames?.edges ?? []);
  const [pageInfo, setPageInfo] = useState(
    initialGames?.pageInfo ?? { hasNextPage: false, endCursor: null }
  );

  const handleLoadMore = () => {
    if (!playerId || !pageInfo.endCursor) return;

    startTransition(async () => {
      const moreGames = await loadMoreGames(playerId, pageInfo.endCursor!);
      if (moreGames) {
        setGames((prev) => [...prev, ...moreGames.edges]);
        setPageInfo(moreGames.pageInfo);
      }
    });
  };

  // No player = no games section
  if (!playerId) {
    return null;
  }

  return (
    <section>
      <h2 className="mb-4 text-xl font-semibold">{t("title")}</h2>

      {games.length === 0 ? (
        <p className="text-muted-foreground">{t("noGames")}</p>
      ) : (
        <>
          <div className="grid gap-4">
            {games.map((edge) => (
              <GameCard key={edge.node.id} game={edge.node} />
            ))}
          </div>

          {pageInfo.hasNextPage && (
            <div className="mt-6 flex justify-center">
              <Button
                variant="outline"
                onClick={handleLoadMore}
                disabled={isPending}
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  t("loadMore")
                )}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
```

### 3.7 Game Card (`src/components/profile/game-card.tsx`)

**Type**: Client Component (rendered within client component, clickable)

**Responsibilities**:
- Display game summary (sport, subtype, date, status, participants)
- Format date for display
- Apply appropriate status badge styling
- Navigate to game detail page on click

**Implementation**:
```typescript
"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslations } from "next-intl";
import { Calendar, Circle, Trophy, Target } from "lucide-react";
import { useRouter } from "next/navigation";

const sportIcons = {
  BASKETBALL: Circle,
  FOOTBALL: Trophy,
  TENNIS: Target,
} as const;

const statusVariants = {
  SCHEDULED: "secondary",
  IN_PROGRESS: "default",
  COMPLETE: "outline",
} as const;

interface GameCardProps {
  game: GameNode;
}

export function GameCard({ game }: GameCardProps) {
  const t = useTranslations();
  const router = useRouter();

  const SportIcon = sportIcons[game.sportType];
  const formattedDate = new Date(game.startDate).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  // Get participant display text based on type
  const getParticipantsDisplay = () => {
    const participants = game.participants.edges.map((e) => e.node);

    if (participants.length === 0) return "TBD";

    // Check if team-based or individual
    const firstParticipant = participants[0];
    if (firstParticipant.__typename === "TeamInstance") {
      const teamNames = participants
        .filter((p): p is TeamInstanceNode => p.__typename === "TeamInstance")
        .map((p) => p.name);
      return teamNames.join(` ${t("profile.games.vs")} `);
    } else {
      // Individual participants
      const playerNames = participants
        .filter((p): p is IndividualParticipantNode => p.__typename === "IndividualParticipant")
        .map((p) => p.player ? `${p.player.firstName} ${p.player.lastName}` : "Unknown")
        .join(` ${t("profile.games.vs")} `);
      return playerNames;
    }
  };

  const handleClick = () => {
    router.push(`/game/${game.id}`);
  };

  return (
    <Card
      className="cursor-pointer transition-colors hover:bg-muted/50"
      onClick={handleClick}
    >
      <CardContent className="flex items-center gap-4 p-4">
        {/* Sport Icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <SportIcon className="h-6 w-6" />
        </div>

        {/* Game Info */}
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {t(`sports.${game.sportType.toLowerCase()}`)}
            </span>
            <Badge variant="outline">
              {t(`sportSubtypes.${game.sportSubtype}`)}
            </Badge>
            <Badge variant={statusVariants[game.gameStatus]}>
              {t(`profile.games.status.${game.gameStatus.toLowerCase()}`)}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{getParticipantsDisplay()}</p>
        </div>

        {/* Date */}
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Calendar className="h-4 w-4" />
          {formattedDate}
        </div>
      </CardContent>
    </Card>
  );
}
```

### 3.8 User Avatar Menu (`src/components/playground/user-avatar-menu.tsx`)

**Type**: Client Component

**Responsibilities**:
- Display user avatar in navbar
- Dropdown menu with profile link, settings, sign out
- Handle sign out flow

**Props**:
```typescript
interface UserAvatarMenuProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
}
```

**Implementation**:
```typescript
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import { LogOut, Settings, User } from "lucide-react";
import Link from "next/link";

interface UserAvatarMenuProps {
  user: {
    id: string;
    name?: string | null;
    email?: string | null;
  };
}

export function UserAvatarMenu({ user }: UserAvatarMenuProps) {
  const t = useTranslations();

  // Generate initials from name or email
  const getInitials = (): string => {
    if (user.name) {
      const parts = user.name.split(" ");
      if (parts.length >= 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
      }
      return user.name.charAt(0).toUpperCase();
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          window.location.reload();
        },
      },
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
          <Avatar className="h-9 w-9 cursor-pointer">
            <AvatarImage src={undefined} alt={user.name ?? "User"} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem asChild>
          <Link href={`/user/${user.id}`} className="flex items-center">
            <User className="mr-2 h-4 w-4" />
            {t("profile.viewProfile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings" className="flex items-center">
            <Settings className="mr-2 h-4 w-4" />
            {t("profile.settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="flex items-center text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {t("auth.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### 3.9 Updated Auth Button (`src/components/auth/auth-button.tsx`)

**Modifications**:
- Import and use UserAvatarMenu when user is authenticated
- Remove email/name text display, use avatar instead

**Updated Implementation**:
```typescript
"use client";

import { Button } from "@/components/ui/button";
import { signIn, useSession } from "@/lib/auth-client";
import { useTranslations } from "next-intl";
import { TypographyP } from "../ui/typography";
import { UserAvatarMenu } from "../playground/user-avatar-menu";

export default function AuthButton() {
  const t = useTranslations();
  const session = useSession();

  const handleSignIn = async () => {
    await signIn.oauth2({
      providerId: "keycloak",
      callbackURL: window.location.href,
    });
  };

  const handleSignUp = async () => {
    await signIn.oauth2({
      providerId: "keycloak",
      callbackURL: window.location.href,
    });
  };

  if (session.isPending) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 animate-pulse rounded-full bg-zinc-200 dark:bg-zinc-800" />
      </div>
    );
  }

  if (session?.data?.user) {
    return (
      <UserAvatarMenu
        user={{
          id: session.data.user.id,
          name: session.data.user.name,
          email: session.data.user.email,
        }}
      />
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" onClick={handleSignUp}>
        <TypographyP>{t("auth.signUp")}</TypographyP>
      </Button>
      <Button onClick={handleSignIn}>
        <TypographyP>{t("auth.signIn")}</TypographyP>
      </Button>
    </div>
  );
}
```

---

## 4. Loading and Error States

### 4.1 Loading Page (`src/app/[locale]/user/[id]/loading.tsx`)

```typescript
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export default function ProfileLoading() {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Profile Header Skeleton */}
      <section className="mb-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start">
          <Skeleton className="h-24 w-24 rounded-full sm:h-32 sm:w-32" />
          <div className="flex flex-1 flex-col items-center gap-4 sm:items-start">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-96" />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-32" />
              <Skeleton className="h-10 w-28" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Skeleton */}
      <section className="mb-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="text-center">
                  <Skeleton className="mx-auto mb-2 h-4 w-16" />
                  <Skeleton className="mx-auto h-8 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Game History Skeleton */}
      <section>
        <Skeleton className="mb-4 h-7 w-40" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="flex items-center gap-4 p-4">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
                <Skeleton className="h-4 w-24" />
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </main>
  );
}
```

### 4.2 Not Found Page (`src/app/[locale]/user/[id]/not-found.tsx`)

```typescript
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function UserNotFound() {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center px-4">
      <h1 className="mb-4 text-4xl font-bold">404</h1>
      <p className="mb-6 text-lg text-muted-foreground">
        User not found
      </p>
      <Button asChild>
        <Link href="/">Return Home</Link>
      </Button>
    </main>
  );
}
```

---

## 5. shadcn/ui Components Required

### 5.1 Already Available

- `Avatar` - `/home/kevinlee/workspace/playground/playground-web-client/src/components/ui/avatar.tsx`
- `DropdownMenu` - `/home/kevinlee/workspace/playground/playground-web-client/src/components/ui/dropdown-menu.tsx`
- `Card` - `/home/kevinlee/workspace/playground/playground-web-client/src/components/ui/card.tsx`
- `Button` - `/home/kevinlee/workspace/playground/playground-web-client/src/components/ui/button.tsx`

### 5.2 Needs Installation

```bash
npx shadcn@latest add badge
npx shadcn@latest add skeleton
npx shadcn@latest add tooltip
npx shadcn@latest add sonner  # For toast notifications
```

---

## 6. i18n Keys

Add the following to `/home/kevinlee/workspace/playground/playground-web-client/messages/en.json`:

```json
{
  "common": {
    "title": "Playground"
  },
  "auth": {
    "signIn": "Sign In",
    "signUp": "Sign Up",
    "signOut": "Sign Out"
  },
  "header": {
    "home": "Home"
  },
  "footer": {
    "...existing..."
  },
  "profile": {
    "title": "Profile",
    "viewProfile": "View Profile",
    "settings": "Settings",
    "editProfile": "Edit Profile",
    "message": "Message",
    "messageFriendsOnly": "You must be friends to send messages",
    "stats": {
      "title": "Player Stats",
      "age": "Age",
      "height": "Height",
      "weight": "Weight",
      "years": "years",
      "biography": "Biography"
    },
    "games": {
      "title": "Game History",
      "noGames": "No games played yet",
      "loadMore": "Load More",
      "vs": "vs",
      "status": {
        "scheduled": "Scheduled",
        "in_progress": "In Progress",
        "complete": "Complete"
      }
    },
    "friends": {
      "addFriend": "Add Friend",
      "pending": "Friend Request Pending",
      "acceptRequest": "Accept Friend Request",
      "friends": "Friends",
      "requestSent": "Friend request sent",
      "requestAccepted": "Friend request accepted",
      "error": "Failed to process friend request"
    },
    "errors": {
      "notFound": "User not found",
      "playerDataUnavailable": "Player information unavailable",
      "loadError": "Failed to load profile"
    }
  },
  "sports": {
    "basketball": "Basketball",
    "football": "Football",
    "tennis": "Tennis"
  },
  "sportSubtypes": {
    "FIVE_ON_FIVE": "5v5",
    "THREE_ON_THREE": "3v3",
    "FLAG_FOOTBALL": "Flag Football",
    "AMERICAN_FOOTBALL": "American Football",
    "SINGLES": "Singles",
    "DOUBLES": "Doubles"
  }
}
```

---

## 7. Data Flow Diagram

```
+------------------+     +------------------+     +------------------+
|   User Browser   |     |    Next.js App   |     |  GraphQL Server  |
+------------------+     +------------------+     +------------------+
        |                        |                        |
        | 1. GET /user/[id]      |                        |
        |----------------------->|                        |
        |                        | 2. authQuery { user }  |
        |                        |    (with friendship)   |
        |                        |----------------------->|
        |                        |<-----------------------|
        |                        | 3. User data |
        |                        |                        |
        |                        | 4. query { games }     |
        |                        |    (with participants) |
        |                        |----------------------->|
        |                        |<-----------------------|
        |                        | 5. Initial games       |
        |                        |                        |
        |<-----------------------|                        |
        | 6. HTML (SSR)          |                        |
        |                        |                        |
        | 7. Click "Add Friend"  |                        |
        |----------------------->|                        |
        |                        | 8. Server Action       |
        |                        | authMutate { sendFriendRequest } |
        |                        |----------------------->|
        |                        |<-----------------------|
        |<-----------------------|                        |
        | 9. Updated friendship  |                        |
        |                        |                        |
        | 10. Click "Load More"  |                        |
        |----------------------->|                        |
        |                        | 11. Server Action      |
        |                        | query { games }        |
        |                        |----------------------->|
        |                        |<-----------------------|
        |<-----------------------|                        |
        | 12. More games         |                        |
        |                        |                        |
        | 13. Click game card    |                        |
        |----------------------->|                        |
        | 14. Navigate to        |                        |
        |     /game/[gameId]     |                        |
+------------------+     +------------------+     +------------------+
```

---

## 8. State Management

### 8.1 Server State (No State Management Required)

- User and Player data: Fetched server-side, passed as props
- Friendship data: Fetched server-side with authQuery, passed as props
- Initial games: Fetched server-side, passed as props to GameHistory

### 8.2 Client State (React useState/useTransition)

- `games`: Array of game edges (initialized from server, updated on pagination)
- `pageInfo`: Pagination cursor state
- `localFriendship`: Local state for optimistic UI updates after friend actions
- `isPending`: Loading state for mutations and pagination (useTransition)

### 8.3 No Global State Store Needed

The profile page is mostly read-only with minimal interactivity. React's built-in useState and useTransition are sufficient for the pagination and friend action state.

---

## 9. Security Considerations

### 9.1 Email Not Exposed

- The GraphQL `user(id)` query returns `User` which does NOT include `email`
- Only `CurrentUser` (returned by `me` query) includes email
- Email is only shown to the user viewing their own data

### 9.2 Block Handling

- When a user is blocked, display 404 to not reveal the block action
- Check `friendship.status === "BLOCKED"` AND `friendship.addressee.id === currentUserId`
- This means the profile owner blocked the current viewer

### 9.3 Authenticated vs Public Access

- Profile pages are publicly accessible for basic viewing
- Use `query()` for unauthenticated requests (friendship will be null)
- Use `authQuery()` for authenticated requests to get friendship data
- Friend mutations require authentication via `authMutate()`

### 9.4 Server Actions for Mutations

- All mutations (sendFriendRequest, acceptFriendRequest) use server actions
- This keeps the auth token server-side and prevents exposure
- Server actions use `authMutate()` which automatically injects the Bearer token

---

## 10. Testing Considerations

### 10.1 Manual Test Cases

1. View profile of existing user with player data
2. View profile of existing user without player data
3. Navigate to non-existent user ID (should show 404)
4. View profile when blocked by that user (should show 404)
5. Pagination: Load more games
6. Empty state: User with no games
7. Own profile: Edit Profile button shown, no friend actions
8. Other profile (unauthenticated): No friend actions visible
9. Other profile (authenticated, no relationship): Add Friend button
10. Other profile (pending, I sent): Friend Request Pending status
11. Other profile (pending, I received): Accept Friend Request button
12. Other profile (friends): Friends status, Message button enabled
13. Click game card navigates to game detail page
14. Navbar avatar dropdown opens/closes
15. Sign out from dropdown works
16. Profile link in dropdown navigates correctly

### 10.2 Edge Cases

- Very long biography text (should truncate or scroll)
- User with many games (pagination performance)
- Special characters in names
- Missing player stats (age, height, weight individually null)
- Team games vs individual games (tennis singles vs doubles)
- Games with no participants yet

---

## 11. Implementation Order

### Phase 1: Foundation

1. Add shadcn/ui components (badge, skeleton, tooltip, sonner)
2. Add i18n keys to messages/en.json
3. Create UserAvatarMenu component
4. Update AuthButton to use UserAvatarMenu

### Phase 2: Profile Page Structure

5. Create page.tsx with basic structure
6. Create ProfileHeader component (without friend actions initially)
7. Create PlayerStats component
8. Create loading.tsx skeleton
9. Create not-found.tsx

### Phase 3: Friend System

10. Create server actions (actions.ts)
11. Create FriendActions component
12. Integrate FriendActions into ProfileHeader
13. Add Message button with tooltip

### Phase 4: Game History

14. Create GameCard component with polymorphic participant handling
15. Create GameHistory component
16. Implement pagination with server action
17. Add click-to-navigate functionality

### Phase 5: Polish

18. Responsive design testing
19. Error handling refinement
20. Toast notification integration
21. Loading state optimization

---

## 12. Open Questions

### 12.1 Height/Weight Units

- What units are used for height and weight in the backend?
- Current assumption: height in cm, weight in kg
- May need formatting adjustments based on actual units

### 12.2 User ID Format

- The Better Auth session returns `user.id` - need to verify this matches the User ID format expected by the GraphQL `user(id: ID!)` query
- Keycloak typically uses UUID format for subject claims

### 12.3 Profile Picture URL

- Requirements mention future profile picture support
- Avatar component is ready for `src` prop when available
- Backend needs to define the URL pattern for profile images

### 12.4 Chat Room Creation

- When "Message" button is clicked for friends, should it create a new chat room or navigate to existing one?
- Current design: Button is just enabled/disabled, actual navigation deferred to future enhancement

---

## 13. Alternative Approaches Considered

### 13.1 Static Generation vs Server Rendering

**Chosen**: Server Rendering (dynamic)
**Reason**: Profile data changes frequently (friendship status); SSG would require revalidation strategies. Dynamic rendering ensures fresh data.

### 13.2 Client-Side Data Fetching vs Server Components

**Chosen**: Server Components for initial load, client-side for pagination and mutations
**Reason**: Optimal performance for initial load, interactivity for pagination and friend actions.

### 13.3 Infinite Scroll vs Load More Button

**Chosen**: Load More button
**Reason**: More accessible, clearer user intent, simpler implementation. Can upgrade to infinite scroll later if needed.

### 13.4 Separate Player Page vs Unified Profile

**Chosen**: Unified profile at `/user/[userId]`
**Reason**: Matches friend system design (friend relationships are between Users), single URL for sharing.

### 13.5 Client Fetch vs Server Actions for Mutations

**Chosen**: Server Actions
**Reason**: Keeps auth token server-side, no need to expose GraphQL endpoint or create API routes, better security.

---

## 14. Dependencies Summary

### NPM Packages (Already Installed)

- `@radix-ui/react-avatar`
- `@radix-ui/react-dropdown-menu`
- `lucide-react`
- `json-to-graphql-query`
- `better-auth`
- `next-intl`

### NPM Packages (To Add via shadcn)

- Badge component
- Skeleton component
- Tooltip component
- Sonner (toast notifications)

### Backend Requirements

**No backend changes required** - The schema already supports all necessary operations:
- `user(id)` returns `User` with `friendship` field
- `player` field exists on `User` interface
- `sendFriendRequest` and `acceptFriendRequest` mutations available
- `games` query with `participants` polymorphic field available
