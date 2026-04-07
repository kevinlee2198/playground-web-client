import type { KnownGameEvent } from "@/lib/types/game-event";
import type { GameDetail } from "@/lib/types/game";
import type { BasketballStatsNode } from "@/lib/types/stats/basketball";

export interface LiveGameState {
  game: GameDetail;
  basketballStats: { node: BasketballStatsNode }[];
  isConnected: boolean;
}

export type LiveGameAction =
  | { type: "GAME_EVENT"; event: KnownGameEvent }
  | { type: "CONNECTION_LOST" }
  | { type: "RECONNECTED" }
  | { type: "SYNC_FROM_SERVER"; game: GameDetail; basketballStats: { node: BasketballStatsNode }[] };

export function createInitialState(
  game: GameDetail,
  basketballStats: { node: BasketballStatsNode }[]
): LiveGameState {
  return {
    game,
    basketballStats,
    isConnected: true,
  };
}

export function gameLiveReducer(
  state: LiveGameState,
  action: LiveGameAction
): LiveGameState {
  switch (action.type) {
    case "GAME_EVENT": {
      const { event } = action;

      const mergedGame: GameDetail = {
        ...state.game,
        gameStatus: event.game.gameStatus,
        viewerGameRole: event.game.viewerGameRole,
        visibility: event.game.visibility,
        participants: {
          ...state.game.participants,
          edges: event.game.participants.edges,
        },
        metadata: event.game.metadata,
      };

      if (event.__typename === "BasketballStatsSavedEvent") {
        const incomingByPlayerId = new Map(
          event.basketballStats.map((bs) => [bs.player.id, bs])
        );

        const updated = state.basketballStats.map((entry) => {
          const replacement = incomingByPlayerId.get(entry.node.player.id);
          return replacement ? { node: replacement } : entry;
        });

        const existingPlayerIds = new Set(
          state.basketballStats.map((entry) => entry.node.player.id)
        );
        const appended = event.basketballStats
          .filter((bs) => !existingPlayerIds.has(bs.player.id))
          .map((bs) => ({ node: bs }));

        return {
          ...state,
          game: mergedGame,
          basketballStats: [...updated, ...appended],
        };
      }

      return { ...state, game: mergedGame };
    }

    case "CONNECTION_LOST":
      return { ...state, isConnected: false };

    case "RECONNECTED":
      return { ...state, isConnected: true };

    case "SYNC_FROM_SERVER":
      return {
        ...state,
        game: action.game,
        basketballStats: action.basketballStats,
        isConnected: true,
      };
  }
}
