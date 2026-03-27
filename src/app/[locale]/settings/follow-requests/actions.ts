"use server";

import { followRequestFragment } from "@/lib/graphql-fragments";
import { authQuery } from "@/lib/graphql-request";
import { EnumType } from "json-to-graphql-query";

export async function loadFollowRequests(first: number, after?: string) {
  try {
    const response = await authQuery({
      followRequests: {
        __args: {
          direction: new EnumType("INCOMING"),
          first,
          ...(after ? { after } : {}),
        },
        edges: {
          cursor: true,
          node: followRequestFragment,
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

    return response.data?.followRequests ?? null;
  } catch (error) {
    console.error("Failed to load follow requests:", error);
    return null;
  }
}
