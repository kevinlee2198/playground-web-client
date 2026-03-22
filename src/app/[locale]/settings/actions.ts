"use server";

import { authQuery } from "@/lib/graphql-request";

export async function loadBlockedUsers(first: number, after?: string) {
  try {
    const response = await authQuery({
      blockedUsers: {
        __args: {
          first,
          ...(after ? { after } : {}),
        },
        edges: {
          cursor: true,
          node: {
            id: true,
            displayName: true,
            username: true,
          },
        },
        pageInfo: {
          hasNextPage: true,
          endCursor: true,
        },
      },
    });

    if (response.errors?.length > 0) {
      return null;
    }

    return response.data?.blockedUsers || null;
  } catch (error) {
    console.error("Failed to load blocked users:", error);
    return null;
  }
}
