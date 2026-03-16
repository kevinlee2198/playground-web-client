import type { GameRole, GameStatus, GameVisibility } from "@/lib/constants";
import type { Edge } from "@/lib/graphql-connection";
import type {
  GameMetadata,
  GameParticipantDetail,
  TeamInstanceDetail,
} from "@/lib/types/game";
import type { BasketballBoxScoreNode } from "@/lib/types/stats/basketball";

/** The shape of the `game` field on game events (live-changing fields only) */
export interface GameEventGame {
  id: number;
  gameStatus: GameStatus;
  resultsFinalized: boolean;
  viewerGameRole: GameRole | null;
  visibility: GameVisibility;
  participants: {
    edges: Edge<GameParticipantDetail>[];
  };
  metadata: GameMetadata;
}

/** Base fields shared by all game events */
interface GameEventBase {
  occurredAt: string;
  game: GameEventGame;
}

/** The game has started (status moved to IN_PROGRESS) */
export interface GameStartedEvent extends GameEventBase {
  __typename: "GameStartedEvent";
}

/** The game has ended (status moved to COMPLETE) */
export interface GameEndedEvent extends GameEventBase {
  __typename: "GameEndedEvent";
}

/** The game results have been finalized */
export interface GameResultsFinalizedEvent extends GameEventBase {
  __typename: "GameResultsFinalizedEvent";
}

/** The game results have been un-finalized */
export interface GameResultsUnfinalizedEvent extends GameEventBase {
  __typename: "GameResultsUnfinalizedEvent";
}

/** A participant's score has been updated */
export interface GameScoreUpdatedEvent extends GameEventBase {
  __typename: "GameScoreUpdatedEvent";
  participant: GameParticipantDetail;
}

/** A participant has been added to the game */
export interface GameParticipantAddedEvent extends GameEventBase {
  __typename: "GameParticipantAddedEvent";
  participant: GameParticipantDetail;
}

/** A participant has been removed from the game */
export interface GameParticipantRemovedEvent extends GameEventBase {
  __typename: "GameParticipantRemovedEvent";
  participantId: number;
}

/** A team's roster has been updated */
export interface TeamRosterUpdatedEvent extends GameEventBase {
  __typename: "TeamRosterUpdatedEvent";
  teamInstance: TeamInstanceDetail;
}

/** A basketball box score has been saved */
export interface BoxScoreSavedEvent extends GameEventBase {
  __typename: "BoxScoreSavedEvent";
  basketballBoxScores: BasketballBoxScoreNode[];
}

/** Known game event types that the frontend can handle with full detail */
export type KnownGameEvent =
  | GameStartedEvent
  | GameEndedEvent
  | GameResultsFinalizedEvent
  | GameResultsUnfinalizedEvent
  | GameScoreUpdatedEvent
  | GameParticipantAddedEvent
  | GameParticipantRemovedEvent
  | TeamRosterUpdatedEvent
  | BoxScoreSavedEvent;

/**
 * Discriminated union of all known game event types plus a catch-all.
 * The catch-all uses `GameEventBase & { __typename: string }` so that
 * unknown types from the backend (not matching any literal) are accepted
 * without breaking the discriminated union narrowing for known types.
 */
export type GameEvent =
  | KnownGameEvent
  | (GameEventBase & { __typename: string });

/** Type guard to narrow GameEvent to a known concrete type */
export function isKnownGameEventType(e: GameEvent): e is KnownGameEvent {
  return (
    e.__typename === "GameStartedEvent" ||
    e.__typename === "GameEndedEvent" ||
    e.__typename === "GameResultsFinalizedEvent" ||
    e.__typename === "GameResultsUnfinalizedEvent" ||
    e.__typename === "GameScoreUpdatedEvent" ||
    e.__typename === "GameParticipantAddedEvent" ||
    e.__typename === "GameParticipantRemovedEvent" ||
    e.__typename === "TeamRosterUpdatedEvent" ||
    e.__typename === "BoxScoreSavedEvent"
  );
}
