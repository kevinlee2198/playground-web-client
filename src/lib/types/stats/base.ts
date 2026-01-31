import type { PlayerRef } from "@/lib/types/game";

/**
 * Lightweight game reference used in box score responses.
 */
export interface GameRef {
  id: number;
}

/**
 * Base interface for all sport box score response types.
 * Every box score is identified by an id and tied to a player.
 * The game field is optional because box scores are typically queried
 * in the context of a known game, so the field isn't always fetched.
 */
export interface BoxScoreNode {
  id: number;
  player: PlayerRef;
  game?: GameRef;
}

/**
 * Base interface for all sport box score save inputs.
 * Every box score input requires a player and game reference.
 */
export interface SaveBoxScoreInput {
  playerId: number;
  gameId: number;
}
