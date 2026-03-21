import { buildConnection, emptyConnection } from "./connection";

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
    resultsFinalized: false,
    description: "A test game",
    viewerGameRole: "ORGANIZER",
    visibility: "PUBLIC",
    viewerInvitation: null,
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

export function mockBasketballBoxScoresResponse() {
  return { data: { basketballBoxScores: [] } };
}
