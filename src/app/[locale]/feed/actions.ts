"use server";

import type { Edge, PageInfo } from "@/lib/graphql-connection";
import {
  gameMetadataFragment,
  participantNodeFragment,
  viewerFollowingPlayersFragment,
  viewerInvitationFragment,
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
      followingActivityFeed: {
        __args: args,
        edges: {
          cursor: true,
          node: {
            id: true,
            description: true,
            startDate: true,
            endDate: true,
            sportType: true,
            gameStatus: true,
            viewerGameRole: true,
            visibility: true,
            statEntryMode: true,
            viewerInvitation: viewerInvitationFragment,
            metadata: gameMetadataFragment,
            location: {
              name: true,
              address: {
                city: true,
                state: true,
                country: true,
              },
            },
            participants: {
              __args: { first: 10 },
              edges: {
                node: participantNodeFragment,
              },
            },
            viewerFollowingPlayers: viewerFollowingPlayersFragment,
          },
        },
        pageInfo: {
          hasNextPage: true,
          endCursor: true,
        },
      },
    });

    if (response.errors?.length > 0) {
      console.error("Feed query errors:", response.errors);
      return null;
    }

    return response.data?.followingActivityFeed ?? null;
  } catch (error) {
    console.error("Failed to load feed games:", error);
    return null;
  }
}
