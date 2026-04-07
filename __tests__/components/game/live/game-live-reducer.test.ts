import { describe, expect, it } from "vitest";
import {
  createInitialState,
  gameLiveReducer,
  type LiveGameState,
} from "@/components/game/live/game-live-reducer";
import { GameStatus, GameVisibility, SportFormat, SportType, StatEntryMode } from "@/lib/constants";
import type { GameDetail, GameParticipantDetail, TeamInstanceDetail } from "@/lib/types/game";
import type {
  BasketballStatsSavedEvent,
  GameEventGame,
  GameParticipantAddedEvent,
  GameParticipantRemovedEvent,
  GameScoreUpdatedEvent,
  GameStartedEvent,
} from "@/lib/types/game-event";
import type { BasketballStatsNode } from "@/lib/types/stats/basketball";

const emptyPageInfo = {
  hasPreviousPage: false,
  hasNextPage: false,
  startCursor: null,
  endCursor: null,
} as const;

function makeGameEventGame(overrides: Partial<GameEventGame> = {}): GameEventGame {
  return {
    id: 1,
    gameStatus: GameStatus.SCHEDULED,
    viewerGameRole: null,
    visibility: GameVisibility.PUBLIC,
    participants: { edges: [] },
    metadata: {
      __typename: "BasketballGameMetadata",
      basketballFormat: SportFormat.FIVE_ON_FIVE,
      periods: null,
    },
    ...overrides,
  };
}

function makeGameDetail(overrides: Partial<GameDetail> = {}): GameDetail {
  return {
    id: 1,
    description: "Test game",
    startDate: "2026-03-16T10:00:00Z",
    endDate: null,
    sportType: SportType.BASKETBALL,
    metadata: {
      __typename: "BasketballGameMetadata",
      basketballFormat: SportFormat.FIVE_ON_FIVE,
      periods: null,
    },
    gameStatus: GameStatus.SCHEDULED,
    viewerGameRole: null,
    visibility: GameVisibility.PUBLIC,
    viewerInvitation: null,
    statEntryMode: StatEntryMode.OPEN,
    location: null,
    participants: { edges: [], pageInfo: emptyPageInfo },
    media: { edges: [], pageInfo: emptyPageInfo },
    ...overrides,
  };
}

function makeTeamParticipant(id: number, score: number): { cursor: string; node: GameParticipantDetail } {
  const node: TeamInstanceDetail = {
    __typename: "TeamInstance",
    id,
    name: `Team ${id}`,
    description: null,
    players: [],
    metadata: {
      __typename: "BasketballParticipantMetadata",
      score,
    },
  };
  return { cursor: `cursor-${id}`, node };
}

function makeBoxScore(playerId: number, points: number): BasketballStatsNode {
  return {
    id: playerId,
    player: {
      id: playerId,
      user: {
        displayName: `Player ${playerId}`,
        username: `player${playerId}`,
        profilePicture: null,
      },
    },
    points,
    assists: null,
    totalRebounds: null,
    offensiveRebounds: null,
    defensiveRebounds: null,
    steals: null,
    blocks: null,
    turnovers: null,
    personalFouls: null,
    fieldGoalsMade: null,
    fieldGoalsAttempted: null,
    fieldGoalPercentage: null,
    threePointersMade: null,
    threePointersAttempted: null,
    threePointerPercentage: null,
    twoPointersMade: null,
    twoPointersAttempted: null,
    twoPointerPercentage: null,
    freeThrowsMade: null,
    freeThrowsAttempted: null,
    freeThrowPercentage: null,
  };
}

describe("createInitialState", () => {
  it("creates state with the given game, basketballStats, and isConnected: true", () => {
    const game = makeGameDetail();
    const basketballStats = [{ node: makeBoxScore(1, 10) }];

    const state = createInitialState(game, basketballStats);

    expect(state.game).toBe(game);
    expect(state.basketballStats).toBe(basketballStats);
    expect(state.isConnected).toBe(true);
  });
});

describe("gameLiveReducer", () => {
  describe("GAME_EVENT — status events", () => {
    it("merges gameStatus from GameStartedEvent while preserving unrelated fields", () => {
      const game = makeGameDetail({
        description: "My special game",
        startDate: "2026-03-16T10:00:00Z",
        location: null,
      });
      const initialState = createInitialState(game, []);

      const event: GameStartedEvent = {
        __typename: "GameStartedEvent",
        occurredAt: "2026-03-16T11:00:00Z",
        game: makeGameEventGame({ gameStatus: GameStatus.IN_PROGRESS }),
      };

      const nextState = gameLiveReducer(initialState, {
        type: "GAME_EVENT",
        event,
      });

      expect(nextState.game.gameStatus).toBe(GameStatus.IN_PROGRESS);
      expect(nextState.game.description).toBe("My special game");
      expect(nextState.game.startDate).toBe("2026-03-16T10:00:00Z");
      expect(nextState.game.location).toBeNull();
    });
  });

  describe("GAME_EVENT — score update", () => {
    it("reflects updated participant scores from GameScoreUpdatedEvent", () => {
      const game = makeGameDetail({
        participants: {
          edges: [makeTeamParticipant(10, 0), makeTeamParticipant(20, 0)],
          pageInfo: emptyPageInfo,
        },
      });
      const initialState = createInitialState(game, []);

      const updatedEdges = [
        makeTeamParticipant(10, 15),
        makeTeamParticipant(20, 12),
      ];
      const event: GameScoreUpdatedEvent = {
        __typename: "GameScoreUpdatedEvent",
        occurredAt: "2026-03-16T11:05:00Z",
        game: makeGameEventGame({
          participants: { edges: updatedEdges },
        }),
        participant: updatedEdges[0].node,
      };

      const nextState = gameLiveReducer(initialState, {
        type: "GAME_EVENT",
        event,
      });

      const edges = nextState.game.participants.edges;
      expect(edges).toHaveLength(2);

      const team10 = edges.find((e) => e.node.id === 10)!;
      const team20 = edges.find((e) => e.node.id === 20)!;

      expect(
        (team10.node.metadata as { score: number }).score
      ).toBe(15);
      expect(
        (team20.node.metadata as { score: number }).score
      ).toBe(12);
    });
  });

  describe("GAME_EVENT — participant added", () => {
    it("reflects the new participant list from GameParticipantAddedEvent", () => {
      const game = makeGameDetail({
        participants: {
          edges: [makeTeamParticipant(10, 0)],
          pageInfo: emptyPageInfo,
        },
      });
      const initialState = createInitialState(game, []);

      const event: GameParticipantAddedEvent = {
        __typename: "GameParticipantAddedEvent",
        occurredAt: "2026-03-16T11:10:00Z",
        game: makeGameEventGame({
          participants: {
            edges: [makeTeamParticipant(10, 0), makeTeamParticipant(20, 0)],
          },
        }),
        participant: makeTeamParticipant(20, 0).node,
      };

      const nextState = gameLiveReducer(initialState, {
        type: "GAME_EVENT",
        event,
      });

      expect(nextState.game.participants.edges).toHaveLength(2);
      expect(
        nextState.game.participants.edges.map((e) => e.node.id)
      ).toContain(20);
    });
  });

  describe("GAME_EVENT — participant removed", () => {
    it("reflects the reduced participant list from GameParticipantRemovedEvent", () => {
      const game = makeGameDetail({
        participants: {
          edges: [makeTeamParticipant(10, 0), makeTeamParticipant(20, 0)],
          pageInfo: emptyPageInfo,
        },
      });
      const initialState = createInitialState(game, []);

      const event: GameParticipantRemovedEvent = {
        __typename: "GameParticipantRemovedEvent",
        occurredAt: "2026-03-16T11:15:00Z",
        game: makeGameEventGame({
          participants: {
            edges: [makeTeamParticipant(10, 0)],
          },
        }),
        participantId: 20,
      };

      const nextState = gameLiveReducer(initialState, {
        type: "GAME_EVENT",
        event,
      });

      expect(nextState.game.participants.edges).toHaveLength(1);
      expect(nextState.game.participants.edges[0].node.id).toBe(10);
    });
  });

  describe("GAME_EVENT — box score saved", () => {
    it("upserts box scores: updates existing entry and appends new entry", () => {
      const existingBoxScore = makeBoxScore(1, 8);
      const initialState = createInitialState(makeGameDetail(), [
        { node: existingBoxScore },
      ]);

      const updatedBoxScore = makeBoxScore(1, 20);
      const newBoxScore = makeBoxScore(2, 15);

      const event: BasketballStatsSavedEvent = {
        __typename: "BasketballStatsSavedEvent",
        occurredAt: "2026-03-16T11:20:00Z",
        game: makeGameEventGame(),
        basketballStats: [updatedBoxScore, newBoxScore],
      };

      const nextState = gameLiveReducer(initialState, {
        type: "GAME_EVENT",
        event,
      });

      expect(nextState.basketballStats).toHaveLength(2);

      const player1Entry = nextState.basketballStats.find(
        (e) => e.node.player.id === 1
      )!;
      const player2Entry = nextState.basketballStats.find(
        (e) => e.node.player.id === 2
      )!;

      expect(player1Entry.node.points).toBe(20);
      expect(player2Entry.node.points).toBe(15);
    });
  });

  describe("CONNECTION_LOST", () => {
    it("sets isConnected to false while leaving game unchanged", () => {
      const game = makeGameDetail();
      const initialState = createInitialState(game, []);

      const nextState = gameLiveReducer(initialState, {
        type: "CONNECTION_LOST",
      });

      expect(nextState.isConnected).toBe(false);
      expect(nextState.game).toBe(game);
    });
  });

  describe("RECONNECTED", () => {
    it("sets isConnected to true while leaving game unchanged", () => {
      const game = makeGameDetail();
      const initialState: LiveGameState = {
        ...createInitialState(game, []),
        isConnected: false,
      };

      const nextState = gameLiveReducer(initialState, { type: "RECONNECTED" });

      expect(nextState.isConnected).toBe(true);
      expect(nextState.game).toBe(game);
    });
  });

  describe("SYNC_FROM_SERVER", () => {
    it("replaces game and basketballStats fully and sets isConnected to true", () => {
      const originalGame = makeGameDetail({ description: "original" });
      const initialState: LiveGameState = {
        ...createInitialState(originalGame, [{ node: makeBoxScore(1, 5) }]),
        isConnected: false,
      };

      const newGame = makeGameDetail({ description: "synced" });
      const newBasketballStats = [
        { node: makeBoxScore(1, 20) },
        { node: makeBoxScore(2, 18) },
      ];

      const nextState = gameLiveReducer(initialState, {
        type: "SYNC_FROM_SERVER",
        game: newGame,
        basketballStats: newBasketballStats,
      });

      expect(nextState.game).toBe(newGame);
      expect(nextState.basketballStats).toBe(newBasketballStats);
      expect(nextState.isConnected).toBe(true);
    });
  });
});
