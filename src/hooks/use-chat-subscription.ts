"use client";

import { getAccessToken } from "@/components/auth/actions";
import {
  chatMessageNodeSelection,
  chatRoomInlineFragments,
  chatUserFragment,
} from "@/lib/graphql-fragments";
import { getGraphQLWsClient } from "@/lib/graphql-ws-client";
import type { ChatEvent } from "@/lib/types/chat-event";
import { jsonToGraphQLQuery } from "json-to-graphql-query";
import { useEffect, useRef } from "react";

interface UseChatSubscriptionOptions {
  enabled: boolean;
  onEvent: (event: ChatEvent) => void;
  onReconnect?: () => void;
}

const chatRoomListNodeSelection = {
  __typename: true,
  id: true,
  createdDate: true,
  __on: chatRoomInlineFragments,
  members: {
    __args: { first: 10 },
    edges: {
      node: {
        user: chatUserFragment,
      },
    },
  },
  chatMessages: {
    __args: { last: 1 },
    edges: {
      node: chatMessageNodeSelection,
    },
  },
};

const SUBSCRIPTION_QUERY = jsonToGraphQLQuery({
  subscription: {
    chatEvents: {
      __typename: true,
      createdDate: true,
      chatRoom: chatRoomListNodeSelection,
      __on: [
        {
          __typeName: "ChatMessageSentEvent",
          chatMessage: chatMessageNodeSelection,
        },
        {
          __typeName: "ChatMessageUpdatedEvent",
          chatMessage: chatMessageNodeSelection,
        },
        {
          __typeName: "ChatMessageDeletedEvent",
          chatMessage: chatMessageNodeSelection,
        },
        {
          __typeName: "ChatRoomMemberAddedEvent",
          member: {
            id: true,
            user: chatUserFragment,
            role: true,
            joinedDate: true,
          },
        },
        {
          __typeName: "ChatRoomMemberRemovedEvent",
          userId: true,
        },
      ],
    },
  },
});

export function useChatSubscription({
  enabled,
  onEvent,
  onReconnect,
}: UseChatSubscriptionOptions): void {
  const onEventRef = useRef(onEvent);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onEventRef.current = onEvent;
    onReconnectRef.current = onReconnect;
  });

  // Note: unlike the notification hook, we do NOT dispose the WebSocket client
  // when disabled. The notification hook already handles disposal on logout.
  // This hook simply subscribes/unsubscribes.

  useEffect(() => {
    if (!enabled) return;

    let isFirstConnection = true;

    const client = getGraphQLWsClient(getAccessToken);

    const unsubscribeConnected = client.on("connected", () => {
      if (!isFirstConnection) {
        onReconnectRef.current?.();
      }
      isFirstConnection = false;
    });

    const unsubscribe = client.subscribe<{
      chatEvents: ChatEvent;
    }>(
      { query: SUBSCRIPTION_QUERY },
      {
        next: (result) => {
          const event = result.data?.chatEvents;
          if (!event || !event.__typename) {
            console.warn(
              "[useChatSubscription] Malformed event received:",
              result.data,
            );
            return;
          }
          onEventRef.current(event);
        },
        error: (error) => {
          if (Array.isArray(error)) {
            for (const err of error) {
              console.error(
                "[useChatSubscription] GraphQL error:",
                err.message,
                err,
              );
            }
          } else {
            console.error("[useChatSubscription] Subscription error:", error);
          }
        },
        complete: () => {},
      },
    );

    return () => {
      unsubscribeConnected();
      unsubscribe();
    };
  }, [enabled]);
}
