import type { PlayerRef } from "@/lib/types/game";

/**
 * Lightweight game reference used in box score responses.
 */
export interface GameRef {
  id: number;
}

/**
 * Base interface for all sport box score response types.
 * Every box score is identified by an id and tied to a player and game.
 */
export interface BoxScoreNode {
  id: number;
  player: PlayerRef;
  game: GameRef;
}

/**
 * Base interface for all sport box score save inputs.
 * Every box score input requires a player and game reference.
 */
export interface SaveBoxScoreInput {
  playerId: number;
  gameId: number;
}
