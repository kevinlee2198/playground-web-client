"use client";

import { getAccessToken } from "@/components/auth/actions";
import {
  gameMetadataFragment,
  participantDetailNodeFragment,
  participantMetadataFragment,
  playerRefFragment,
} from "@/lib/graphql-fragments";
import { getGraphQLWsClient } from "@/lib/graphql-ws-client";
import type { GameEvent } from "@/lib/types/game-event";
import { CloseCode } from "graphql-ws";
import { jsonToGraphQLQuery } from "json-to-graphql-query";
import { useEffect, useMemo, useRef } from "react";

interface UseGameSubscriptionOptions {
  gameId: number;
  enabled: boolean;
  onEvent: (event: GameEvent) => void;
  onConnectionLost?: () => void;
  onReconnect?: () => void;
}

export function useGameSubscription({
  gameId,
  enabled,
  onEvent,
  onConnectionLost,
  onReconnect,
}: UseGameSubscriptionOptions): void {
  const onEventRef = useRef(onEvent);
  const onConnectionLostRef = useRef(onConnectionLost);
  const onReconnectRef = useRef(onReconnect);

  useEffect(() => {
    onEventRef.current = onEvent;
    onConnectionLostRef.current = onConnectionLost;
    onReconnectRef.current = onReconnect;
  });

  const subscriptionQuery = useMemo(
    () =>
      jsonToGraphQLQuery({
        subscription: {
          gameEvents: {
            __args: { gameId: String(gameId) },
            __typename: true,
            occurredAt: true,
            game: {
              id: true,
              gameStatus: true,
              viewerGameRole: true,
              visibility: true,
              metadata: gameMetadataFragment,
              participants: {
                __args: { first: 50 },
                edges: {
                  node: participantDetailNodeFragment,
                },
              },
            },
            __on: [
              { __typeName: "GameStartedEvent" },
              { __typeName: "GameEndedEvent" },
              { __typeName: "GameResultsFinalizedEvent" },
              { __typeName: "GameResultsUnfinalizedEvent" },
              {
                __typeName: "GameScoreUpdatedEvent",
                participant: participantDetailNodeFragment,
              },
              {
                __typeName: "GameParticipantAddedEvent",
                participant: participantDetailNodeFragment,
              },
              {
                __typeName: "GameParticipantRemovedEvent",
                participantId: true,
              },
              {
                __typeName: "TeamRosterUpdatedEvent",
                teamInstance: {
                  id: true,
                  name: true,
                  description: true,
                  players: playerRefFragment,
                  metadata: participantMetadataFragment,
                },
              },
              {
                __typeName: "BoxScoreSavedEvent",
                basketballBoxScores: {
                  id: true,
                  player: playerRefFragment,
                  points: true,
                  assists: true,
                  totalRebounds: true,
                  offensiveRebounds: true,
                  defensiveRebounds: true,
                  steals: true,
                  blocks: true,
                  turnovers: true,
                  personalFouls: true,
                  fieldGoalsMade: true,
                  fieldGoalsAttempted: true,
                  fieldGoalPercentage: true,
                  threePointersMade: true,
                  threePointersAttempted: true,
                  threePointerPercentage: true,
                  twoPointersMade: true,
                  twoPointersAttempted: true,
                  twoPointerPercentage: true,
                  freeThrowsMade: true,
                  freeThrowsAttempted: true,
                  freeThrowPercentage: true,
                },
              },
            ],
          },
        },
      }),
    [gameId],
  );

  // Note: unlike the notification hook, we do NOT dispose the WebSocket client
  // when disabled. The notification hook already handles disposal on logout.
  // This hook simply subscribes/unsubscribes.

  useEffect(() => {
    if (!enabled) return;

    let isFirstConnection = true;
    let hasEverConnected = false;
    let latestEvent: GameEvent | null = null;
    let throttleTimer: ReturnType<typeof setTimeout> | null = null;
    let isPaused = false;

    function flushEvent() {
      if (latestEvent) {
        onEventRef.current(latestEvent);
        latestEvent = null;
      }
    }

    function scheduleFlush() {
      if (throttleTimer) clearTimeout(throttleTimer);
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        if (!isPaused) flushEvent();
      }, 300);
    }

    function handleVisibilityChange() {
      isPaused = document.hidden;
      if (!isPaused) flushEvent();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    const client = getGraphQLWsClient(getAccessToken);

    const unsubscribeConnected = client.on("connected", () => {
      if (!isFirstConnection) {
        onReconnectRef.current?.();
      }
      isFirstConnection = false;
      hasEverConnected = true;
    });

    let disposed = false;

    const unsubscribeClosed = client.on("closed", (event) => {
      // event is CloseEvent (browser) or TerminatedCloseEvent (graphql-ws terminate()).
      // If code is undefined (e.g., raw Error), treat as connection lost.
      const code = (event as { code?: number })?.code;
      if (!disposed && hasEverConnected && code !== CloseCode.Forbidden) {
        onConnectionLostRef.current?.();
      }
    });

    const unsubscribe = client.subscribe<{
      gameEvents: GameEvent;
    }>(
      { query: subscriptionQuery },
      {
        next: (result) => {
          const event = result.data?.gameEvents;
          if (!event || !event.__typename) {
            console.warn(
              "[useGameSubscription] Malformed event received:",
              result.data,
            );
            return;
          }
          latestEvent = event;
          if (!isPaused) scheduleFlush();
        },
        error: (error) => {
          if (Array.isArray(error)) {
            for (const err of error) {
              console.error(
                "[useGameSubscription] GraphQL error:",
                err.message,
                err,
              );
            }
          } else {
            console.error("[useGameSubscription] Subscription error:", error);
          }
        },
        complete: () => {},
      },
    );

    return () => {
      disposed = true;
      unsubscribeConnected();
      unsubscribeClosed();
      unsubscribe();
      if (throttleTimer) clearTimeout(throttleTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [enabled, subscriptionQuery]);
}
