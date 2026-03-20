import { http, HttpResponse, passthrough } from "msw";
import { mockMeResponse } from "./mock-data/me";
import {
  mockGamesListResponse,
  mockGameDetailResponse,
  mockBasketballBoxScoresResponse,
} from "./mock-data/games";
import { mockFeedResponse } from "./mock-data/feed";
import { mockChatRoomsResponse } from "./mock-data/chat";
import { mockSearchUsersResponse } from "./mock-data/search";
import { mockEmptyBlockedResponse } from "./mock-data/friendships";
import { mockUserResponse } from "./mock-data/user";

/**
 * Extract the top-level field name from a GraphQL query string.
 * e.g. "query { me { id } }" -> "me"
 * e.g. "{ games(first: 10) { edges } }" -> "games"
 */
function extractOperationField(queryString: string): string | null {
  const match = queryString.match(
    /(?:query|mutation)?\s*(?:\w+\s*)?\{[\s]*(\w+)/,
  );
  return match?.[1] ?? null;
}

const EMPTY_STAT_FIELDS = [
  "pickleballStatistics",
  "tennisStatistics",
  "footballOffensiveStats",
  "footballDefensiveStats",
  "footballSpecialTeamsStats",
  "baseballBattingStats",
  "baseballPitchingStats",
  "baseballFieldingStats",
] as const;

const emptyStatResponses = Object.fromEntries(
  EMPTY_STAT_FIELDS.map((field) => [field, { data: { [field]: [] } }]),
);

const defaultResponses: Record<string, unknown> = {
  me: mockMeResponse(),
  games: mockGamesListResponse(),
  game: mockGameDetailResponse(),
  friendsActivityFeed: mockFeedResponse(),
  chatRooms: mockChatRoomsResponse(),
  searchUsers: mockSearchUsersResponse(),
  user: mockUserResponse(),
  friendships: mockEmptyBlockedResponse(),
  basketballBoxScores: mockBasketballBoxScoresResponse(),
  ...emptyStatResponses,
};

export const defaultGraphQLHandlers = [
  http.post("*/graphql", async ({ request }) => {
    const body = (await request.json()) as { query: string };
    const field = extractOperationField(body.query);

    if (field && field in defaultResponses) {
      return HttpResponse.json(defaultResponses[field] as Record<string, unknown>);
    }

    return HttpResponse.json({ data: {} });
  }),

  http.all("*", () => passthrough()),
];
