import type { KnownGameEvent } from "@/lib/types/game-event";
import type { GameDetail } from "@/lib/types/game";
import type { BasketballBoxScoreNode } from "@/lib/types/stats/basketball";

export interface LiveGameState {
  game: GameDetail;
  boxScores: { node: BasketballBoxScoreNode }[];
  isConnected: boolean;
}

export type LiveGameAction =
  | { type: "GAME_EVENT"; event: KnownGameEvent }
  | { type: "CONNECTION_LOST" }
  | { type: "RECONNECTED" }
  | { type: "SYNC_FROM_SERVER"; game: GameDetail; boxScores: { node: BasketballBoxScoreNode }[] };

export function createInitialState(
  game: GameDetail,
  boxScores: { node: BasketballBoxScoreNode }[]
): LiveGameState {
  return {
    game,
    boxScores,
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
        resultsFinalized: event.game.resultsFinalized,
        viewerGameRole: event.game.viewerGameRole,
        visibility: event.game.visibility,
        participants: {
          ...state.game.participants,
          edges: event.game.participants.edges,
        },
        metadata: event.game.metadata,
      };

      if (event.__typename === "BoxScoreSavedEvent") {
        const incomingByPlayerId = new Map(
          event.basketballBoxScores.map((bs) => [bs.player.id, bs])
        );

        const updated = state.boxScores.map((entry) => {
          const replacement = incomingByPlayerId.get(entry.node.player.id);
          return replacement ? { node: replacement } : entry;
        });

        const existingPlayerIds = new Set(
          state.boxScores.map((entry) => entry.node.player.id)
        );
        const appended = event.basketballBoxScores
          .filter((bs) => !existingPlayerIds.has(bs.player.id))
          .map((bs) => ({ node: bs }));

        return {
          ...state,
          game: mergedGame,
          boxScores: [...updated, ...appended],
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
        boxScores: action.boxScores,
        isConnected: true,
      };
  }
}
