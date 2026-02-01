"use server";

import { auth } from "@/lib/auth";
import { authQuery, query } from "@/lib/graphql-request";
import type { SearchUsersResult } from "@/lib/types/user";
import { headers } from "next/headers";

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
    return { success: true, edges: [], pageInfo: { hasNextPage: false, endCursor: null }, error: null };
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
      return { success: false, edges: null, pageInfo: null, error: response.errors[0].message };
    }

    const data = response.data?.searchUsers;
    return {
      success: true,
      edges: data?.edges ?? [],
      pageInfo: data?.pageInfo ?? { hasNextPage: false, endCursor: null },
      error: null,
    };
  } catch {
    return { success: false, edges: null, pageInfo: null, error: "Failed to search. Please try again." };
  }
}
