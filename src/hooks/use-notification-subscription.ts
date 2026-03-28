"use client";

import { getAccessToken } from "@/components/auth/actions";
import { notificationInlineFragments } from "@/lib/graphql-fragments";
import {
  disposeGraphQLWsClient,
  getGraphQLWsClient,
} from "@/lib/graphql-ws-client";
import type { Notification, NotificationEvent } from "@/lib/types/notification";
import { jsonToGraphQLQuery } from "json-to-graphql-query";
import { useEffect, useRef } from "react";

interface UseNotificationSubscriptionOptions {
  enabled: boolean;
  onNotification: (notification: Notification) => void;
  onReconnect?: () => void;
}

const SUBSCRIPTION_QUERY = jsonToGraphQLQuery({
  subscription: {
    notificationEvents: {
      notification: {
        __typename: true,
        id: true,
        isRead: true,
        createdDate: true,
        __on: notificationInlineFragments,
      },
    },
  },
});

export function useNotificationSubscription({
  enabled,
  onNotification,
  onReconnect,
}: UseNotificationSubscriptionOptions): void {
  const onNotificationRef = useRef(onNotification);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onNotificationRef.current = onNotification;
    onReconnectRef.current = onReconnect;
  });

  // Dispose the WebSocket connection when the user logs out
  useEffect(() => {
    if (!enabled) {
      disposeGraphQLWsClient();
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    let isFirstConnection = true;

    const client = getGraphQLWsClient(getAccessToken);

    const unsubscribeConnected = client.on("connected", () => {
      if (isFirstConnection) {
        isFirstConnection = false;
      } else {
        onReconnectRef.current?.();
      }
    });

    const unsubscribe = client.subscribe<{
      notificationEvents: NotificationEvent;
    }>(
      { query: SUBSCRIPTION_QUERY },
      {
        next: (result) => {
          if (result.data?.notificationEvents?.notification) {
            onNotificationRef.current(
              result.data.notificationEvents.notification,
            );
          }
        },
        error: () => {},
        complete: () => {},
      },
    );

    return () => {
      unsubscribeConnected();
      unsubscribe();
    };
  }, [enabled]);
}
