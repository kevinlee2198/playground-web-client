import type { UserRef } from "@/lib/types/game";

/**
 * Lightweight game reference used in stats responses.
 */
export interface GameRef {
  id: number;
}

/**
 * Base interface for all sport stats response types.
 * Every stats entry is identified by an id and tied to a user.
 * The game field is optional because stats are typically queried
 * in the context of a known game, so the field isn't always fetched.
 */
export interface StatsNode {
  id: number;
  user: UserRef;
  game?: GameRef;
}

/**
 * Base interface for all sport stats save inputs.
 * Every stats input requires a user and game reference.
 */
export interface SaveStatsInput {
  userId: number;
  gameId: number;
}
