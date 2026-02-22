"use server";

import { notificationInlineFragments } from "@/lib/graphql-fragments";
import { authMutate, authQuery } from "@/lib/graphql-request";
import type {
  FetchNotificationsResult,
  MarkNotificationsAsReadResult,
} from "@/lib/types/notification";

/** Reusable notification node selection for all notification queries */
const notificationNodeSelection = {
  __typename: true,
  id: true,
  isRead: true,
  createdDate: true,
  __on: notificationInlineFragments,
};

function buildNotificationsQuery(first: number, after?: string) {
  const args: Record<string, unknown> = { first };
  if (after) {
    args.after = after;
  }

  return {
    notifications: {
      __args: args,
      edges: {
        cursor: true,
        node: notificationNodeSelection,
      },
      pageInfo: {
        hasNextPage: true,
        endCursor: true,
      },
    },
  };
}

/**
 * Fetch notifications for the current user.
 * Always uses authQuery since notifications require authentication.
 */
export async function fetchNotifications(
  first: number,
  after?: string,
): Promise<FetchNotificationsResult> {
  try {
    const queryObj = buildNotificationsQuery(first, after);
    const response = await authQuery(queryObj);

    if (response.errors?.length > 0) {
      return {
        success: false,
        edges: null,
        pageInfo: null,
        error: response.errors[0].message,
      };
    }

    const data = response.data?.notifications;
    return {
      success: true,
      edges: data?.edges ?? [],
      pageInfo: data?.pageInfo ?? { hasNextPage: false, endCursor: null },
      error: null,
    };
  } catch (error) {
    console.error("Failed to fetch notifications:", error);
    return {
      success: false,
      edges: null,
      pageInfo: null,
      error: "Failed to load notifications",
    };
  }
}

/**
 * Mark one or more notifications as read.
 */
export async function markNotificationsAsRead(
  ids: string[],
): Promise<MarkNotificationsAsReadResult> {
  try {
    const response = await authMutate({
      readNotifications: {
        __args: {
          input: { ids },
        },
        notifications: notificationNodeSelection,
      },
    });

    if (response.errors?.length > 0) {
      return {
        success: false,
        notifications: null,
        error: response.errors[0].message,
      };
    }

    return {
      success: true,
      notifications: response.data?.readNotifications?.notifications ?? [],
      error: null,
    };
  } catch (error) {
    console.error("Failed to mark notifications as read:", error);
    return {
      success: false,
      notifications: null,
      error: "Failed to mark as read",
    };
  }
}
