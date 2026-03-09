"use server";

import { chatUserFragment } from "@/lib/graphql-fragments";
import { authQuery } from "@/lib/graphql-request";
import { EnumType } from "json-to-graphql-query";

export async function loadBlockedUsers(first: number, after?: string) {
  try {
    const response = await authQuery({
      friendships: {
        __args: {
          input: { status: new EnumType("BLOCKED") },
          first,
          ...(after ? { after } : {}),
        },
        edges: {
          cursor: true,
          node: {
            id: true,
            requester: chatUserFragment,
            addressee: chatUserFragment,
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

    return response.data?.friendships || null;
  } catch (error) {
    console.error("Failed to load blocked users:", error);
    return null;
  }
}
