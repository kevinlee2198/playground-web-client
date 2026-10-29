import { buildConnection, emptyConnection } from "./connection";

const GAME_VIEWER_CAN_FLAGS = [
  "update",
  "delete",
  "start",
  "end",
  "cancel",
  "finalizeResults",
  "unfinalizeResults",
  "manageEditors",
  "invite",
  "enterStats",
  "enterOwnStats",
  "join",
  "addParticipants",
  "addMedia",
  "moderateMedia",
  "reportResult",
  "confirmResult",
  "disputeResult",
  "voidResult",
  "reschedule",
  "forfeit",
] as const;

/** All 21 GameViewerCan flags false, plus overrides. */
export function mockGameViewerCan(overrides?: Record<string, boolean>) {
  return {
    ...Object.fromEntries(GAME_VIEWER_CAN_FLAGS.map((flag) => [flag, false])),
    ...overrides,
  };
}

export function mockGame(overrides?: Record<string, unknown>) {
  return {
    id: "game-1",
    startDate: new Date().toISOString(),
    endDate: null,
    sportType: "BASKETBALL",
    metadata: {
      __typename: "BasketballGameMetadata",
      basketballFormat: "FIVE_ON_FIVE",
      periods: null,
    },
    gameStatus: "SCHEDULED",
    description: "A test game",
    viewerGameRole: "OWNER",
    visibility: "PUBLIC",
    statEntryMode: "OPEN",
    viewerInvitation: null,
    // Owner on a SCHEDULED game. addMedia is false because the backend only
    // grants it while IN_PROGRESS or COMPLETE.
    viewerCan: mockGameViewerCan({
      update: true,
      delete: true,
      start: true,
      cancel: true,
      manageEditors: true,
      invite: true,
      enterStats: true,
      addParticipants: true,
      moderateMedia: true,
    }),
    location: {
      name: "Test Court",
      address: { city: "Test City", state: "TS", country: "US" },
    },
    participants: emptyConnection(),
    media: emptyConnection(),
    ...overrides,
  };
}

export function mockGamesListResponse(games?: Record<string, unknown>[]) {
  return {
    data: {
      games: buildConnection(games ?? [mockGame()]),
    },
  };
}

export function mockEmptyGamesResponse() {
  return { data: { games: emptyConnection() } };
}

export function mockGameDetailResponse(overrides?: Record<string, unknown>) {
  return { data: { game: mockGame(overrides) } };
}

export function mockGameNotFoundResponse() {
  return { data: { game: null } };
}

export function mockBasketballStatsResponse() {
  return { data: { basketballStats: [] } };
}

export function mockParticipant(overrides?: Record<string, unknown>) {
  return {
    __typename: "TeamInstance",
    id: "participant-1",
    name: "Team A",
    metadata: null,
    roster: [],
    guests: [],
    ...overrides,
  };
}
